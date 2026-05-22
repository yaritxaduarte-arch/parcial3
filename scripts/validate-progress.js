import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import * as cheerio from "cheerio";
import {
  closeIssue,
  createMissionIssue,
  findMissionIssue,
  getRepositoryFromEnv,
  getTokenFromEnv,
  GitHubApi,
  listAllIssues,
  listClosedPullRequests,
  missionTitleWithoutNumber,
  reopenIssue,
  updateMissionIssue,
  upsertIssueComment
} from "./github-api.js";
import { extractMissionId, getMissionById, getNextMission, missions } from "./practice-missions.js";

const CATALOG_NOTE = "Todas las excusas fueron revisadas por el comité de despliegues dudosos.";
const EXCUSE_TITLES = [
  "El servidor estaba reflexionando",
  "Funciona en mi máquina",
  "El CSS tomó decisiones propias",
  "Producción no estaba emocionalmente preparada"
];

function git(args, options = {}) {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch (error) {
    if (options.allowFailure) {
      return "";
    }

    throw new Error(`No se pudo ejecutar git ${args.join(" ")}: ${error.stderr?.toString() || error.message}`);
  }
}

function readEventPayload() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !existsSync(eventPath)) {
    return null;
  }

  return JSON.parse(readFileSync(eventPath, "utf8"));
}

function eventName() {
  return process.env.GITHUB_EVENT_NAME || "manual";
}

