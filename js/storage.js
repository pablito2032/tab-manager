// ============================================================================
// storage.js — Persistencia local (y, en la fase 5, sincronización en la nube)
// ============================================================================

// Claves de localStorage. THEME_KEY debe coincidir con el script en línea
// de index.html que aplica el tema antes de pintar la página.
export const THEME_KEY = 'tabmanager:theme';
export const DATA_KEY = 'tabmanager:data';

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
// Datos (se implementa en la fase 2)
// ---------------------------------------------------------------------------
export function loadData() {
  const raw = safeGet(DATA_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[storage] Datos locales corruptos, se ignoran:', error);
    return null;
  }
}

export function saveData(data) {
  return safeSet(DATA_KEY, JSON.stringify(data));
}
