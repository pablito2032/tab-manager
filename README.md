# Tab Manager

Gestor web personal de enlaces pendientes: sustituye el hábito de tener decenas de pestañas abiertas guardando, organizando y consultando todos tus enlaces en una sola página.

Sitio 100 % estático: HTML, CSS y JavaScript (módulos ES) con **Vue 3** y **SortableJS** cargados desde CDN. Sin Node.js, sin npm y sin paso de compilación.

> **Estado:** completo (6 de 6 fases). Funciona en cualquier navegador moderno (Chrome, Edge, Firefox, Safari) en escritorio y móvil.

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

## Copia de seguridad (exportar / importar)

En **Ajustes → Copia de seguridad**:

- **Exportar JSON** descarga `tab-manager-AAAA-MM-DD.json` con todas tus cuentas, categorías y enlaces (nunca incluye el token de sincronización).
- **Importar JSON** valida el archivo y te deja elegir:
  - **Combinar**: añade lo que no tengas y conserva lo actual (no duplica enlaces con la misma URL en la misma categoría).
  - **Reemplazar todo**: deja exactamente lo que hay en el archivo.
- Antes de reemplazar datos (al importar o al descargar de la nube) se guarda automáticamente una copia; el enlace **Restaurarla** la recupera.

## Sincronización en la nube (GitHub Gist)

Los datos se guardan en un **Gist privado** de tu cuenta, en un archivo `tab-manager.json`. No hace falta ningún servidor: la app habla directamente con la API de GitHub desde el navegador.

### Configuración