function currentRefName(payload) {
  if (payload?.pull_request?.head?.ref) {
    return payload.pull_request.head.ref;
  }

  if (process.env.GITHUB_REF_NAME) {
    return process.env.GITHUB_REF_NAME;
  }

  return (payload?.ref || "").replace(/^refs\/heads\//, "");
}

function listBranches() {
  const refs = git([
    "for-each-ref",
    "--format=%(refname:short)",
    "refs/heads",
    "refs/remotes/origin"
  ], { allowFailure: true });

  return refs
    .split(/\r?\n/)
    .map((branch) => branch.trim())
    .filter(Boolean)
    .filter((branch) => branch !== "origin/HEAD");
}

function branchExists(branches, name) {
  return branches.includes(name) || branches.includes(`origin/${name}`);
}

function changedFilesFromPayload(payload) {
  const files = new Set();

  for (const commit of payload?.commits || []) {
    for (const file of [...(commit.added || []), ...(commit.modified || []), ...(commit.removed || [])]) {
      files.add(file);
    }
  }

  return files;
}

function hasCommitForFileSinceIssue(issue, filePath) {
  if (!issue?.created_at) {
    return false;
  }

  const commits = git(["log", `--since=${issue.created_at}`, "--format=%H", "--", filePath], { allowFailure: true });
  return commits.length > 0;
}

function indexWasTouched(issue, payload) {
  return changedFilesFromPayload(payload).has("index.html") || hasCommitForFileSinceIssue(issue, "index.html");
}

function htmlDiffIsSmall(payload) {
  const before = payload?.before;
  const after = payload?.after;

  if (!before || !after || /^0+$/.test(before)) {
    return true;
  }

  const stats = git(["diff", "--numstat", before, after, "--", "index.html"], { allowFailure: true });
  if (!stats) {
    return true;
  }

  const [added = "0", removed = "0"] = stats.split(/\s+/);
  const total = Number(added) + Number(removed);
  return Number.isFinite(total) && total <= 24;
}

function readHtml() {
  if (!existsSync("index.html")) {
    return "";
  }

  return readFileSync("index.html", "utf8");
}

function normalize(text = "") {
  return text.replace(/\s+/g, " ").trim();
}

function loadHtml(markup) {
  return cheerio.load(markup || "");
}

function hasExactText($, selector, expected) {
  return $(selector)
    .toArray()
    .some((element) => normalize($(element).text()) === expected);
}

function containsText(markup, expected) {
  return normalize(markup).includes(expected);
}

function check(ok, text, fix = "") {
  return { ok, text, fix };
}

function result({ mission, passed, checks, details = "" }) {
  return {
    mission,
    passed,
    checks,
    details
  };
}

function validateHero(markup, { strictScope = false } = {}) {
  const $ = loadHtml(markup);
  const checks = [
    check(hasExactText($, "h1", "Oficina Nacional de Excusas Técnicas"), "El título principal tiene el texto solicitado", "El H1 debe decir exactamente `Oficina Nacional de Excusas Técnicas`."),
    check(hasExactText($, "p, span, div", "Donde cada bug encuentra una explicación convincente."), "El subtítulo solicitado está visible", "Agrega el subtítulo exacto solicitado en la misión."),
    check(hasExactText($, "button, a", "Solicitar excusa urgente"), "El botón principal solicitado está visible", "El botón principal debe decir exactamente `Solicitar excusa urgente`.")
  ];

  if (strictScope) {
    checks.push(
      check($("#catalogo-excusas").length === 0, "No se adelantó el catálogo de excusas", "Deja el catálogo para su misión correspondiente."),
      check($("#formulario-excusa").length === 0, "No se adelantó el formulario", "Deja el formulario para su misión correspondiente."),
      check($("#version-final").length === 0, "No se adelantó la sección de versión final", "Deja la versión final para la release."),
      check(containsText(markup, "Enbiar excusa"), "No se adelantó el hotfix del botón", "No corrijas todavía el texto `Enbiar excusa`.")
    );
  }

  return checks;
}

function validateCatalog(markup, { strictScope = false } = {}) {
  const $ = loadHtml(markup);
  const section = $("#catalogo-excusas");
  const cards = section.find(".excusa-card").toArray();
  const cardChecks = cards.map((card, index) => {
    const cardNode = $(card);
    const text = normalize(cardNode.text());
    return [
      check(cardNode.find("h3").length > 0, `La tarjeta ${index + 1} tiene título`, "Cada tarjeta debe tener un título visible."),
      check(cardNode.find("p").length > 0, `La tarjeta ${index + 1} tiene descripción`, "Cada tarjeta debe tener una descripción visible."),
      check(/Gravedad\s*:/i.test(text), `La tarjeta ${index + 1} incluye etiqueta de gravedad`, "Cada tarjeta debe incluir una etiqueta visible que empiece con `Gravedad:`.")
    ];
  }).flat();

  const checks = [
    check(section.length === 1, "Existe la sección #catalogo-excusas", "Agrega una sección con `id=\"catalogo-excusas\"`."),
    check(cards.length >= 4, "El catálogo tiene al menos cuatro tarjetas .excusa-card", "Agrega al menos cuatro tarjetas con la clase `excusa-card`."),
    ...EXCUSE_TITLES.map((title) => check(hasExactText($, "#catalogo-excusas h3", title), `Aparece la excusa: ${title}`, `Incluye una tarjeta con el título exacto \`${title}\`.`)),
    ...cardChecks
  ];

  if (strictScope) {
    checks.push(
      check($("#formulario-excusa").length === 0, "No se adelantó el formulario", "Deja el formulario para su misión correspondiente."),
      check($("#version-final").length === 0, "No se adelantó la sección de versión final", "Deja la versión final para la release."),
      check(containsText(markup, "Enbiar excusa"), "No se adelantó el hotfix del botón", "No corrijas todavía el texto `Enbiar excusa`.")
    );
  }

  return checks;
}

function validateCatalogNote(markup, { strictScope = false } = {}) {
  const $ = loadHtml(markup);
  const checks = [
    check(hasExactText($, "#catalogo-excusas .catalogo-nota", CATALOG_NOTE), "La nota del catálogo tiene el texto solicitado", `Agrega dentro de #catalogo-excusas una etiqueta con clase \`catalogo-nota\` y el texto exacto \`${CATALOG_NOTE}\`.`)
  ];

  if (strictScope) {
    checks.push(
      check($("#formulario-excusa").length === 0, "No se adelantó el formulario", "Deja el formulario para su misión correspondiente."),
      check($("#version-final").length === 0, "No se adelantó la sección de versión final", "Deja la versión final para la release."),
      check(containsText(markup, "Enbiar excusa"), "No se adelantó el hotfix del botón", "No corrijas todavía el texto `Enbiar excusa`.")
    );
  }

  return checks;
}

function validateForm(markup, { strictScope = false } = {}) {
  const $ = loadHtml(markup);
  const form = $("#formulario-excusa");
  const fields = [
    "nombre",
    "tipo-problema",
    "nivel-urgencia",
    "descripcion-desastre"
  ];

  const checks = [
    check(form.length === 1, "Existe el formulario #formulario-excusa", "Agrega un formulario con `id=\"formulario-excusa\"`."),
    ...fields.map((name) => {
      const field = form.find(`[name="${name}"]`);
      return check(field.length > 0 && field.is("[required]"), `El campo obligatorio ${name} existe`, `Agrega un campo con \`name="${name}"\` y atributo \`required\`.`);
    }),
    check(hasExactText($, "#formulario-excusa button, #formulario-excusa input[type='submit']", "Enviar excusa al comité"), "El botón final del formulario tiene el texto solicitado", "El botón final debe decir exactamente `Enviar excusa al comité`.")
  ];

  if (strictScope) {
    checks.push(
      check($("#version-final").length === 0, "No se adelantó la sección de versión final", "Deja la versión final para la release."),
      check(containsText(markup, "Enbiar excusa"), "No se adelantó el hotfix del botón", "No corrijas todavía el texto `Enbiar excusa`.")
    );
  }

  return checks;
}

function validateRelease(markup) {
  const $ = loadHtml(markup);
  const versionSection = $("#version-final");
  const versionText = normalize(versionSection.text());

  return [
    ...validateHero(markup),
    ...validateCatalog(markup),
    ...validateCatalogNote(markup),
    ...validateForm(markup),
    check(versionSection.length === 1, "Existe la sección #version-final", "Agrega una sección con `id=\"version-final\"`."),
    check(versionText.includes("Versión 1.0.0"), "La sección final contiene Versión 1.0.0", "Incluye exactamente el texto `Versión 1.0.0`."),
    check(/lista\s+para\s+revisi[oó]n/i.test(versionText), "La sección final indica que está lista para revisión", "Indica en la sección final que la versión está lista para revisión."),
    check(containsText(markup, "Enbiar excusa"), "El hotfix no fue adelantado en la release", "El error `Enbiar excusa` se corrige solo en la misión de hotfix.")
  ];
}

function validateHotfix(markup) {
  const $ = loadHtml(markup);

  return [
    check(!containsText(markup, "Enbiar excusa"), "El texto incorrecto Enbiar excusa ya no aparece", "Corrige el texto incorrecto del botón del pie de página."),
    check(hasExactText($, "#boton-envio-rapido, button, a", "Enviar excusa"), "Existe el botón corregido con Enviar excusa", "El botón corregido debe decir exactamente `Enviar excusa`.")
  ];
}

async function getClosedPulls(context) {
  if (!context.closedPulls) {
    context.closedPulls = await listClosedPullRequests(context.api);
  }

  return context.closedPulls;
}

async function hasMergedPull(context, head, base) {
  const pulls = await getClosedPulls(context);
  return pulls.some((pull) => pull.head?.ref === head && pull.base?.ref === base && pull.merged_at);
}

async function evaluateMission(mission, issue, context) {
  const payload = context.payload;
  const branches = context.branches;
  const refName = currentRefName(payload);
  const html = readHtml();

  switch (mission.id) {
    case 1:
      return result({
        mission,
        passed: branchExists(branches, "develop"),
        checks: [
          check(branchExists(branches, "develop"), "Existe la rama develop", "La rama `develop` debe existir en GitHub.")
        ]
      });

    case 2: {
      const checks = [
        check(refName === "feature/hero-excusas", "El avance ocurre en feature/hero-excusas", "Publica este cambio desde la rama esperada."),
        check(indexWasTouched(issue, payload), "index.html fue modificado después de abrir esta misión", "Modifica `index.html` con los textos solicitados."),
        ...validateHero(html, { strictScope: true })
      ];

      return result({ mission, passed: checks.every((item) => item.ok), checks });
    }

    case 3: {
      const merged = await hasMergedPull(context, "feature/hero-excusas", "develop");
      const currentPull = payload?.pull_request;
      const correctPull = currentPull?.head?.ref === "feature/hero-excusas" && currentPull?.base?.ref === "develop";
      const checks = [
        check(merged || correctPull, "Existe un Pull Request de feature/hero-excusas hacia develop", "El Pull Request debe tener el origen y destino esperados."),
        check(merged, "El Pull Request del encabezado ya fue fusionado", "Fusiona el Pull Request cuando esté listo para integrar.")
      ];

      return result({ mission, passed: checks.every((item) => item.ok), checks });
    }

    case 4: {
      const checks = [
        check(refName === "feature/catalogo-excusas", "El avance ocurre en feature/catalogo-excusas", "Publica este cambio desde la rama esperada."),
        check(indexWasTouched(issue, payload), "index.html fue modificado después de abrir esta misión", "Modifica `index.html` con el catálogo solicitado."),
        ...validateCatalog(html, { strictScope: true })
      ];

      return result({ mission, passed: checks.every((item) => item.ok), checks });
    }

    case 5: {
      const checks = [
        check(refName === "feature/catalogo-excusas", "El avance ocurre en feature/catalogo-excusas", "Publica este cambio desde la rama esperada."),
        check(indexWasTouched(issue, payload), "index.html fue modificado después de abrir esta misión", "Agrega la nota solicitada dentro del catálogo."),
        ...validateCatalog(html),
        ...validateCatalogNote(html, { strictScope: true })
      ];

      return result({ mission, passed: checks.every((item) => item.ok), checks });
    }

    case 6: {
      const merged = await hasMergedPull(context, "feature/catalogo-excusas", "develop");
      const currentPull = payload?.pull_request;
      const correctPull = currentPull?.head?.ref === "feature/catalogo-excusas" && currentPull?.base?.ref === "develop";
      const checks = [
        check(merged || correctPull, "Existe un Pull Request de feature/catalogo-excusas hacia develop", "El Pull Request debe tener el origen y destino esperados."),
        check(merged, "El Pull Request del catálogo ya fue fusionado", "Fusiona el Pull Request cuando esté listo.")
      ];

      return result({ mission, passed: checks.every((item) => item.ok), checks });
    }

    case 7: {
      const checks = [
        check(refName === "feature/formulario-excusa", "El avance ocurre en feature/formulario-excusa", "Publica este cambio desde la rama esperada."),
        check(indexWasTouched(issue, payload), "index.html fue modificado después de abrir esta misión", "Modifica `index.html` con el formulario solicitado."),
        ...validateCatalog(html),
        ...validateCatalogNote(html),
        ...validateForm(html, { strictScope: true })
      ];

      return result({ mission, passed: checks.every((item) => item.ok), checks });
    }

    case 8: {
      const formMerged = await hasMergedPull(context, "feature/formulario-excusa", "develop");
      const currentPull = payload?.pull_request;
      const currentFormPull = currentPull?.head?.ref === "feature/formulario-excusa" && currentPull?.base?.ref === "develop";
      const checks = [
        check(formMerged || currentFormPull, "Existe un Pull Request de feature/formulario-excusa hacia develop", "El Pull Request debe tener el origen y destino esperados."),
        check(formMerged, "El Pull Request del formulario ya fue fusionado", "Fusiona el Pull Request del formulario cuando esté listo.")
      ];

      return result({ mission, passed: checks.every((item) => item.ok), checks });
    }

    case 9: {
      const checks = [
        check(branchExists(branches, "release/v1.0.0"), "Existe la rama release/v1.0.0", "La rama de release esperada debe existir en GitHub."),
        check(refName === "release/v1.0.0", "El avance ocurre en release/v1.0.0", "Publica este cambio desde la rama de release esperada."),
        check(indexWasTouched(issue, payload), "index.html fue modificado después de abrir esta misión", "Agrega la sección final solicitada en `index.html`."),
        ...validateRelease(html)
      ];

      return result({ mission, passed: checks.every((item) => item.ok), checks });
    }

    case 10: {
      const merged = await hasMergedPull(context, "release/v1.0.0", "main");
      const currentPull = payload?.pull_request;
      const correctPull = currentPull?.head?.ref === "release/v1.0.0" && currentPull?.base?.ref === "main";
      const checks = [
        check(merged || correctPull, "Existe un Pull Request de release/v1.0.0 hacia main", "El Pull Request debe tener el origen y destino esperados."),
        check(merged, "El Pull Request de release ya fue fusionado", "Fusiona el Pull Request cuando la versión esté lista.")
      ];

      return result({ mission, passed: checks.every((item) => item.ok), checks });
    }

    case 11: {
      const checks = [
        check(refName === "hotfix/texto-boton", "El avance ocurre en hotfix/texto-boton", "Publica este cambio desde la rama de hotfix esperada."),
        check(indexWasTouched(issue, payload), "index.html fue modificado después de abrir esta misión", "Corrige únicamente el texto solicitado en `index.html`."),
        check(htmlDiffIsSmall(payload), "El cambio parece pequeño y propio de un hotfix", "Reduce el cambio: esta misión solo corrige el texto del botón."),
        ...validateHotfix(html)
      ];

      return result({ mission, passed: checks.every((item) => item.ok), checks });
    }

    case 12: {
      const mainMerged = await hasMergedPull(context, "hotfix/texto-boton", "main");
      const developMerged = await hasMergedPull(context, "hotfix/texto-boton", "develop");
      const checks = [
        check(mainMerged, "El hotfix fue fusionado hacia main", "Integra `hotfix/texto-boton` hacia `main`."),
        check(developMerged, "El hotfix fue fusionado hacia develop", "Integra `hotfix/texto-boton` hacia `develop`.")
      ];

      return result({ mission, passed: checks.every((item) => item.ok), checks });
    }

    default:
      return result({
        mission,
        passed: false,
        checks: [
          check(false, "No hay una validación automática definida para esta misión", "Revisa la definición del examen.")
        ]
      });
  }
}

function feedbackMarker(missionId) {
  return `<!-- gitflow-examen:auto-feedback:mission=${missionId} -->`;
}

function formatChecks(checks) {
  return checks
    .map((item) => `${item.ok ? "- [x]" : "- [ ]"} ${item.text}${item.ok || !item.fix ? "" : `\n  Pendiente: ${item.fix}`}`)
    .join("\n");
}

function formatFeedback(mission, validation, statusText) {
  return `## Seguimiento automático

**Estado:** ${statusText}

### Revisión
${formatChecks(validation.checks)}

${validation.passed ? "La misión cumple los criterios automáticos. Se cerrará y se preparará la siguiente misión." : "Aún falta ajustar uno o más puntos. Cuando publiques nuevos cambios, esta revisión se actualizará."}`;
}

function annotateWarnings(mission, validation) {
  for (const item of validation.checks.filter((entry) => !entry.ok)) {
    const message = `${item.text}. ${item.fix}`.replace(/\r?\n/g, " ");
    console.log(`::warning title=Misión ${mission.id}::${message}`);
  }
}

function appendStepSummary(mission, validation) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) {
    return;
  }

  const lines = [
    `## Misión ${mission.id}: ${mission.title}`,
    "",
    validation.passed ? "Estado: completada automáticamente." : "Estado: requiere ajustes.",
    "",
    formatChecks(validation.checks),
    ""
  ];

  try {
    appendFileSync(summaryPath, `${lines.join("\n")}\n`);
  } catch {
    // El resumen de GitHub Actions no debe romper la validación principal.
  }
}

