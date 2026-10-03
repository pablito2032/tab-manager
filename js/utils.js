// ============================================================================
// utils.js — Funciones auxiliares, constantes compartidas, iconos y el
// componente de modal base (se define aquí para no añadir archivos fuera
// de la estructura acordada).
// ============================================================================

import { h, ref, onMounted, onBeforeUnmount, nextTick } from 'vue';

// ---------------------------------------------------------------------------
// Paleta pastel de categorías. El "id" coincide con [data-color] en
// css/variables.css; el "label" se muestra en los selectores.
// ---------------------------------------------------------------------------
export const PASTEL_COLORS = [
  { id: 'rose', label: 'Rosa' },
  { id: 'peach', label: 'Melocotón' },
  { id: 'yellow', label: 'Amarillo' },
  { id: 'lime', label: 'Lima' },
  { id: 'mint', label: 'Menta' },
  { id: 'teal', label: 'Turquesa' },
  { id: 'sky', label: 'Cielo' },
  { id: 'periwinkle', label: 'Pervinca' },
  { id: 'lavender', label: 'Lavanda' },
  { id: 'gray', label: 'Gris' },
];

export const DEFAULT_COLOR = 'periwinkle';

export function isValidColor(color) {
  return PASTEL_COLORS.some((c) => c.id === color);
}

// Color siguiente de la paleta, para que cada elemento nuevo tenga uno distinto
export function nextColor(count) {
  return PASTEL_COLORS[count % PASTEL_COLORS.length].id;
}

// Opciones de tema disponibles
export const THEME_OPTIONS = [
  { id: 'system', label: 'Sistema', icon: 'monitor' },
  { id: 'light', label: 'Claro', icon: 'sun' },
  { id: 'dark', label: 'Oscuro', icon: 'moon' },
];

// Estados de un enlace. Los valores internos van en inglés; las etiquetas,
// en español.
export const LINK_STATUSES = [
  { id: 'pending', label: 'Pendiente' },
  { id: 'seen', label: 'Visto' },
  { id: 'saved', label: 'Guardado' },
];

export const DEFAULT_STATUS = 'pending';

export function isValidStatus(status) {
  return LINK_STATUSES.some((s) => s.id === status);
}

export function statusLabel(status) {
  return LINK_STATUSES.find((s) => s.id === status)?.label ?? status;
}

// ---------------------------------------------------------------------------
// Iconos SVG (estilo trazo, 24×24). Se pintan con currentColor para que
// hereden el color del texto en ambos temas.
// ---------------------------------------------------------------------------
const ICON_PATHS = {
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 6l12 12M18 6L6 18',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5',
  plus: 'M12 5v14M5 12h14',
  settings:
    'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z' +
    'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  sun:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z' +
    'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  monitor: 'M3 5h18v11H3zM8 21h8M12 16v5',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  tabs: 'M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 8V5a1 1 0 0 1 1-1h5l2 4',
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  refresh: 'M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4',
  filter: 'M4 5h16l-6 8v6l-4-1v-5z',
  image: 'M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9h.01',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z',
  check: 'M5 12l5 5L20 7',
};

// Componente funcional <AppIcon name="..." /> — decorativo (aria-hidden)
export const AppIcon = (props) =>
  h(
    'svg',
    {
      class: ['icon', props.size === 'sm' && 'icon--sm'],
      viewBox: '0 0 24 24',
      'aria-hidden': 'true',
      focusable: 'false',
    },
    [h('path', { d: ICON_PATHS[props.name] || '' })],
  );
AppIcon.props = ['name', 'size'];

// ---------------------------------------------------------------------------
// Utilidades generales
// ---------------------------------------------------------------------------

// Genera un identificador único y corto (con prefijo opcional)
export function createId(prefix = '') {
  const random =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return prefix ? `${prefix}_${random}` : random;
}

// Fecha actual en formato ISO (para createdAt / updatedAt)
export function nowIso() {
  return new Date().toISOString();
}

