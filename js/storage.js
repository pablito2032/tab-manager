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
// ============================================================================

import { isValidColor, isValidStatus, DEFAULT_COLOR, DEFAULT_STATUS, faviconUrl, getDomain, nowIso } from './utils.js';

// Claves de localStorage. THEME_KEY debe coincidir con el script en línea
// de index.html que aplica el tema antes de pintar la página.
export const THEME_KEY = 'tabmanager:theme';
export const DATA_KEY = 'tabmanager:data';
export const PREFS_KEY = 'tabmanager:prefs';

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
      title: str(l.title).trim() || getDomain(l.url) || l.url,
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