function missionIdFromIssue(issue) {
  return extractMissionId(`${issue.title || ""}\n${issue.body || ""}`);
}

async function normalizeRenumberedMissionIssues(api, issues) {
  const missionByTitle = new Map(missions.map((mission) => [mission.title, mission]));
  const refreshed = [];

  for (const issue of issues) {
    const mission = missionByTitle.get(missionTitleWithoutNumber(issue.title || ""));
    if (!mission) {
      refreshed.push(issue);
      continue;
    }

    const currentId = missionIdFromIssue(issue);
    if (currentId !== mission.id || !((issue.body || "").includes(`gitflow-examen:mission=${mission.id}`))) {
      const updated = await updateMissionIssue(api, issue, mission);
      console.log(`Issue #${issue.number} renumerado como misión ${mission.id}: ${mission.title}`);
      refreshed.push(updated);
    } else {
      refreshed.push(issue);
    }
  }

  return refreshed;
}

async function closeDuplicateMissionIssues(api, issues) {
  const byMission = new Map();

  for (const issue of issues) {
    const missionId = missionIdFromIssue(issue);
    if (!missionId) {
      continue;
    }

    if (!byMission.has(missionId)) {
      byMission.set(missionId, []);
    }
    byMission.get(missionId).push(issue);
  }

  for (const [missionId, duplicates] of byMission) {
    if (duplicates.length <= 1) {
      continue;
    }

    const ordered = [...duplicates].sort((a, b) => a.number - b.number);
    const [keep, ...extras] = ordered;
    console.log(`Misión ${missionId} tiene issues duplicados. Se conserva #${keep.number}.`);

    for (const extra of extras) {
      if (extra.state === "open") {
        await closeIssue(api, extra.number, "not_planned");
        extra.state = "closed";
        console.log(`Issue duplicado #${extra.number} cerrado.`);
      }
    }
  }
}

