// ============================================================================
// storage.js — Persistencia local (y, en la fase 5, sincronización en la nube)
// ----------------------------------------------------------------------------
// Formato guardado (un único objeto JSON):
// {
//   version: 1,
//   updatedAt: ISO,
//   accounts:   [{ id, name, email, color, order }],
//   categories: [{ id, accountId, name, color, order }],
//   links:      [{ id, categoryId, url, title, favicon, note, status, createdAt, order }]
// }
//
// Sincronización: GitHub Gist privado con un único archivo
// `tab-manager.json` con este mismo formato. El token personal se guarda
// solo en este navegador (clave `tabmanager:sync`) y nunca se exporta.
// ============================================================================

import { isValidColor, isValidStatus, DEFAULT_COLOR, DEFAULT_STATUS, faviconUrl, defaultTitle, nowIso } from './utils.js';

// Claves de localStorage. THEME_KEY debe coincidir con el script en línea
// de index.html que aplica el tema antes de pintar la página.
export const THEME_KEY = 'tabmanager:theme';
export const DATA_KEY = 'tabmanager:data';
export const PREFS_KEY = 'tabmanager:prefs';
export const TITLE_CACHE_KEY = 'tabmanager:title-cache';
export const FRAME_BLOCKED_KEY = 'tabmanager:frame-blocked';
export const BACKUP_KEY = 'tabmanager:backup';
export const SYNC_KEY = 'tabmanager:sync';

// Versión actual del formato de datos
export const DATA_VERSION = 1;

// Lectura segura: localStorage puede lanzar excepciones (modo privado,
// almacenamiento bloqueado, cuota llena…). Nunca debe romper la app.
function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`[storage] No se pudo guardar "${key}":`, error);
    return false;
  }
}

function safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* sin almacenamiento disponible: no hay nada que borrar */
  }
}

