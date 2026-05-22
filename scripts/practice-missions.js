export const PRACTICE_MARKER = "gitflow-examen";

export const missions = [
  {
    id: 1,
    title: "Crear rama develop",
    body: `## Lo que debes realizar
- Debe existir una rama llamada \`develop\` publicada en GitHub.

## Anotaciones importantes
- No edites archivos en esta misión.
- No adelantes cambios de HTML.

## Criterio de cierre
La misión se cerrará cuando la rama \`develop\` exista en GitHub.`
  },
  {
    id: 2,
    title: "Actualizar encabezado de excusas",
    body: `## Lo que debes realizar
- Trabaja en la rama \`feature/hero-excusas\`.
- Modifica únicamente el encabezado de \`index.html\`.

## Cambios exactos en index.html
- Reemplaza el bloque \`<header>...</header>\` actual por este bloque:

~~~html
<header>
  <h1>Oficina Nacional de Excusas Técnicas</h1>
  <p class="intro">Donde cada bug encuentra una explicación convincente.</p>
  <div class="actions">
    <button id="boton-hero" type="button">Solicitar excusa urgente</button>
  </div>
</header>
~~~

## Anotaciones importantes
- No agregues todavía el catálogo de excusas.
- No agregues todavía el formulario.
- No agregues todavía la sección de versión final.
- No corrijas todavía el botón del pie de página que dice \`Enbiar excusa\`.

## Criterio de cierre
La misión se cerrará cuando el cambio esté publicado en la rama solicitada y el HTML tenga exactamente los textos pedidos.`
  },
  {
    id: 3,
    title: "Integrar encabezado en develop",
    body: `## Lo que debes realizar
- Debe existir un Pull Request desde \`feature/hero-excusas\` hacia \`develop\`.
- Ese Pull Request debe quedar fusionado.

## Anotaciones importantes
- No agregues cambios nuevos al HTML durante esta integración.
- No mezcles ramas distintas a las solicitadas.

## Criterio de cierre
La misión se cerrará cuando el Pull Request solicitado esté fusionado.`
  },
  {
    id: 4,
    title: "Crear catálogo de excusas",
    body: `## Lo que debes realizar
- Trabaja en la rama \`feature/catalogo-excusas\`.
- Modifica \`index.html\` para agregar un catálogo de excusas.

## Cambios exactos en index.html
- Dentro de \`<main>\`, busca este final del bloque de aviso inicial:

~~~html
      </section>
    </main>
~~~

- Entre esas dos líneas, agrega exactamente este bloque:

~~~html
      <section id="catalogo-excusas">
        <h2>Catálogo de excusas aprobadas</h2>

        <article class="excusa-card">
          <h3>El servidor estaba reflexionando</h3>
          <p>La respuesta tardó porque el servidor necesitaba pensar en sus decisiones.</p>
          <span>Gravedad: media</span>
        </article>

        <article class="excusa-card">
          <h3>Funciona en mi máquina</h3>
          <p>El comportamiento fue validado en un entorno emocionalmente estable.</p>
          <span>Gravedad: clásica</span>
        </article>

        <article class="excusa-card">
          <h3>El CSS tomó decisiones propias</h3>
          <p>La interfaz interpretó la libertad creativa de una forma inesperada.</p>
          <span>Gravedad: visual</span>
        </article>

        <article class="excusa-card">
          <h3>Producción no estaba emocionalmente preparada</h3>
          <p>El despliegue llegó antes de que producción pudiera procesar el cambio.</p>
          <span>Gravedad: urgente</span>
        </article>
      </section>
~~~

## Anotaciones importantes
- No agregues todavía el formulario.
- No agregues todavía la sección de versión final.
- No corrijas todavía el botón del pie de página que dice \`Enbiar excusa\`.
- No cambies los textos del encabezado si ya fueron aprobados.

## Criterio de cierre
La misión se cerrará cuando la rama solicitada tenga el catálogo con las tarjetas requeridas.`
  },
  {
    id: 5,
    title: "Agregar nota al catálogo",
    body: `## Lo que debes realizar
- Trabaja en la rama \`feature/catalogo-excusas\`.
- Modifica \`index.html\` para agregar una nota visible al catálogo.

## Cambio exacto en index.html
- Dentro de la sección \`#catalogo-excusas\`, justo después de esta línea:

~~~html
        <h2>Catálogo de excusas aprobadas</h2>
~~~

- Agrega exactamente esta línea:

~~~html
        <p class="catalogo-nota">Todas las excusas fueron revisadas por el comité de despliegues dudosos.</p>
~~~

## Anotaciones importantes
- No agregues todavía el formulario.
- No agregues todavía la sección de versión final.
- No corrijas todavía el botón del pie de página que dice \`Enbiar excusa\`.
- No cambies las tarjetas del catálogo si ya fueron aprobadas.

## Criterio de cierre
La misión se cerrará cuando la nota esté publicada en la rama solicitada.`
  },
  {
    id: 6,
    title: "Integrar catálogo en develop",
    body: `## Lo que debes realizar
- Debe existir un Pull Request desde \`feature/catalogo-excusas\` hacia \`develop\`.
- Ese Pull Request debe quedar fusionado.

## Anotaciones importantes
- No agregues cambios nuevos al HTML durante esta integración.
- No mezcles ramas distintas a las solicitadas.
- No agregues todavía el formulario.
- No corrijas todavía el botón del pie de página que dice \`Enbiar excusa\`.

## Criterio de cierre
La misión se cerrará cuando el Pull Request solicitado esté fusionado hacia \`develop\`.`
  },
  {
    id: 7,
    title: "Agregar formulario de solicitud",
    body: `## Lo que debes realizar
- Trabaja en la rama \`feature/formulario-excusa\`.
- Modifica \`index.html\` para agregar un formulario de solicitud de excusas.

## Cambios exactos en index.html
- Dentro de \`<main>\`, antes de la etiqueta de cierre \`</main>\`, agrega exactamente este bloque:

~~~html
      <form id="formulario-excusa">
        <h2>Solicitud de excusa técnica</h2>

        <label>
          Nombre
          <input type="text" name="nombre" required>
        </label>

        <label>
          Tipo de problema
          <select name="tipo-problema" required>
            <option value="">Selecciona una opción</option>
            <option value="bug">Bug misterioso</option>
            <option value="deploy">Deploy dramático</option>
            <option value="css">CSS rebelde</option>
          </select>
        </label>

        <label>
          Nivel de urgencia
          <select name="nivel-urgencia" required>
            <option value="">Selecciona una opción</option>
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
          </select>
        </label>

        <label>
          Descripción del desastre
          <textarea name="descripcion-desastre" required></textarea>
        </label>

        <button type="submit">Enviar excusa al comité</button>
      </form>
~~~

## Anotaciones importantes
- No agregues todavía la sección de versión final.
- No corrijas todavía el botón del pie de página que dice \`Enbiar excusa\`.
- No cambies el catálogo si ya fue aprobado.

## Criterio de cierre
La misión se cerrará cuando la rama solicitada tenga el formulario con los campos requeridos.`
  },
  {
    id: 8,
    title: "Integrar formulario en develop",
    body: `## Lo que debes realizar
- Debe existir un Pull Request desde \`feature/formulario-excusa\` hacia \`develop\`.
- Ese Pull Request debe quedar fusionado.

## Anotaciones importantes
- No agregues cambios nuevos al HTML durante esta integración.
- No mezcles ramas distintas a las solicitadas.
- No corrijas todavía el botón del pie de página que dice \`Enbiar excusa\`.

## Criterio de cierre
La misión se cerrará cuando el Pull Request solicitado esté fusionado hacia \`develop\`.`
  },
  {
    id: 9,
    title: "Preparar versión final",
    body: `## Lo que debes realizar
- Trabaja en la rama \`release/v1.0.0\`.
- Modifica \`index.html\` para agregar una sección final de revisión.

## Cambios exactos en index.html
- Dentro de \`<main>\`, antes de la etiqueta de cierre \`</main>\`, agrega exactamente este bloque:

~~~html
      <section id="version-final">
        <h2>Versión 1.0.0</h2>
        <p>La versión está lista para revisión.</p>
      </section>
~~~

## Anotaciones importantes
- No cambies el encabezado aprobado.
- No cambies el catálogo aprobado.
- No cambies el formulario aprobado.
- No corrijas todavía el botón del pie de página que dice \`Enbiar excusa\`.

## Criterio de cierre
La misión se cerrará cuando la rama solicitada exista y el HTML tenga la sección final requerida.`
  },
  {
    id: 10,
    title: "Publicar release en main",
    body: `## Lo que debes realizar
- Debe existir un Pull Request desde \`release/v1.0.0\` hacia \`main\`.
- Ese Pull Request debe quedar fusionado.

## Anotaciones importantes
- No agregues cambios nuevos al HTML durante esta integración.
- No uses una rama distinta a la solicitada.

## Criterio de cierre
La misión se cerrará cuando el Pull Request solicitado esté fusionado hacia \`main\`.`
  },
  {
    id: 11,
    title: "Corregir botón de emergencia",
    body: `## Lo que debes realizar
- Trabaja en la rama \`hotfix/texto-boton\`.
- Modifica únicamente el texto incorrecto del botón del pie de página.

## Cambio exacto en index.html
- En el \`<footer>\`, reemplaza el bloque actual por este bloque:

~~~html
<footer>
  <button id="boton-envio-rapido" type="button">Enviar excusa</button>
</footer>
~~~

## Anotaciones importantes
- No cambies el encabezado.
- No cambies el catálogo.
- No cambies el formulario.
- No cambies la sección de versión final.
- No hagas cambios de estilo o estructura para esta corrección.

## Criterio de cierre
La misión se cerrará cuando la rama solicitada tenga una corrección pequeña y el texto incorrecto ya no aparezca.`
  },
  {
    id: 12,
    title: "Integrar hotfix en main y develop",
    body: `## Lo que debes realizar
- Debe existir un Pull Request desde \`hotfix/texto-boton\` hacia \`main\`.
- El Pull Request de \`hotfix/texto-boton\` hacia \`main\` debe quedar fusionado.
- Debe existir un Pull Request desde \`hotfix/texto-boton\` hacia \`develop\`.
- El Pull Request de \`hotfix/texto-boton\` hacia \`develop\` debe quedar fusionado.

## Anotaciones importantes
- No agregues cambios nuevos al HTML durante esta integración.
- No mezcles ramas distintas a las solicitadas.

## Criterio de cierre
Esta es la última misión. Se cerrará cuando el hotfix esté fusionado hacia \`main\` y hacia \`develop\`.`
  }
];

export function missionNumber(id) {
  return String(id).padStart(2, "0");
}

export function missionMarker(id) {
  return `<!-- ${PRACTICE_MARKER}:mission=${id} -->`;
}

export function missionIssueTitle(mission) {
  return `[Misión ${missionNumber(mission.id)}] ${mission.title}`;
}

export function missionIssueBody(mission) {
  return `${missionMarker(mission.id)}

## Regla de alcance
Modifica solo lo solicitado en esta misión. No adelantes trabajo de misiones futuras, no reestructures la página completa y no agregues cambios adicionales.

${mission.body}

## Cierre automático
No cierres este issue manualmente.`;
}

export function getMissionById(id) {
  return missions.find((mission) => mission.id === Number(id));
}

export function getNextMission(id) {
  return getMissionById(Number(id) + 1);
}

export function extractMissionId(text = "") {
  const markerMatch = text.match(/gitflow-examen:mission=(\d+)/i);
  if (markerMatch) {
    return Number(markerMatch[1]);
  }

  const titleMatch = text.match(/\[?Misi[oó]n\s+0?(\d+)\]?/i);
  if (titleMatch) {
    return Number(titleMatch[1]);
  }

  return null;
}