function targetMissionIds(payload, openIssues) {
  if (eventName() === "workflow_dispatch") {
    return openIssues.map(missionIdFromIssue).filter(Boolean);
  }

  if (eventName() === "create" && payload?.ref_type === "branch") {
    const branchToMission = new Map([
      ["develop", 1],
      ["feature/hero-excusas", 2],
      ["feature/catalogo-excusas", 4],
      ["feature/formulario-excusa", 7],
      ["release/v1.0.0", 9],
      ["hotfix/texto-boton", 11]
    ]);

    return branchToMission.has(payload.ref) ? [branchToMission.get(payload.ref)] : [];
  }

  if (eventName() === "push") {
    const branch = currentRefName(payload);
    if (branch === "feature/hero-excusas") {
      return [2];
    }
    if (branch === "feature/catalogo-excusas") {
      return [4, 5];
    }
    if (branch === "feature/formulario-excusa") {
      return [7];
    }
    if (branch === "release/v1.0.0") {
      return [9];
    }
    if (branch === "hotfix/texto-boton") {
      return [11];
    }
  }

  if (eventName() === "pull_request") {
    const head = payload?.pull_request?.head?.ref;
    const base = payload?.pull_request?.base?.ref;

    if (head === "feature/hero-excusas" && base === "develop") {
      return [3];
    }
    if (head === "feature/catalogo-excusas" && base === "develop") {
      return [6];
    }
    if (head === "feature/formulario-excusa" && base === "develop") {
      return [8];
    }
    if (head === "release/v1.0.0" && base === "main") {
      return [10];
    }
    if (head === "hotfix/texto-boton" && ["main", "develop"].includes(base)) {
      return [12];
    }
  }

  return [];
}

