# Agent Notes

Este archivo resume el contexto operativo para continuar el trabajo sin reconstruir todo desde cero.

## Objetivo del proyecto

Mantener un sitio web personal y público para Diego Espinoza, con portafolio, perfil de GitHub y el documento de Overleaf.

## Estado logrado

- Se clonó el proyecto de Overleaf en `overleaf_project/`.
- Se generó una web estática en `index.html`.
- Se integraron foto personal, bio pública, intereses y repositorios públicos de GitHub.
- Se añadió una imagen astronómica de alta resolución como pieza visual principal.
- El sitio quedó publicado en GitHub Pages.

## URL pública

- https://diegoespinozaoss.github.io/

## Datos públicos usados

- Perfil GitHub: `DiegoEspinozaoss`
- README del perfil GitHub
- Repositorios públicos del perfil GitHub

## Archivos clave

- `index.html`
- `build_site.mjs`
- `publish_to_github.mjs`
- `overleaf_project/main.tex`
- `assets/profile-photo.jpeg`
- `assets/galaxy-hero.jpg`

## Flujo recomendado de trabajo

1. Editar `build_site.mjs` si cambian los datos o la estructura visual.
2. Regenerar el sitio con `node build_site.mjs`.
3. Validar que `index.html` refleje los cambios.
4. Publicar de nuevo si es necesario.

## Notas útiles

- La visualización del documento no depende de compilar LaTeX.
- La portada usa una imagen local descargada desde internet para evitar depender de hotlinks.
- La publicación en GitHub Pages ya está habilitada sobre la rama `main`.

