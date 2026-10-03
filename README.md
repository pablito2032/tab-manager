# Tab Manager

Gestor web personal de enlaces pendientes: sustituye el hábito de tener decenas de pestañas abiertas guardando, organizando y consultando todos tus enlaces en una sola página.

Sitio 100 % estático: HTML, CSS y JavaScript (módulos ES) con **Vue 3** y **SortableJS** cargados desde CDN. Sin Node.js, sin npm y sin paso de compilación.

> **Estado:** fase 1 de 6 (estructura, HTML base y sistema de temas).

## Ejecutar en local

Los módulos ES **no funcionan** abriendo `index.html` con `file://`; hace falta un servidor estático. Cualquiera de estas opciones sirve:

- **Python** (viene en macOS y la mayoría de Linux):
  ```bash
  python3 -m http.server 8000
  ```
  y abre <http://localhost:8000>.
- **VS Code:** instala la extensión *Live Server*, abre la carpeta del proyecto y pulsa *Go Live*.

## Publicar en GitHub Pages

1. Sube el proyecto a un repositorio de GitHub (los archivos en la raíz).
2. En el repositorio: **Settings → Pages**.
3. En *Build and deployment*, elige **Deploy from a branch**, rama `main` y carpeta `/ (root)`.
4. Guarda. En uno o dos minutos la app estará en `https://<usuario>.github.io/<repositorio>/`.

Todas las rutas son relativas, así que funciona igual en un subdirectorio.

## Sincronización en la nube

*(Se documentará en la fase 5.)*

## Estructura

```
index.html          Página única, import map de dependencias CDN
css/variables.css   Tokens de diseño: colores, tipografía, espaciados y temas
css/base.css        Reset y estilos generales
css/layout.css      Estructura y responsive (600 / 900 / 1200 px)
css/components.css  Botones, campos, tarjetas, modales…
js/app.js           Crea y monta la app de Vue
js/store.js         Estado reactivo global y operaciones CRUD
js/storage.js       Persistencia local y sincronización
js/utils.js         Utilidades, paleta, iconos
js/components/      Componentes Vue como objetos JS con template en string
assets/icons/       Iconos y favicon
```

## Temas

- Por defecto sigue la preferencia del sistema (`prefers-color-scheme`).
- El botón sol/luna de la cabecera alterna claro/oscuro; en **Ajustes** puedes volver a "Sistema".
- La elección se guarda en `localStorage` (`tabmanager:theme`) y se aplica antes de pintar la página para evitar parpadeos.
- Todos los colores están en `css/variables.css`; la paleta pastel de categorías tiene 10 colores con variantes para cada tema.

## Dependencias (versiones fijadas)

| Librería   | Versión | Origen   |
|------------|---------|----------|
| Vue        | 3.5.13  | unpkg    |
| SortableJS | 1.15.6  | jsDelivr |