async function createNextMissionIfNeeded(api, issues, completedMission) {
  const nextMission = getNextMission(completedMission.id);
  if (!nextMission) {
    return null;
  }

  const duplicate = findMissionIssue(issues, nextMission);
  if (duplicate) {
    const updated = await updateMissionIssue(api, duplicate, nextMission);
    Object.assign(duplicate, updated);

    if (duplicate.state === "closed") {
      const reopened = await reopenIssue(api, duplicate.number);
      console.log(`La siguiente misión ya existía cerrada. Se reabrió el issue #${duplicate.number}.`);
      return reopened;
    }

    return duplicate;
  }

  const created = await createMissionIssue(api, nextMission);
  issues.push(created);
  return created;
}

async function processMission(context, issue, mission) {
  const validation = await evaluateMission(mission, issue, context);
  const statusText = validation.passed ? "Completada" : "En progreso";

  appendStepSummary(mission, validation);

  await upsertIssueComment(
    context.api,
    issue.number,
    feedbackMarker(mission.id),
    formatFeedback(mission, validation, statusText)
  );

  if (!validation.passed) {
    annotateWarnings(mission, validation);
    return;
  }

  await closeIssue(context.api, issue.number);
  const nextIssue = await createNextMissionIfNeeded(context.api, context.issues, mission);

  if (nextIssue) {
    console.log(`Misión ${mission.id} cerrada. Siguiente issue: #${nextIssue.number}`);
  } else {
    console.log(`Misión ${mission.id} cerrada. No quedan más misiones.`);
  }
}

