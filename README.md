# Tab Manager

Gestor web personal de enlaces pendientes: sustituye el hábito de tener decenas de pestañas abiertas guardando, organizando y consultando todos tus enlaces en una sola página.

Sitio 100 % estático: HTML, CSS y JavaScript (módulos ES) con **Vue 3** y **SortableJS** cargados desde CDN. Sin Node.js, sin npm y sin paso de compilación.

> **Estado:** fase 2 de 6 (modelo de datos, CRUD y guardado local).

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

## Uso básico

1. Crea una **cuenta** (p. ej. "Personal") con el botón `+` de la barra lateral, o pulsa **Cargar datos de ejemplo** para probar.
2. Dentro de la cuenta, crea **categorías** (funcionan como grupos de pestañas).
3. Añade enlaces con **Nuevo enlace**, o pega una lista de URLs (una por línea) con **Añadir varios**. El favicon se obtiene automáticamente y, si no escribes título, se usa el dominio.
4. Cambia el estado de cada enlace (Pendiente / Visto / Guardado) desde su etiqueta, y usa **Abrir todos** para abrir una categoría entera.

> **Abrir todos:** muchos navegadores solo dejan abrir una pestaña por clic. Si se bloquean las demás, permite las ventanas emergentes para este sitio (icono en la barra de direcciones) y vuelve a pulsar.

## Datos y almacenamiento

Todo se guarda automáticamente en `localStorage` del navegador (clave `tabmanager:data`) como un único objeto JSON:

```json
{
  "version": 1,
  "updatedAt": "2026-10-03T12:00:00.000Z",
  "accounts":   [{ "id": "acc_…", "name": "Personal", "email": "", "color": "sky", "order": 0 }],
  "categories": [{ "id": "cat_…", "accountId": "acc_…", "name": "Para leer", "color": "mint", "order": 0 }],
  "links": [{
    "id": "lnk_…", "categoryId": "cat_…", "url": "https://…", "title": "…",
    "favicon": "https://www.google.com/s2/favicons?domain=…&sz=64",
    "note": "", "status": "pending", "createdAt": "…", "order": 0
  }]
}
```

- `status` admite `pending` (pendiente), `seen` (visto) y `saved` (guardado).
- El campo `version` permite migrar el formato en el futuro (`migrateData` en `js/storage.js`); al cargar se validan los datos y se descartan registros huérfanos o inválidos.
- Si tienes la app abierta en varias pestañas, los cambios se sincronizan entre ellas.
- Los datos viven solo en este navegador: borrar los datos del sitio los elimina. La exportación a JSON llega en la fase 5.

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
