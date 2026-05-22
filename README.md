# Examen Git Flow: Oficina Nacional de Excusas Técnicas

Repositorio plantilla para un examen de Git Flow basado en una página HTML existente.

El estudiante debe seguir los issues creados automáticamente. Cada misión indica qué cambiar en `index.html`, qué rama o Pull Request se espera y qué no debe tocarse todavía.

No se evalúa README.

## Proyecto base

La página inicial está en:

```text
index.html
```

Puede verse localmente sin instalar dependencias ni levantar servidor:

- Abre `index.html` con doble clic.
- O arrastra `index.html` al navegador.
- O usa la opción **Open File** del navegador.

## Validaciones

Los workflows revisan:

- existencia de `develop`;
- ramas `feature/`, `release/` y `hotfix/`;
- Pull Requests con origen y destino correctos;
- contenido solicitado en `index.html`;
- corrección pequeña del hotfix;
- protección contra cierre manual de issues.

## Misiones

La secuencia del examen está definida en:

```text
scripts/practice-missions.js
```

La validación automática está en:

```text
scripts/validate-progress.js
scripts/validate-html.js
scripts/validate-gitflow.js
```
