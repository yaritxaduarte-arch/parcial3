import { existsSync, readFileSync } from "node:fs";
import {
  closeIssue,
  getRepositoryFromEnv,
  getTokenFromEnv,
  GitHubApi,
  listIssueComments,
  reopenIssue,
  upsertIssueComment
} from "./github-api.js";
import { extractMissionId, getMissionById } from "./practice-missions.js";

const COMMENT_MARKER = "<!-- gitflow-examen:manual-close-guard -->";
const ACTIONS_BOT = "github-actions[bot]";

function readEventPayload() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !existsSync(eventPath)) {
    throw new Error("No se encontró GITHUB_EVENT_PATH. Este script debe ejecutarse desde GitHub Actions.");
  }

  return JSON.parse(readFileSync(eventPath, "utf8"));
}

function issueMissionId(issue) {
  return extractMissionId(`${issue?.title || ""}\n${issue?.body || ""}`);
}

function actorLogin(payload) {
  return payload?.sender?.login || payload?.issue?.closed_by?.login || "usuario desconocido";
}

function wasChangedByWorkflow(payload) {
  const possibleActors = [
    payload?.sender?.login,
    payload?.issue?.closed_by?.login
  ].filter(Boolean);

  return possibleActors.includes(ACTIONS_BOT);
}

async function hasCompletedFeedback(api, issueNumber, missionId) {
  const comments = await listIssueComments(api, issueNumber);
  const feedbackMarker = `<!-- gitflow-examen:auto-feedback:mission=${missionId} -->`;

  return comments.some((comment) => {
    const body = comment.body || "";
    return body.includes(feedbackMarker) && /\*\*Estado:\*\*\s*Completada/i.test(body);
  });
}

function manualCloseComment({ mission, actor }) {
  const mention = actor === "usuario desconocido" ? actor : `@${actor}`;

  return `## Cierre automático requerido

Este issue fue cerrado por ${mention}, pero las misiones de este examen solo se cierran cuando el workflow **Validar progreso de misiones** verifica el criterio correspondiente.

**Misión:** ${mission.title}

**Qué hacer ahora:** continúa con la actividad indicada en la misión. Cuando el repositorio cumpla el criterio, el workflow comentará el resultado, cerrará este issue y creará la siguiente misión automáticamente.

No es necesario cerrar el issue manualmente.`;
}

function completedMissionComment({ mission, actor, action }) {
  const mention = actor === "usuario desconocido" ? actor : `@${actor}`;
  const actionText = action === "reopened" ? "reabierta" : "cerrada manualmente";

  return `## Estado restaurado por el workflow

Esta misión fue ${actionText} por ${mention}, pero ya tenía una validación automática completada.

**Misión:** ${mission.title}

El workflow dejó el issue cerrado nuevamente para conservar el avance real del examen.`;
}

async function main() {
  const payload = readEventPayload();

  if (!["closed", "reopened"].includes(payload.action)) {
    console.log(`Evento '${payload.action}' recibido. No hay estado de misión que proteger.`);
    return;
  }

  const missionId = issueMissionId(payload.issue);
  if (!missionId) {
    console.log("El issue no pertenece al examen. No se modifica.");
    return;
  }

  if (wasChangedByWorkflow(payload)) {
    console.log("El estado del issue fue cambiado por GitHub Actions. Se permite la automatización.");
    return;
  }

  const mission = getMissionById(missionId);
  if (!mission) {
    console.log(`No existe definición local para la misión ${missionId}. No se modifica el issue.`);
    return;
  }

  const { owner, repo } = getRepositoryFromEnv();
  const api = new GitHubApi({ owner, repo, token: getTokenFromEnv() });
  const actor = actorLogin(payload);
  const completed = await hasCompletedFeedback(api, payload.issue.number, missionId);

  if (payload.action === "reopened") {
    if (!completed) {
      console.log(`La misión ${missionId} fue reabierta y aún no tiene validación completada. Se deja abierta.`);
      return;
    }

    await closeIssue(api, payload.issue.number);
    await upsertIssueComment(api, payload.issue.number, COMMENT_MARKER, completedMissionComment({ mission, actor, action: payload.action }));
    console.log(`Se volvió a cerrar el issue #${payload.issue.number} porque la misión ${missionId} ya estaba completada por workflow.`);
    return;
  }

  if (completed) {
    await reopenIssue(api, payload.issue.number);
    await closeIssue(api, payload.issue.number);
    await upsertIssueComment(api, payload.issue.number, COMMENT_MARKER, completedMissionComment({ mission, actor, action: payload.action }));
    console.log(`Se restauró el cierre automático del issue #${payload.issue.number} porque la misión ${missionId} ya estaba completada.`);
    return;
  }

  await reopenIssue(api, payload.issue.number);
  await upsertIssueComment(api, payload.issue.number, COMMENT_MARKER, manualCloseComment({ mission, actor }));
  console.log(`Se reabrió el issue #${payload.issue.number} porque la misión ${missionId} fue cerrada manualmente por ${actor}.`);
}

main().catch((error) => {
  console.error("No se pudo proteger el cierre manual del issue.");
  console.error(error.message);
  process.exit(1);
});