function safeParse(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Tema
// ---------------------------------------------------------------------------

// Devuelve 'light', 'dark' o 'system' (por defecto)
export function loadThemePreference() {
  const value = safeGet(THEME_KEY);
  return value === 'light' || value === 'dark' ? value : 'system';
}

// 'system' se guarda borrando la clave, para seguir al sistema
export function saveThemePreference(preference) {
  if (preference === 'light' || preference === 'dark') {
    safeSet(THEME_KEY, preference);
  } else {
    safeRemove(THEME_KEY);
  }
}

// ---------------------------------------------------------------------------
// Preferencias de interfaz (vista, selección actual…)
// ---------------------------------------------------------------------------
export function loadPrefs() {
  const prefs = safeParse(safeGet(PREFS_KEY));
  return prefs && typeof prefs === 'object' ? prefs : {};
}

export function savePrefs(prefs) {
  safeSet(PREFS_KEY, JSON.stringify(prefs));
}

// ---------------------------------------------------------------------------
// Caché de títulos obtenidos de servicios externos: { url: { title, at } }
// Se limita a las entradas más recientes para no crecer sin fin.
// ---------------------------------------------------------------------------
const TITLE_CACHE_LIMIT = 1000;

export function loadTitleCache() {
  const cache = safeParse(safeGet(TITLE_CACHE_KEY));
  return cache && typeof cache === 'object' ? cache : {};
}

export function saveTitleCache(cache) {
  const entries = Object.entries(cache);
  if (entries.length > TITLE_CACHE_LIMIT) {
    entries.sort((a, b) => b[1].at - a[1].at);
    for (const [url] of entries.slice(TITLE_CACHE_LIMIT)) delete cache[url];
  }
  safeSet(TITLE_CACHE_KEY, JSON.stringify(cache));
}

// ---------------------------------------------------------------------------
// Dominios que el usuario marcó como "no se ve en la vista previa"
// ---------------------------------------------------------------------------
export function loadFrameBlockedHosts() {
  const list = safeParse(safeGet(FRAME_BLOCKED_KEY));
  return Array.isArray(list) ? list.filter((h) => typeof h === 'string') : [];
}

export function saveFrameBlockedHosts(hosts) {
  safeSet(FRAME_BLOCKED_KEY, JSON.stringify(hosts.slice(-500)));
}

// ---------------------------------------------------------------------------
// Datos
// ---------------------------------------------------------------------------
export function createEmptyData() {
  return { version: DATA_VERSION, updatedAt: nowIso(), accounts: [], categories: [], links: [] };
}

// Lee los datos guardados. Devuelve null si no hay nada o están corruptos.
export function loadData() {
  const raw = safeGet(DATA_KEY);
  if (!raw) return null;
  const parsed = safeParse(raw);
  if (!parsed) {
    console.warn('[storage] Datos locales corruptos, se ignoran.');
    return null;
  }
  try {
    return migrateData(parsed);
  } catch (error) {
    console.warn('[storage] Formato de datos no reconocido:', error);
    return null;
  }
}

export function saveData(data) {
  return safeSet(DATA_KEY, JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// Migración y validación
// Convierte cualquier versión anterior al formato actual y descarta
// registros inválidos o huérfanos. Se usará también al importar (fase 5).
// Lanza un error si el objeto no parece un archivo de Tab Manager.
// ---------------------------------------------------------------------------
export function migrateData(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('El contenido no es un objeto de datos.');
  }

  const version = Number(input.version ?? 1);
  if (version > DATA_VERSION) {
    throw new Error(`Los datos usan una versión más nueva (${version}) que esta app (${DATA_VERSION}).`);
  }

  // Aquí se encadenarán las migraciones futuras, p. ej.:
  // if (version < 2) data = migrateV1toV2(data);

  if (!Array.isArray(input.accounts) || !Array.isArray(input.categories) || !Array.isArray(input.links)) {
    throw new Error('Faltan las listas de cuentas, categorías o enlaces.');
  }

  const str = (value, fallback = '') => (typeof value === 'string' ? value : fallback);
  const num = (value, fallback) => (Number.isFinite(value) ? value : fallback);

  const accounts = input.accounts
    .filter((a) => a && typeof a.id === 'string' && str(a.name).trim())
    .map((a, index) => ({
      id: a.id,
      name: str(a.name).trim(),
      email: str(a.email).trim(),
      color: isValidColor(a.color) ? a.color : DEFAULT_COLOR,
      order: num(a.order, index),
    }));
  const accountIds = new Set(accounts.map((a) => a.id));

  const categories = input.categories
    .filter((c) => c && typeof c.id === 'string' && accountIds.has(c.accountId) && str(c.name).trim())
    .map((c, index) => ({
      id: c.id,
      accountId: c.accountId,
      name: str(c.name).trim(),
      color: isValidColor(c.color) ? c.color : DEFAULT_COLOR,
      order: num(c.order, index),
    }));
  const categoryIds = new Set(categories.map((c) => c.id));

  const links = input.links
    .filter((l) => l && typeof l.id === 'string' && categoryIds.has(l.categoryId) && str(l.url))
    .map((l, index) => ({
      id: l.id,
      categoryId: l.categoryId,
      url: l.url,
      title: str(l.title).trim() || defaultTitle(l.url),
      favicon: str(l.favicon) || faviconUrl(l.url),
      note: str(l.note),
      status: isValidStatus(l.status) ? l.status : DEFAULT_STATUS,
      createdAt: str(l.createdAt) || nowIso(),
      order: num(l.order, index),
    }));

  return {
    version: DATA_VERSION,
    updatedAt: str(input.updatedAt) || nowIso(),
    accounts,
    categories,
    links,
  };
}

// ===========================================================================
// EXPORTAR / IMPORTAR
// ===========================================================================
export const EXPORT_APP_ID = 'tab-manager';

// Serializa los datos para un archivo o el Gist (con metadatos de origen)
export function serializeData(data) {
  return JSON.stringify(
    {
      app: EXPORT_APP_ID,
      exportedAt: new Date().toISOString(),
      version: data.version,
      updatedAt: data.updatedAt,
      accounts: data.accounts,
      categories: data.categories,
      links: data.links,
    },
    null,
    2,
  );
}

// Nombre del archivo de exportación: tab-manager-2026-10-03.json
export function exportFileName(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `tab-manager-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

// Descarga un texto como archivo
export function downloadTextFile(text, fileName, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Interpreta el contenido de un archivo importado. Lanza un Error con un
// mensaje en español si no es válido.
export function parseImportedText(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  if (parsed?.app && parsed.app !== EXPORT_APP_ID) {
    throw new Error('El archivo no parece una copia de Tab Manager.');
  }
  return migrateData(parsed);
}

// ---------------------------------------------------------------------------
// Copia de seguridad automática antes de reemplazar los datos (importar o
// descargar de la nube), para poder deshacerlo.
// ---------------------------------------------------------------------------
export function saveBackup(data, reason) {
  const ok = safeSet(BACKUP_KEY, JSON.stringify({ reason, at: new Date().toISOString(), data }));
  return ok;
}

export function loadBackup() {
  const backup = safeParse(safeGet(BACKUP_KEY));
  if (!backup?.data) return null;
  try {
    return { reason: backup.reason, at: backup.at, data: migrateData(backup.data) };
  } catch {
    return null;
  }
}

export function clearBackup() {
  safeRemove(BACKUP_KEY);
}

// ===========================================================================
// SINCRONIZACIÓN CON GITHUB GIST
// ===========================================================================
export const GIST_FILE_NAME = 'tab-manager.json';
const GIST_DESCRIPTION = 'Tab Manager — datos sincronizados (no editar a mano)';
const GITHUB_API = 'https://api.github.com';

// Estado local de la sincronización:
// { token, gistId, gistUrl, lastSyncAt, lastLocalUpdatedAt, lastRemoteUpdatedAt }
export function loadSyncSettings() {
  const settings = safeParse(safeGet(SYNC_KEY));
  return settings && typeof settings === 'object' ? settings : {};
}

export function saveSyncSettings(settings) {
  safeSet(SYNC_KEY, JSON.stringify(settings));
}

export function clearSyncSettings() {
  safeRemove(SYNC_KEY);
}

// Error con mensaje para el usuario y el código HTTP (si lo hay)
export class SyncError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'SyncError';
    this.status = status;
  }
}

async function githubRequest(token, path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(`${GITHUB_API}${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new SyncError('No se pudo conectar con GitHub. Comprueba tu conexión.');
  }
  if (response.ok) return { json: await response.json(), headers: response.headers };

  const status = response.status;
  if (status === 401) throw new SyncError('El token no es válido o ha caducado.', status);
  if (status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
    throw new SyncError('Se ha superado el límite de peticiones a GitHub. Inténtalo más tarde.', status);
  }
  if (status === 403 || status === 404) {
    // GitHub responde 404 cuando el token no tiene permiso sobre el recurso
    throw new SyncError(
      path.startsWith('/gists/')
        ? 'No se encontró el Gist o el token no tiene permiso "gist".'
        : 'El token no tiene permiso para usar Gists (necesita el permiso "gist").',
      status,
    );
  }
  throw new SyncError(`GitHub respondió con un error (${status}).`, status);
}

// Comprueba el token y devuelve el usuario y si tiene el permiso "gist"
export async function verifyToken(token) {
  const { json, headers } = await githubRequest(token, '/user');
  const scopes = headers.get('x-oauth-scopes'); // solo en tokens clásicos
  const hasGistScope = scopes === null ? null : scopes.split(',').map((s) => s.trim()).includes('gist');
  return { login: json.login, hasGistScope };
}

// Busca un Gist existente de Tab Manager (para un dispositivo nuevo)
export async function findTabManagerGist(token) {
  for (let page = 1; page <= 5; page++) {
    const { json } = await githubRequest(token, `/gists?per_page=100&page=${page}`);
    const found = json.find((gist) => gist.files && gist.files[GIST_FILE_NAME]);
    if (found) return { id: found.id, url: found.html_url };
    if (json.length < 100) break;
  }
  return null;
}

// Lee los datos del Gist. Devuelve { data, updatedAt, url } o data = null si está vacío.
export async function readGist(token, gistId) {
  const { json } = await githubRequest(token, `/gists/${encodeURIComponent(gistId)}`);
  const file = json.files?.[GIST_FILE_NAME];
  if (!file) return { data: null, url: json.html_url };
  let content = file.content;
  // Los archivos de más de ~1 MB llegan truncados: leer el contenido completo
  if (file.truncated && file.raw_url) {
    try {
      content = await (await fetch(file.raw_url, { cache: 'no-store' })).text();
    } catch {
      throw new SyncError('No se pudo descargar el archivo completo del Gist.');
    }
  }
  try {
    return { data: parseImportedText(content), url: json.html_url };
  } catch (error) {
    throw new SyncError(`El contenido del Gist no es válido: ${error.message}`);
  }
}

// Crea un Gist privado con los datos
export async function createGist(token, data) {
  const { json } = await githubRequest(token, '/gists', {
    method: 'POST',
    body: {
      description: GIST_DESCRIPTION,
      public: false,
      files: { [GIST_FILE_NAME]: { content: serializeData(data) } },
    },
  });
  return { id: json.id, url: json.html_url };
}

// Sobrescribe el archivo del Gist (GitHub conserva el historial de revisiones)
export async function updateGist(token, gistId, data) {
  const { json } = await githubRequest(token, `/gists/${encodeURIComponent(gistId)}`, {
    method: 'PATCH',
    body: { files: { [GIST_FILE_NAME]: { content: serializeData(data) } } },
  });
  return { id: json.id, url: json.html_url };
}

