import { existsSync, readFileSync } from "node:fs";
import * as cheerio from "cheerio";

function normalize(text = "") {
  return text.replace(/\s+/g, " ").trim();
}

function main() {
  if (!existsSync("index.html")) {
    console.error("[ERROR] No se encontró index.html en la raíz del repositorio.");
    process.exit(1);
  }

  const html = readFileSync("index.html", "utf8");
  const $ = cheerio.load(html);
  const failures = [];

  if ($("html").length !== 1) {
    failures.push("El documento debe tener una etiqueta <html>.");
  }

  if ($("head").length !== 1) {
    failures.push("El documento debe tener una etiqueta <head>.");
  }

  if ($("body").length !== 1) {
    failures.push("El documento debe tener una etiqueta <body>.");
  }

  if (!$("title").text().trim()) {
    failures.push("El documento debe conservar un <title> con texto.");
  }

  if (!$("h1").toArray().some((heading) => normalize($(heading).text()).length > 0)) {
    failures.push("La página debe conservar un título principal visible.");
  }

  if (/<<<<<<<|=======|>>>>>>>/.test(html)) {
    failures.push("index.html contiene marcadores de conflicto sin resolver.");
  }

  if (failures.length > 0) {
    console.error("La validación básica de HTML encontró problemas:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("HTML base validado correctamente.");
}

main();