// Copia profunda de datos serializables en JSON
export function deepClone(value) {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

// Siguiente valor de "order" para añadir un elemento al final de una lista
export function nextOrder(items) {
  return items.reduce((max, item) => Math.max(max, item.order ?? 0), -1) + 1;
}

// Ordena una copia de la lista por su campo "order"
export function byOrder(items) {
  return [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

// ---------------------------------------------------------------------------
// URLs
// ---------------------------------------------------------------------------

// Normaliza lo que escribe el usuario a una URL absoluta válida.
// Añade https:// si falta. Devuelve null si no es una URL web válida.
export function normalizeUrl(input) {
  const text = String(input ?? '').trim();
  if (!text) return null;
  const withProtocol = /^[a-z][a-z\d+\-.]*:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    // Exigir un dominio con punto (o localhost) para descartar texto suelto
    if (!url.hostname.includes('.') && url.hostname !== 'localhost') return null;
    return url.href;
  } catch {
    return null;
  }
}

// Dominio sin "www." — se usa como título por defecto
export function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// URL del favicon mediante el servicio público de Google
export function faviconUrl(url) {
  const domain = getDomain(url);
  return domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64` : '';
}

// Analiza un bloque de texto con una URL por línea (también acepta
// separadas por espacios o comas). Devuelve las válidas sin duplicados y
// las líneas que no se pudieron interpretar.
export function parseUrlList(text) {
  const tokens = String(text ?? '')
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const valid = [];
  const invalid = [];
  const seen = new Set();
  for (const token of tokens) {
    const url = normalizeUrl(token);
    if (!url) {
      invalid.push(token);
    } else if (!seen.has(url)) {
      seen.add(url);
      valid.push(url);
    }
  }
  return { valid, invalid };
}

// ---------------------------------------------------------------------------
// Títulos a partir de la URL (sin red)
// Muchas URLs ya contienen lo importante: el término de una búsqueda, el
// repositorio de GitHub, el artículo de Wikipedia… Se usa como título por
// defecto antes de recurrir al dominio.
// ---------------------------------------------------------------------------

// Buscadores: host (sin www) → [nombre, parámetro de la consulta]
const SEARCH_ENGINES = [
  [/^google\.[a-z.]+$/, 'Google', 'q', /^\/search/],
  [/^bing\.com$/, 'Bing', 'q', /^\/search/],
  [/^duckduckgo\.com$/, 'DuckDuckGo', 'q', /^\/$/],
  [/^search\.brave\.com$/, 'Brave Search', 'q', /^\/(search|images|videos|news)/],
  [/^(search\.)?yahoo\.com$/, 'Yahoo', 'p', /^\/search/],
  [/^ecosia\.org$/, 'Ecosia', 'q', /^\/search/],
  [/^(m\.)?youtube\.com$/, 'YouTube', 'search_query', /^\/results/],
  [/^github\.com$/, 'GitHub', 'q', /^\/search/],
  [/^amazon\.[a-z.]+$/, 'Amazon', 'k', /^\/s/],
  [/^[a-z]{2,3}\.wikipedia\.org$/, 'Wikipedia', 'search', /^\/w\/index\.php/],
];

// Servicios privados: su título real requiere iniciar sesión, así que
// ningún servicio externo puede leerlo. Se describe el tipo de documento.
const PRIVATE_PAGES = [
  [/^drive\.google\.com$/, /^\/drive\/(u\/\d+\/)?folders\//, 'Carpeta de Google Drive'],
  [/^drive\.google\.com$/, /^\/file\//, 'Archivo de Google Drive'],
  [/^drive\.google\.com$/, /./, 'Google Drive'],
  [/^docs\.google\.com$/, /^\/document\//, 'Documento de Google'],
  [/^docs\.google\.com$/, /^\/spreadsheets\//, 'Hoja de cálculo de Google'],
  [/^docs\.google\.com$/, /^\/presentation\//, 'Presentación de Google'],
  [/^docs\.google\.com$/, /^\/forms\//, 'Formulario de Google'],
  [/^colab\.research\.google\.com$/, /^\/drive\//, 'Cuaderno de Colab'],
  [/^colab\.research\.google\.com$/, /^\/github\//, null], // se trata como GitHub más abajo
  [/^mail\.google\.com$/, /./, 'Gmail'],
  [/^calendar\.google\.com$/, /./, 'Google Calendar'],
];

const GITHUB_SECTIONS = { issues: 'Issue', pull: 'Pull request', discussions: 'Discusión' };

function decodeSegment(segment) {
  try {
    return decodeURIComponent(segment.replace(/\+/g, ' '));
  } catch {
    return segment;
  }
}

// Convierte "mi-articulo_genial.html" en "Mi articulo genial"
function humanizeSlug(segment) {
  const text = decodeSegment(segment)
    .replace(/\.(html?|php|aspx?|jsp)$/i, '')
    .replace(/[-_][a-f\d]{8,}$/i, '') // sufijo de identificador (p. ej. Medium)
    .replace(/[-_+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

// Segmentos de ruta genéricos que no sirven como título
const GENERIC_SEGMENTS = new Set(['watch', 'index', 'home', 'default', 'main', 'view', 'edit', 'page', 'search', 'results']);

// ¿Parece un identificador (hash, número…) y no un texto legible?
function looksLikeId(segment) {
  return (
    GENERIC_SEGMENTS.has(segment.toLowerCase()) ||
    /^[\d]+$/.test(segment) ||
    /^[a-f\d]{12,}$/i.test(segment) ||
    (segment.length > 16 && !/[-_ ]/.test(segment) && /\d/.test(segment)) ||
    !/[a-záéíóúñü]{3,}/i.test(decodeSegment(segment))
  );
}

function githubTitle(parts) {
  const [owner, repo, section, ...rest] = parts;
  if (!owner) return null;
  if (!repo) return owner;
  const base = `${owner}/${repo}`;
  if (GITHUB_SECTIONS[section] && rest[0]) return `${GITHUB_SECTIONS[section]} #${rest[0]} · ${base}`;
  if ((section === 'blob' || section === 'tree') && rest.length > 1) return `${rest.slice(1).join('/')} · ${base}`;
  if (section === 'wiki' && rest[0]) return `${humanizeSlug(rest[0])} · ${base} (wiki)`;
  return base;
}

// Devuelve un título deducido de la URL o null si no hay nada mejor que el dominio
export function titleFromUrl(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, '');
  const path = u.pathname;
  const parts = path.split('/').filter(Boolean);

  // Búsquedas: mostrar qué se buscó
  for (const [hostRe, name, param, pathRe] of SEARCH_ENGINES) {
    if (hostRe.test(host) && pathRe.test(path)) {
      const query = u.searchParams.get(param)?.trim();
      if (query) return `"${query}" · ${name}`;
    }
  }

  // Documentos privados
  for (const [hostRe, pathRe, label] of PRIVATE_PAGES) {
    if (hostRe.test(host) && pathRe.test(path)) {
      if (label === null) return `${githubTitle(parts.slice(1))} · Colab`;
      return label;
    }
  }

  // Vídeos: el título real llega después desde noembed
  if (/^((m|music)\.)?youtube\.com$/.test(host) && /^\/(watch|shorts|live)/.test(path)) return 'Vídeo de YouTube';
  if (host === 'youtu.be' && parts[0]) return 'Vídeo de YouTube';

  if (host === 'github.com') return githubTitle(parts);
  if (host === 'gist.github.com' && parts[0]) return `Gist de ${parts[0]}`;

  // Wikipedia: /wiki/Nombre_del_artículo
  if (/(^|\.)wikipedia\.org$/.test(host) && parts[0] === 'wiki' && parts[1]) {
    return `${decodeSegment(parts[1]).replace(/_/g, ' ')} · Wikipedia`;
  }

  // Reddit: /r/sub/comments/id/titulo_del_post
  if (/(^|\.)reddit\.com$/.test(host) && parts[0] === 'r' && parts[1]) {
    if (parts[2] === 'comments' && parts[4]) return `${humanizeSlug(parts[4])} · r/${parts[1]}`;
    return `r/${parts[1]}`;
  }

  // Caso general: último segmento legible de la ruta ("/blog/mi-articulo")
  const slug = [...parts].reverse().find((segment) => !looksLikeId(segment));
  if (slug && parts.length > 0) {
    const text = humanizeSlug(slug);
    if (text.length >= 4) return `${text} · ${host}`;
  }
  return null;
}

// Título por defecto de un enlace: deducido de la URL o, si no, el dominio
export function defaultTitle(url) {
  return titleFromUrl(url) || getDomain(url) || url;
}

// ¿El título es uno generado automáticamente (y por tanto reemplazable)?
export function isAutoTitle(title, url) {
  return !title || title === url || title === getDomain(url) || title === titleFromUrl(url);
}

// ---------------------------------------------------------------------------
// Título real de la página mediante servicios de metadatos con CORS
// (gratuitos y sin clave):
//   - noembed.com  → vídeos (YouTube, Vimeo…) vía oEmbed
//   - microlink.io → cualquier página pública (límite gratuito diario)
// ---------------------------------------------------------------------------
const VIDEO_HOSTS = /^((m|music)\.)?youtube\.com$|^youtu\.be$|^vimeo\.com$/;

// Títulos que indican que no se pudo leer la página real
const USELESS_TITLES = [
  /^(sign in|log ?in|iniciar sesión|acceder)\b/i,
  /^(access denied|forbidden|not found|404|403|error)\b/i,
  /^just a moment/i,
  /^attention required/i,
  /^(youtube|google|github|brave search|google drive|vídeo de youtube)$/i,
];

// ¿Merece la pena consultar el título a un servicio externo?
export function canFetchTitle(url) {
  if (isPrivateUrl(url)) return false;
  // Las búsquedas ya tienen un buen título deducido de la URL
  const u = new URL(url);
  const host = u.hostname.replace(/^www\./, '');
  return !SEARCH_ENGINES.some(([hostRe, , , pathRe]) => hostRe.test(host) && pathRe.test(u.pathname));
}

function cleanTitle(title, url) {
  const text = String(title ?? '')
    .replace(/\s+/g, ' ')
    .replace(/^GitHub - /, '') // "GitHub - usuario/repo: descripción"
    .trim();
  if (!text || text.length > 300) return null;
  if (text.toLowerCase() === getDomain(url).toLowerCase()) return null;
  if (USELESS_TITLES.some((re) => re.test(text))) return null;
  return text;
}

async function fetchJson(endpoint, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(endpoint, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

// ¿Es una página privada o local, que ningún servicio externo puede leer?
export function isPrivateUrl(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return true;
  }
  const host = u.hostname.replace(/^www\./, '');
  if (host === 'localhost' || /^(\d+\.){3}\d+$/.test(host) || /\.(local|internal|lan)$/.test(host)) return true;
  return PRIVATE_PAGES.some(([hostRe, pathRe]) => hostRe.test(host) && pathRe.test(u.pathname));
}

// Metadatos de la página: { title, description, image, logo, publisher, author }
// Se guardan en memoria durante la sesión (también las promesas en curso)
// para no repetir consultas al abrir varias veces la misma vista previa.
const metadataCache = new Map();

export function fetchPageMetadata(url, { timeoutMs = 8000 } = {}) {
  if (!canFetchTitle(url)) return Promise.resolve(null);
  if (metadataCache.has(url)) return metadataCache.get(url);
  const promise = (async () => {
    const host = getDomain(url);
    let meta = null;
    try {
      if (VIDEO_HOSTS.test(host)) {
        const oembed = await fetchJson(`https://noembed.com/embed?url=${encodeURIComponent(url)}`, timeoutMs);
        if (oembed && !oembed.error && oembed.title) {
          meta = {
            title: oembed.title,
            description: '',
            image: oembed.thumbnail_url || '',
            logo: '',
            publisher: oembed.provider_name || '',
            author: oembed.author_name || '',
          };
        }
      }
      if (!meta) {
        const res = await fetchJson(`https://api.microlink.io/?url=${encodeURIComponent(url)}`, timeoutMs);
        if (res?.status === 'success' && res.data) {
          const d = res.data;
          meta = {
            title: d.title || '',
            description: d.description || '',
            image: d.image?.url || '',
            logo: d.logo?.url || '',
            publisher: d.publisher || '',
            author: d.author || '',
          };
        }
      }
    } catch {
      meta = null; // sin red, tiempo agotado, CORS…
    }
    if (!meta) metadataCache.delete(url); // permitir reintentar más tarde
    return meta;
  })();
  metadataCache.set(url, promise);
  return promise;
}

// Devuelve el título real de la página o null si no se pudo obtener
export async function fetchPageTitle(url, options) {
  const meta = await fetchPageMetadata(url, options);
  return meta ? cleanTitle(meta.title, url) : null;
}

// ---------------------------------------------------------------------------
// Vista previa
// ---------------------------------------------------------------------------

// Sitios que se sabe que impiden mostrarse dentro de un iframe
// (cabeceras X-Frame-Options / CSP frame-ancestors).
const FRAME_BLOCKED_HOSTS = [
  /(^|\.)google\.[a-z.]+$/, /(^|\.)youtube\.com$/, /^github\.com$/, /^gist\.github\.com$/, /^gitlab\.com$/,
  /^(twitter|x)\.com$/, /(^|\.)facebook\.com$/, /^instagram\.com$/, /(^|\.)linkedin\.com$/,
  /(^|\.)reddit\.com$/, /(^|\.)amazon\.[a-z.]+$/, /(^|\.)stackoverflow\.com$/, /(^|\.)stackexchange\.com$/,
  /^search\.brave\.com$/, /^bing\.com$/, /^duckduckgo\.com$/, /(^|\.)yahoo\.com$/,
  /^developer\.mozilla\.org$/, /(^|\.)microsoft\.com$/, /(^|\.)apple\.com$/, /(^|\.)netflix\.com$/,
  /^(chat\.)?openai\.com$/, /^chatgpt\.com$/, /^claude\.ai$/, /(^|\.)notion\.(so|site)$/, /^figma\.com$/,
  /(^|\.)discord\.com$/, /(^|\.)whatsapp\.com$/, /(^|\.)tiktok\.com$/, /(^|\.)pinterest\.[a-z.]+$/,
  /(^|\.)twitch\.tv$/, /(^|\.)spotify\.com$/, /^web\.telegram\.org$/, /(^|\.)paypal\.com$/,
];

// Convierte "90", "90s" o "1m30s" en segundos
function parseTimestamp(value) {
  if (!value) return 0;
  if (/^\d+s?$/.test(value)) return parseInt(value, 10);
  const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  return match ? (+match[1] || 0) * 3600 + (+match[2] || 0) * 60 + (+match[3] || 0) : 0;
}

// Extrae el id de un vídeo de YouTube
function youtubeId(u, host) {
  if (host === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
  if (/^((m|music)\.)?youtube\.com$/.test(host)) {
    if (u.pathname === '/watch') return u.searchParams.get('v');
    const match = u.pathname.match(/^\/(shorts|live|embed)\/([\w-]+)/);
    if (match) return match[2];
  }
  return null;
}

// Decide cómo previsualizar una URL:
//   { mode: 'embed', src }  → versión pensada para incrustarse (YouTube, Docs…)
//   { mode: 'frame', src }  → la propia página, si no sabemos que lo bloquee
//   { mode: 'summary', reason } → mejor mostrar el resumen directamente
export function getPreviewSource(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return { mode: 'summary', reason: 'invalid' };
  }
  const host = u.hostname.replace(/^www\./, '');

  // ---- Versiones incrustables conocidas ----
  const ytId = youtubeId(u, host);
  if (ytId) {
    const start = parseTimestamp(u.searchParams.get('t') ?? u.searchParams.get('start'));
    return {
      mode: 'embed',
      src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(ytId)}${start > 0 ? `?start=${start}` : ''}`,
    };
  }
  const vimeo = host === 'vimeo.com' && u.pathname.match(/^\/(\d+)/);
  if (vimeo) return { mode: 'embed', src: `https://player.vimeo.com/video/${vimeo[1]}` };

  const spotify = host === 'open.spotify.com' && u.pathname.match(/^\/(track|album|playlist|episode|show|artist)\/(\w+)/);
  if (spotify) return { mode: 'embed', src: `https://open.spotify.com/embed/${spotify[1]}/${spotify[2]}` };

  // Google Docs / Drive: /preview se puede incrustar (requiere sesión iniciada en Google)
  const doc = host === 'docs.google.com' && u.pathname.match(/^\/(document|spreadsheets|presentation)\/d\/([\w-]+)/);
  if (doc) return { mode: 'embed', src: `https://docs.google.com/${doc[1]}/d/${doc[2]}/preview`, private: true };
  const driveFile = host === 'drive.google.com' && u.pathname.match(/^\/file\/d\/([\w-]+)/);
  if (driveFile) return { mode: 'embed', src: `https://drive.google.com/file/d/${driveFile[1]}/preview`, private: true };

  // ---- Casos en los que el iframe no funcionará ----
  // Una página https (como GitHub Pages) no puede incrustar contenido http
  if (u.protocol === 'http:' && location.protocol === 'https:') return { mode: 'summary', reason: 'insecure' };
  if (FRAME_BLOCKED_HOSTS.some((re) => re.test(host))) return { mode: 'summary', reason: 'blocked' };

  return { mode: 'frame', src: u.href };
}

// Captura de pantalla generada por thum.io (gratuito, sin clave).
// La URL de destino va tal cual al final, como indica su documentación.
export function screenshotUrl(url) {
  return `https://image.thum.io/get/width/800/crop/1000/noanimate/${url}`;
}

// ---------------------------------------------------------------------------
// Búsqueda: normalización sin acentos ni mayúsculas y resaltado
// ---------------------------------------------------------------------------
function foldChar(char) {
  return char.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function foldText(text) {
  return String(text ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

// Divide la búsqueda en términos (todos deben aparecer)
export function searchTerms(query) {
  return foldText(query).split(/\s+/).filter(Boolean);
}

// Divide un texto en trozos marcando los que coinciden con algún término.
// Devuelve [{ text, match }] para pintarlo con <mark> sin usar v-html.
export function highlightParts(text, terms) {
  const source = String(text ?? '');
  if (!terms?.length || !source) return [{ text: source, match: false }];
  // Texto plegado y mapa de posiciones plegadas → originales
  let folded = '';
  const map = [];
  for (let i = 0; i < source.length; i++) {
    const f = foldChar(source[i]);
    for (let j = 0; j < f.length; j++) map.push(i);
    folded += f;
  }
  const marks = new Array(source.length).fill(false);
  for (const term of terms) {
    let from = folded.indexOf(term);
    while (from !== -1) {
      for (let k = from; k < from + term.length; k++) marks[map[k]] = true;
      from = folded.indexOf(term, from + term.length);
    }
  }
  const parts = [];
  for (let i = 0; i < source.length; i++) {
    const last = parts[parts.length - 1];
    if (last && last.match === marks[i]) last.text += source[i];
    else parts.push({ text: source[i], match: marks[i] });
  }
  return parts;
}

// ---------------------------------------------------------------------------
// Accesibilidad: mantiene el foco de teclado dentro de un contenedor
// (modales). Se llama desde un manejador de 'keydown' con la tecla Tab.
// ---------------------------------------------------------------------------
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

export function getFocusable(container) {
  return [...container.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

export function trapFocus(event, container) {
  if (event.key !== 'Tab' || !container) return;
  const focusable = getFocusable(container);
  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

// ---------------------------------------------------------------------------
// <BaseModal> — diálogo accesible reutilizable
// - Se teletransporta a <body> (evita problemas con contenedores con
//   transform, como la barra lateral en móvil).
// - Escape y clic fuera cierran; el foco queda atrapado dentro y vuelve al
//   elemento anterior al cerrar.
// - Foco inicial: el primer elemento con [data-autofocus] o el primero
//   enfocable.
// Slots: default (cuerpo), footer.
// ---------------------------------------------------------------------------
export const BaseModal = {
  name: 'BaseModal',
  components: { AppIcon },
  props: {
    title: { type: String, required: true },
    // 'top' coloca el modal por encima de otros (p. ej. confirmaciones)
    layer: { type: String, default: 'base' },
    role: { type: String, default: 'dialog' },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const dialogRef = ref(null);
    const titleId = createId('modal-title');
    const previouslyFocused = document.activeElement;

    function close() {
      emit('close');
    }

    function onKeydown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
        return;
      }
      trapFocus(event, dialogRef.value);
    }

    onMounted(async () => {
      await nextTick();
      const dialog = dialogRef.value;
      if (!dialog) return;
      const target = dialog.querySelector('[data-autofocus]') || getFocusable(dialog)[0] || dialog;
      target.focus();
    });

    onBeforeUnmount(() => {
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    });

    return { dialogRef, titleId, close, onKeydown };
  },
  template: `
    <Teleport to="body">
      <div
        class="modal-backdrop"
        :class="{ 'modal-backdrop--top': layer === 'top' }"
        @mousedown.self="close"
      >
        <div
          ref="dialogRef"
          class="modal"
          :role="role"
          aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
          @keydown="onKeydown"
        >
          <header class="modal__header">
            <h2 :id="titleId" class="modal__title">{{ title }}</h2>
            <button type="button" class="icon-btn" aria-label="Cerrar" @click="close">
              <AppIcon name="close" />
            </button>
          </header>
          <slot />
          <footer v-if="$slots.footer" class="modal__footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Teleport>
  `,
};