1. Crea un **token clásico** en GitHub con **solo el permiso `gist`**: [github.com/settings/tokens/new?scopes=gist](https://github.com/settings/tokens/new?scopes=gist&description=Tab%20Manager). Ponle una fecha de caducidad.
2. En Tab Manager abre **Ajustes → Sincronización con GitHub Gist**, pega el token y pulsa **Conectar**. La app comprueba el token y busca si ya tienes un Gist de Tab Manager.
3. En el primer dispositivo pulsa **Subir**: se crea el Gist privado.
4. En los demás dispositivos conecta el mismo token y pulsa **Sincronizar** (o **Descargar**).

### Botones

- **Subir**: la nube pasa a tener los datos de este navegador.
- **Descargar**: este navegador pasa a tener los datos de la nube (se guarda una copia local antes).
- **Sincronizar**: decide solo. Si solo cambió un lado, copia ese lado al otro; si no cambió nada, no hace nada.

### Conflictos

Tras cada sincronización se recuerda la fecha de modificación (`updatedAt`) de ambos lados. Si al sincronizar **los dos** han cambiado desde entonces, la app muestra las dos fechas y propone quedarse con la **más reciente**, previa confirmación. Además, *Subir* y *Descargar* avisan si van a sobrescribir una versión más reciente. Nada se pierde sin aviso: la versión local sustituida queda como copia restaurable, y GitHub conserva el historial de revisiones del Gist.

### Seguridad del token

- Se guarda **solo en `localStorage` de este navegador** (clave `tabmanager:sync`), nunca en el código, en el repositorio ni en las exportaciones.
- Cualquiera con acceso a este navegador podría leerlo: usa un token con solo el permiso `gist` y con caducidad, y pulsa **Olvidar token** en equipos compartidos. Si sospechas que se ha filtrado, revócalo en GitHub.

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
3. Añade enlaces con **Nuevo enlace**, o pega una lista de URLs (una por línea) con **Añadir varios**. El favicon se obtiene automáticamente y, si no escribes título, se deduce de la URL o se consulta el de la página (ver [Títulos de los enlaces](#títulos-de-los-enlaces)).
4. Cambia el estado de cada enlace (Pendiente / Visto / Guardado) desde su etiqueta, y usa **Abrir todos** para abrir una categoría entera.
5. **Busca** desde la cabecera (atajo `/`): busca en todas las cuentas por título, URL o nota, sin distinguir mayúsculas ni acentos. `Esc` limpia la búsqueda.
6. **Filtra** por estado con los botones Todos / Pendientes / Vistos / Guardados.
7. **Reordena o mueve** enlaces arrastrándolos por su asa (⋮⋮): dentro de una categoría, a otra categoría de la vista o soltándolos sobre una categoría de la barra lateral. Con el teclado: enfoca el asa y usa las flechas ↑/↓.
8. **Vista previa:** el icono del ojo muestra la página sin salir de la app (ver [Vista previa](#vista-previa)).
9. **Atajos:** `/` buscar · `N` nuevo enlace · `Esc` cerrar diálogos, la vista previa o limpiar la búsqueda.

### Títulos de los enlaces

Una web estática no puede leer el HTML de otras páginas (CORS), así que el título se obtiene así:

1. **A partir de la URL, al instante y sin red:** búsquedas de Google, Bing, DuckDuckGo, Brave, YouTube, GitHub o Amazon muestran lo buscado (`"cómo hacer pan" · Google`); GitHub muestra `usuario/repo`, issues y PRs; Wikipedia y Reddit, el artículo o el post; en otras webs se usa la parte legible de la ruta.
2. **Título real de la página**, en segundo plano, mediante servicios públicos sin clave: [noembed.com](https://noembed.com) para vídeos (YouTube, Vimeo) y [microlink.io](https://microlink.io) para el resto (con límite gratuito diario; los resultados se guardan en caché).
3. **Páginas privadas** (Google Drive, Docs, Colab, Gmail): su nombre solo es visible con tu sesión iniciada, así que se muestra el tipo ("Cuaderno de Colab") y puedes escribir el título tú.

Solo se sustituyen los títulos automáticos: si escribes uno propio, se respeta. La consulta externa se puede desactivar en **Ajustes → Títulos de las páginas**.

### Vista previa

Pulsa el icono del ojo de un enlace para abrir su vista previa (solo se carga la de ese enlace). En escritorio aparece a la derecha; en móvil ocupa toda la pantalla. `Esc` la cierra.

- **En vivo:** la página dentro de un `<iframe>` con `sandbox`. Para YouTube, Vimeo, Spotify y Google Docs/Drive se usa su versión incrustable oficial.
- **Resumen:** tarjeta con título, descripción e imagen ([microlink.io](https://microlink.io) / [noembed.com](https://noembed.com)) y una captura de [thum.io](https://www.thum.io). Las webs protegidas con verificaciones anti-bots (p. ej. Cloudflare) no se pueden capturar: el servicio ve la verificación en lugar de la página, y la app lo indica.
- **Abrir en pestaña nueva** siempre disponible, y un botón para marcar el enlace como visto.

Muchas webs (Google, GitHub, X, Reddit…) prohíben mostrarse dentro de otras páginas, y el navegador no avisa cuando ocurre. Por eso la app abre directamente el resumen en los sitios que se sabe que lo bloquean, pasa al resumen si la página no responde en 12 s y, si ves la vista en blanco, el enlace **"¿Aparece en blanco? Ver el resumen"** recuerda ese dominio para la próxima vez (se puede deshacer con **Intentar en vivo**).

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
- Los títulos obtenidos de servicios externos se guardan en caché (`tabmanager:title-cache`) para no repetir consultas, y los dominios que no se ven en vivo en `tabmanager:frame-blocked`.
- Los datos viven solo en este navegador: borrar los datos del sitio los elimina. Exporta una copia o activa la sincronización para no perderlos.

## Temas

- Por defecto sigue la preferencia del sistema (`prefers-color-scheme`).
- El botón sol/luna de la cabecera alterna claro/oscuro; en **Ajustes** puedes volver a "Sistema".
- La elección se guarda en `localStorage` (`tabmanager:theme`) y se aplica antes de pintar la página para evitar parpadeos.
- Todos los colores están en `css/variables.css`; la paleta pastel de categorías tiene 10 colores con variantes para cada tema.

## Diseño y accesibilidad

- **Responsive, mobile first** con puntos de corte en 600, 900 y 1200 px:
  - **< 900 px:** la barra lateral es un menú desplegable y la vista previa ocupa toda la pantalla.
  - **900–1199 px:** barra lateral fija y vista previa como panel flotante.
  - **≥ 1200 px:** la vista previa es una tercera columna (más ancha a partir de 1440 px).
- **Contraste WCAG AA** comprobado en ambos temas para todos los pares de texto y fondo, incluidas las 10 etiquetas de color, los estados y los bordes de los campos (≥ 3:1).
- **Teclado:** todo es accesible con el teclado, con foco visible; los diálogos atrapan el foco y lo devuelven al cerrarse; los enlaces se reordenan con las flechas desde su asa.
- **Lectores de pantalla:** etiquetas `aria` en los botones con solo icono, regiones `aria-live` para avisos y resultados, y patrones ARIA estándar (diálogos, grupos de opciones, interruptores).
- Se respeta **"reducir movimiento"** del sistema y el color de la barra del navegador móvil sigue al tema.
- Revisado con [axe-core](https://github.com/dequelabs/axe-core) (WCAG 2.2 AA y buenas prácticas) sin incidencias en las vistas principales, en ambos temas.

## Dependencias (versiones fijadas)

| Librería   | Versión | Origen   |
|------------|---------|----------|
| Vue        | 3.5.13  | unpkg    |
| SortableJS | 1.15.6  | jsDelivr |