async function main() {
  const payload = readEventPayload();
  if (!payload) {
    console.log("No hay evento de GitHub Actions. No se valida progreso automático.");
    return;
  }

  const { owner, repo } = getRepositoryFromEnv();
  const api = new GitHubApi({ owner, repo, token: getTokenFromEnv() });
  let issues = await listAllIssues(api);
  issues = await normalizeRenumberedMissionIssues(api, issues);
  await closeDuplicateMissionIssues(api, issues);
  const openMissionIssues = issues
    .filter((issue) => issue.state === "open")
    .filter((issue) => missionIdFromIssue(issue))
    .sort((a, b) => missionIdFromIssue(a) - missionIdFromIssue(b));

  const targets = new Set(targetMissionIds(payload, openMissionIssues));
  if (targets.size === 0) {
    console.log(`Evento ${eventName()} recibido, pero no corresponde a una misión automática.`);
    return;
  }

  const context = {
    api,
    payload,
    issues,
    branches: listBranches(),
    closedPulls: null
  };

  for (const issue of openMissionIssues) {
    const missionId = missionIdFromIssue(issue);
    if (!targets.has(missionId)) {
      continue;
    }

    const mission = getMissionById(missionId);
    if (!mission) {
      continue;
    }

    await processMission(context, issue, mission);
  }
}

main().catch((error) => {
  console.error("No se pudo validar el progreso del examen.");
  console.error(error.message);
  process.exit(1);
});
