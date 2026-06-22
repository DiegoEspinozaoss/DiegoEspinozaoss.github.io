# Sitio personal de Diego Espinoza

Este repositorio contiene un portafolio web estático y una vista del proyecto de Overleaf que estaba en la carpeta local.

## Estado actual

- Sitio publicado en GitHub Pages.
- URL pública: https://diegoespinozaoss.github.io/
- Repositorio remoto: `DiegoEspinozaoss/DiegoEspinozaoss.github.io`

## Qué incluye el sitio

- Portada personal con foto.
- Perfil público de GitHub.
- Intereses extraídos del README público del perfil.
- Repositorios públicos destacados.
- Vista navegable del documento `overleaf_project/main.tex`.
- Imagen de galaxia de alta resolución embebida localmente.

## Archivos importantes

- `index.html`: página final del sitio.
- `build_site.mjs`: generador del HTML principal.
- `build_viewer.mjs`: generador previo para la vista del documento LaTeX.
- `publish_to_github.mjs`: publicación inicial vía GitHub API.
- `assets/profile-photo.jpeg`: foto personal proporcionada por el usuario.
- `assets/galaxy-hero.jpg`: imagen astronómica de portada.
- `overleaf_project/main.tex`: fuente del documento LaTeX clonado desde Overleaf.

## Cómo regenerar el sitio

```bash
node build_site.mjs
```

## Cómo publicar cambios

Si cambias el contenido local, primero regenera el HTML y luego vuelve a publicar el repositorio en GitHub Pages.

```bash
node build_site.mjs
node publish_to_github.mjs
```

## Fuente de datos

- GitHub público de `DiegoEspinozaoss`
- README público del perfil de GitHub
- Foto aportada por el usuario
- Proyecto de Overleaf clonado en `overleaf_project`

