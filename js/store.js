// ============================================================================
// store.js — Estado reactivo global y operaciones CRUD
// ----------------------------------------------------------------------------
// - `data`: cuentas, categorías y enlaces (lo que se guarda).
// - `ui`: estado de interfaz (tema, selección, modales abiertos…).
// Todas las modificaciones de `data` deben pasar por las funciones de este
// módulo: cada una llama a `touch()`, que actualiza `updatedAt` y programa
// el guardado automático en localStorage.
// ============================================================================

import { reactive, computed, watch, watchEffect } from 'vue';
import {
  DATA_KEY,
  loadData,
  saveData,
  createEmptyData,
  loadThemePreference,
  saveThemePreference,
  loadPrefs,
  savePrefs,
  loadTitleCache,
  saveTitleCache,
  loadFrameBlockedHosts,
  saveFrameBlockedHosts,
  serializeData,
  exportFileName,
  downloadTextFile,
  parseImportedText,
  saveBackup,
  loadBackup,
  clearBackup,
  loadSyncSettings,
  saveSyncSettings,
  clearSyncSettings,
  verifyToken,
  findTabManagerGist,
  readGist,
  createGist,
  updateGist,
  SyncError,
} from './storage.js';
import {
  createId,
  nowIso,
  nextOrder,
  byOrder,
  normalizeUrl,
  getDomain,
  faviconUrl,
  isValidColor,
  isValidStatus,
  nextColor,
  DEFAULT_STATUS,
  defaultTitle,
  isAutoTitle,
  titleFromUrl,
  canFetchTitle,
  fetchPageTitle,
  searchTerms,
  foldText,
  formatDateTime,
} from './utils.js';

// ===========================================================================
// DATOS
// ===========================================================================
export const data = reactive(loadData() ?? createEmptyData());

// ---- Guardado automático (con retardo para agrupar cambios seguidos) ----
const SAVE_DELAY = 300;
let saveTimer = null;
let dirty = false;           // hay cambios sin guardar
let saveErrorShown = false;  // evita repetir el aviso de error

function flushSave() {
  clearTimeout(saveTimer);
  saveTimer = null;
  if (!dirty) return;
  dirty = false;
  const ok = saveData(data);
  if (!ok && !saveErrorShown) {
    saveErrorShown = true;
    showToast('No se pudieron guardar los cambios en este navegador. Exporta una copia de seguridad.', 'error');
  } else if (ok) {
    saveErrorShown = false;
  }
}

function scheduleSave() {
  dirty = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, SAVE_DELAY);
}

// Marca los datos como modificados y programa el guardado
function touch() {
  data.updatedAt = nowIso();
  scheduleSave();
}

// No perder el último cambio si se cierra la pestaña antes del retardo
window.addEventListener('pagehide', flushSave);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushSave();
});

// Sustituye todos los datos (otra pestaña, importación, sincronización…)
export function replaceData(newData, { persist = true } = {}) {
  data.version = newData.version;
  data.updatedAt = newData.updatedAt;
  data.accounts = newData.accounts;
  data.categories = newData.categories;
  data.links = newData.links;
  if (persist) scheduleSave();
}

// Si los datos cambian en otra pestaña, recargarlos aquí
window.addEventListener('storage', (event) => {
  if (event.key !== DATA_KEY) return;
  const incoming = loadData();
  if (!incoming || incoming.updatedAt === data.updatedAt) return;
  // Gana la versión de la otra pestaña: descartar el guardado pendiente
  clearTimeout(saveTimer);
  dirty = false;
  replaceData(incoming, { persist: false });
});

// ---- Consultas derivadas ----
export const sortedAccounts = computed(() => byOrder(data.accounts));

// Map<accountId, categoría[]> ordenadas
export const categoriesByAccount = computed(() => {
  const map = new Map(data.accounts.map((a) => [a.id, []]));
  for (const category of data.categories) map.get(category.accountId)?.push(category);
  for (const [id, list] of map) map.set(id, byOrder(list));
  return map;
});

// Map<categoryId, enlace[]> ordenados
export const linksByCategory = computed(() => {
  const map = new Map(data.categories.map((c) => [c.id, []]));
  for (const link of data.links) map.get(link.categoryId)?.push(link);
  for (const [id, list] of map) map.set(id, byOrder(list));
  return map;
});

// Todas las categorías, agrupadas por el orden de su cuenta
export const allCategoriesSorted = computed(() =>
  sortedAccounts.value.flatMap((account) => categoriesByAccount.value.get(account.id) ?? []),
);

// Contadores de pendientes
export const pendingByCategory = computed(() => {
  const map = new Map();
  for (const link of data.links) {
    if (link.status === 'pending') map.set(link.categoryId, (map.get(link.categoryId) ?? 0) + 1);
  }
  return map;
});

export const pendingByAccount = computed(() => {
  const map = new Map();
  for (const category of data.categories) {
    const count = pendingByCategory.value.get(category.id) ?? 0;
    map.set(category.accountId, (map.get(category.accountId) ?? 0) + count);
  }
  return map;
});

export const totalPending = computed(() => data.links.filter((l) => l.status === 'pending').length);

export const findAccount = (id) => data.accounts.find((a) => a.id === id) ?? null;
export const findCategory = (id) => data.categories.find((c) => c.id === id) ?? null;
export const findLink = (id) => data.links.find((l) => l.id === id) ?? null;

// ---- Cuentas ----
export function createAccount({ name, email = '', color }) {
  const account = {
    id: createId('acc'),
    name: name.trim(),
    email: email.trim(),
    color: isValidColor(color) ? color : nextColor(data.accounts.length),
    order: nextOrder(data.accounts),
  };
  data.accounts.push(account);
  touch();
  return account;
}

export function updateAccount(id, { name, email, color }) {
  const account = findAccount(id);
  if (!account) return;
  if (name !== undefined) account.name = name.trim();
  if (email !== undefined) account.email = email.trim();
  if (color !== undefined && isValidColor(color)) account.color = color;
  touch();
}

// Elimina la cuenta con todas sus categorías y enlaces
export function deleteAccount(id) {
  const categoryIds = new Set(data.categories.filter((c) => c.accountId === id).map((c) => c.id));
  data.links = data.links.filter((l) => !categoryIds.has(l.categoryId));
  data.categories = data.categories.filter((c) => c.accountId !== id);
  data.accounts = data.accounts.filter((a) => a.id !== id);
  touch();
}

// ---- Categorías ----
export function createCategory({ accountId, name, color }) {
  const siblings = data.categories.filter((c) => c.accountId === accountId);
  const category = {
    id: createId('cat'),
    accountId,
    name: name.trim(),
    color: isValidColor(color) ? color : nextColor(data.categories.length),
    order: nextOrder(siblings),
  };
  data.categories.push(category);
  touch();
  return category;
}

export function updateCategory(id, { name, color, accountId }) {
  const category = findCategory(id);
  if (!category) return;
  if (name !== undefined) category.name = name.trim();
  if (color !== undefined && isValidColor(color)) category.color = color;
  // Mover a otra cuenta: se coloca al final de sus categorías
  if (accountId !== undefined && accountId !== category.accountId && findAccount(accountId)) {
    category.order = nextOrder(data.categories.filter((c) => c.accountId === accountId));
    category.accountId = accountId;
  }
  touch();
}

// Elimina la categoría con todos sus enlaces
export function deleteCategory(id) {
  data.links = data.links.filter((l) => l.categoryId !== id);
  data.categories = data.categories.filter((c) => c.id !== id);
  touch();
}

// ---- Enlaces ----

// Busca un enlace con la misma URL (opcionalmente dentro de una categoría)
export function findDuplicateLink(url, { categoryId = null, excludeId = null } = {}) {
  const normalized = normalizeUrl(url);
  if (!normalized) return null;
  return (
    data.links.find(
      (l) => l.url === normalized && l.id !== excludeId && (categoryId === null || l.categoryId === categoryId),
    ) ?? null
  );
}

function buildLink({ categoryId, url, title = '', note = '', status = DEFAULT_STATUS }, order) {
  return {
    id: createId('lnk'),
    categoryId,
    url,
    title: title.trim() || defaultTitle(url),
    favicon: faviconUrl(url),
    note: note.trim(),
    status: isValidStatus(status) ? status : DEFAULT_STATUS,
    createdAt: nowIso(),
    order,
  };
}

// Crea un enlace. Devuelve null si la URL no es válida.
export function createLink({ categoryId, url, title, note, status }) {
  const normalized = normalizeUrl(url);
  if (!normalized || !findCategory(categoryId)) return null;
  const siblings = linksByCategory.value.get(categoryId) ?? [];
  const link = buildLink({ categoryId, url: normalized, title, note, status }, nextOrder(siblings));
  data.links.push(link);
  touch();
  requestTitles([link]);
  return link;
}

// Carga masiva: añade varias URLs a una categoría. Omite las que ya
// existen en esa categoría. Devuelve cuántas se añadieron y omitieron.
export function createLinks(urls, { categoryId, status = DEFAULT_STATUS }) {
  if (!findCategory(categoryId)) return { added: 0, skipped: urls.length };
  const existing = new Set((linksByCategory.value.get(categoryId) ?? []).map((l) => l.url));
  let order = nextOrder(linksByCategory.value.get(categoryId) ?? []);
  let added = 0;
  let skipped = 0;
  const newLinks = [];
  for (const raw of urls) {
    const url = normalizeUrl(raw);
    if (!url || existing.has(url)) {
      skipped++;
      continue;
    }
    existing.add(url);
    const link = buildLink({ categoryId, url, status }, order++);
    data.links.push(link);
    newLinks.push(link);
    added++;
  }
  if (added > 0) touch();
  requestTitles(newLinks);
  return { added, skipped };
}

export function updateLink(id, { url, title, note, status, categoryId }) {
  const link = findLink(id);
  if (!link) return false;
  if (url !== undefined) {
    const normalized = normalizeUrl(url);
    if (!normalized) return false;
    if (normalized !== link.url) {
      link.url = normalized;
      link.favicon = faviconUrl(normalized);
    }
  }
  if (title !== undefined) link.title = title.trim() || defaultTitle(link.url);
  if (note !== undefined) link.note = note.trim();
  if (status !== undefined && isValidStatus(status)) link.status = status;
  // Mover a otra categoría: se coloca al final
  if (categoryId !== undefined && categoryId !== link.categoryId && findCategory(categoryId)) {
    link.order = nextOrder(linksByCategory.value.get(categoryId) ?? []);
    link.categoryId = categoryId;
  }
  touch();
  return true;
}

export function setLinkStatus(id, status) {
  updateLink(id, { status });
}

export function deleteLink(id) {
  data.links = data.links.filter((l) => l.id !== id);
  touch();
}

// Mueve un enlace a una categoría (la misma u otra) y lo coloca antes de
// `beforeId` o después de `afterId`; sin ninguno de los dos, al final.
// Se usa al arrastrar y soltar (los vecinos son los enlaces visibles, así
// funciona aunque haya filtros activos) y al reordenar con el teclado.
export function moveLink(linkId, categoryId, { beforeId = null, afterId = null } = {}) {
  const link = findLink(linkId);
  if (!link || !findCategory(categoryId)) return false;
  const list = (linksByCategory.value.get(categoryId) ?? []).filter((l) => l.id !== linkId);
  let index = list.length;
  if (beforeId) {
    const i = list.findIndex((l) => l.id === beforeId);
    if (i !== -1) index = i;
  } else if (afterId) {
    const i = list.findIndex((l) => l.id === afterId);
    if (i !== -1) index = i + 1;
  }
  list.splice(index, 0, link);
  link.categoryId = categoryId;
  list.forEach((l, i) => (l.order = i));
  touch();
  return true;
}

// Sube (-1) o baja (+1) un enlace una posición entre los visibles
export function moveLinkBy(linkId, delta) {
  const link = findLink(linkId);
  if (!link) return false;
  const visible = visibleLinksByCategory.value.get(link.categoryId) ?? [];
  const index = visible.findIndex((l) => l.id === linkId);
  const neighbor = visible[index + delta];
  if (index === -1 || !neighbor) return false;
  return delta < 0
    ? moveLink(linkId, link.categoryId, { beforeId: neighbor.id })
    : moveLink(linkId, link.categoryId, { afterId: neighbor.id });
}

// ---- Títulos reales de las páginas (en segundo plano) ----
// Los enlaces con título automático (dominio o deducido de la URL) piden su
// título real a un servicio de metadatos. Los resultados, también los
// fallidos, se guardan en caché para no repetir consultas: los servicios
// gratuitos tienen límite diario.
const TITLE_CONCURRENCY = 2;
const TITLE_RETRY_MS = 7 * 24 * 60 * 60 * 1000; // reintentar fallos tras 7 días
const titleCache = loadTitleCache();
const titleQueue = [];
let titleActive = 0;

export const fetchingTitles = reactive(new Set()); // ids en curso (para la interfaz)

function applyFetchedTitle(linkId, url, title) {
  const link = findLink(linkId);
  // Solo si sigue siendo el mismo enlace y el usuario no ha puesto su título
  if (title && link && link.url === url && isAutoTitle(link.title, link.url)) {
    updateLink(linkId, { title });
  }
}

function pumpTitleQueue() {
  while (titleActive < TITLE_CONCURRENCY && titleQueue.length > 0) {
    const linkId = titleQueue.shift();
    const link = findLink(linkId);
    if (!link) continue;
    const url = link.url;
    titleActive++;
    fetchingTitles.add(linkId);
    fetchPageTitle(url)
      .then((title) => {
        titleCache[url] = { title, at: Date.now() };
        saveTitleCache(titleCache);
        applyFetchedTitle(linkId, url, title);
      })
      .finally(() => {
        titleActive--;
        fetchingTitles.delete(linkId);
        pumpTitleQueue();
      });
  }
}

export function requestTitles(links) {
  if (!ui.autoTitles) return;
  for (const link of links) {
    if (!isAutoTitle(link.title, link.url) || !canFetchTitle(link.url)) continue;
    if (titleQueue.includes(link.id) || fetchingTitles.has(link.id)) continue;
    const cached = titleCache[link.url];
    if (cached?.title) {
      applyFetchedTitle(link.id, link.url, cached.title);
      continue;
    }
    if (cached && Date.now() - cached.at < TITLE_RETRY_MS) continue;
    titleQueue.push(link.id);
  }
  pumpTitleQueue();
}

// Consulta manual (botón del formulario): ignora la caché de fallos
export async function lookupTitle(url) {
  const title = await fetchPageTitle(url);
  if (title) {
    titleCache[url] = { title, at: Date.now() };
    saveTitleCache(titleCache);
  }
  return title;
}

// Al arrancar: los enlaces creados antes de esta versión tienen el dominio
// como título; se sustituye por el deducido de la URL si es mejor.
function upgradeLegacyTitles() {
  let changed = false;
  for (const link of data.links) {
    if (link.title !== getDomain(link.url)) continue;
    const better = titleFromUrl(link.url);
    if (better && better !== link.title) {
      link.title = better;
      changed = true;
    }
  }
  if (changed) touch();
}

// Abre varias URLs en pestañas nuevas. El navegador puede bloquear todas
// menos la primera si no se permiten ventanas emergentes para este sitio.
export function openLinks(links) {
  let blocked = 0;
  for (const link of links) {
    const win = window.open(link.url, '_blank');
    if (win) {
      win.opener = null; // equivalente a rel="noopener"
    } else {
      blocked++;
    }
  }
  return { opened: links.length - blocked, blocked };
}

// ---- Datos de ejemplo (para probar la app desde cero) ----
export function loadSampleData() {
  const personal = createAccount({ name: 'Personal', email: '', color: 'sky' });
  const work = createAccount({ name: 'Trabajo', color: 'lavender' });
  const reading = createCategory({ accountId: personal.id, name: 'Para leer', color: 'mint' });
  const videos = createCategory({ accountId: personal.id, name: 'Vídeos', color: 'peach' });
  const docs = createCategory({ accountId: work.id, name: 'Documentación', color: 'periwinkle' });
  createLinks(['https://developer.mozilla.org/es/', 'https://web.dev/learn/css'], { categoryId: reading.id });
  createLinks(['https://www.youtube.com/'], { categoryId: videos.id });
  createLinks(['https://vuejs.org/guide/introduction.html', 'https://sortablejs.github.io/Sortable/'], {
    categoryId: docs.id,
  });
  createLink({
    categoryId: docs.id,
    url: 'https://docs.github.com/es/pages',
    title: 'GitHub Pages',
    note: 'Para publicar Tab Manager',
    status: 'saved',
  });
}

// ===========================================================================
// INTERFAZ
// ===========================================================================
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const prefs = loadPrefs();

export const ui = reactive({
  theme: loadThemePreference(),     // 'system' | 'light' | 'dark'
  systemPrefersDark: darkQuery.matches,
  viewMode: prefs.viewMode === 'list' ? 'list' : 'grid',
  search: '',                       // búsqueda global (no se guarda)
  statusFilter: isValidStatus(prefs.statusFilter) ? prefs.statusFilter : 'all',
  autoTitles: prefs.autoTitles !== false, // obtener títulos reales de las páginas
  draggingLinkId: null,             // enlace que se está arrastrando
  // Qué se muestra en la zona principal: todo, una cuenta o una categoría
  selection: prefs.selection ?? { type: 'all', id: null },
  sidebarOpen: false,               // cajón lateral en móvil
  settingsOpen: false,              // modal de ajustes
  previewLinkId: null,              // enlace mostrado en la vista previa
  // Modales de formularios (null = cerrado)
  accountForm: null,                // { accountId? }
  categoryForm: null,               // { categoryId?, accountId? }
  linkForm: null,                   // { linkId?, categoryId?, bulk? }
  confirm: null,                    // { title, message, confirmLabel, danger, resolve }
  toast: null,                      // { id, message, kind }
  announcement: '',                 // texto para lectores de pantalla
});

// ---- Tema ----
// Tema realmente aplicado ('light' | 'dark') tras resolver 'system'
export const effectiveTheme = computed(() => {
  if (ui.theme === 'system') return ui.systemPrefersDark ? 'dark' : 'light';
  return ui.theme;
});

darkQuery.addEventListener('change', (event) => {
  ui.systemPrefersDark = event.matches;
});

// Aplicar el tema al <html> y recordarlo. En 'system' se elimina el
// atributo y manda la media query del CSS.
watchEffect(() => {
  const root = document.documentElement;
  if (ui.theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', ui.theme);
  }
  saveThemePreference(ui.theme);
});

export function setTheme(theme) {
  ui.theme = theme;
}

// Botón rápido de la cabecera: alterna claro/oscuro y fija la elección.
// Para volver a seguir al sistema se usa la opción "Sistema" en Ajustes.
export function toggleTheme() {
  ui.theme = effectiveTheme.value === 'dark' ? 'light' : 'dark';
}

// ---- Preferencias persistentes ----
watch(
  () => ({
    viewMode: ui.viewMode,
    selection: ui.selection,
    statusFilter: ui.statusFilter,
    autoTitles: ui.autoTitles,
  }),
  (value) => savePrefs(value),
  { deep: true },
);

export function setViewMode(mode) {
  ui.viewMode = mode === 'list' ? 'list' : 'grid';
}

export function setStatusFilter(status) {
  ui.statusFilter = isValidStatus(status) ? status : 'all';
}

export function setAutoTitles(enabled) {
  ui.autoTitles = enabled;
  if (enabled) requestTitles(data.links);
}

// ---- Selección ----
// Elegir algo en la barra lateral limpia la búsqueda para ver su contenido
export function select(type, id = null) {
  ui.selection = { type, id };
  ui.search = '';
  ui.sidebarOpen = false;
}

// ---- Búsqueda y filtros ----
export const activeTerms = computed(() => searchTerms(ui.search));
export const isSearching = computed(() => activeTerms.value.length > 0);
export const isFiltering = computed(() => isSearching.value || ui.statusFilter !== 'all');

// Texto plegado (sin acentos ni mayúsculas) de cada enlace para buscar rápido
const searchIndex = computed(() => {
  const map = new Map();
  for (const link of data.links) map.set(link.id, foldText(`${link.title} ${link.url} ${link.note}`));
  return map;
});

function matchesSearch(link) {
  const terms = activeTerms.value;
  if (terms.length === 0) return true;
  const haystack = searchIndex.value.get(link.id) ?? '';
  return terms.every((term) => haystack.includes(term));
}

function matchesStatus(link) {
  return ui.statusFilter === 'all' || link.status === ui.statusFilter;
}

// Map<categoryId, enlace[]> con búsqueda y filtro de estado aplicados
export const visibleLinksByCategory = computed(() => {
  if (!isFiltering.value) return linksByCategory.value;
  const map = new Map();
  for (const [id, list] of linksByCategory.value) {
    map.set(id, list.filter((link) => matchesStatus(link) && matchesSearch(link)));
  }
  return map;
});

export function clearFilters() {
  ui.search = '';
  ui.statusFilter = 'all';
}

// Si se elimina lo seleccionado, volver a "Todos"
watchEffect(() => {
  const { type, id } = ui.selection;
  const exists =
    type === 'all' ||
    (type === 'account' && data.accounts.some((a) => a.id === id)) ||
    (type === 'category' && data.categories.some((c) => c.id === id));
  if (!exists) ui.selection = { type: 'all', id: null };
});

// Cuenta "activa": la seleccionada, la de la categoría seleccionada o la primera
export const activeAccountId = computed(() => {
  const { type, id } = ui.selection;
  if (type === 'account') return id;
  if (type === 'category') return findCategory(id)?.accountId ?? null;
  return sortedAccounts.value[0]?.id ?? null;
});

// Categoría por defecto al crear un enlace
export const defaultCategoryId = computed(() => {
  const { type, id } = ui.selection;
  if (type === 'category') return id;
  if (type === 'account') return categoriesByAccount.value.get(id)?.[0]?.id ?? null;
  return allCategoriesSorted.value[0]?.id ?? null;
});

// Lo que muestra la zona principal: título y categorías visibles
export const currentView = computed(() => {
  // Con búsqueda activa se busca en todas las cuentas y categorías
  if (isSearching.value) {
    return {
      type: 'search',
      title: 'Resultados de búsqueda',
      subtitle: `Buscando "${ui.search.trim()}" en todas las cuentas`,
      account: null,
      categories: allCategoriesSorted.value,
    };
  }
  const { type, id } = ui.selection;
  if (type === 'category') {
    const category = findCategory(id);
    return {
      type,
      title: category?.name ?? '',
      subtitle: findAccount(category?.accountId)?.name ?? '',
      account: findAccount(category?.accountId),
      categories: category ? [category] : [],
    };
  }
  if (type === 'account') {
    const account = findAccount(id);
    return {
      type,
      title: account?.name ?? '',
      subtitle: account?.email ?? '',
      account,
      categories: categoriesByAccount.value.get(id) ?? [],
    };
  }
  return {
    type: 'all',
    title: 'Todos los enlaces',
    subtitle: 'Tus pestañas pendientes, organizadas en un solo lugar.',
    account: null,
    categories: allCategoriesSorted.value,
  };
});

// ---- Paneles y modales ----
export function setSidebarOpen(open) {
  ui.sidebarOpen = open;
}

export function setSettingsOpen(open) {
  ui.settingsOpen = open;
}

export function openAccountForm(accountId = null) {
  ui.accountForm = { accountId };
}

export function openCategoryForm({ categoryId = null, accountId = null } = {}) {
  ui.categoryForm = { categoryId, accountId: accountId ?? activeAccountId.value };
}

export function openLinkForm({ linkId = null, categoryId = null, bulk = false } = {}) {
  ui.linkForm = { linkId, categoryId: categoryId ?? defaultCategoryId.value, bulk };
}

// ---- Vista previa ----
// Se guarda qué elemento tenía el foco para devolvérselo al cerrar
let previewOpener = null;

export function openPreview(linkId) {
  if (ui.previewLinkId === linkId) return closePreview();
  if (!ui.previewLinkId) previewOpener = document.activeElement;
  ui.previewLinkId = linkId;
}

export function closePreview() {
  ui.previewLinkId = null;
  const opener = previewOpener;
  previewOpener = null;
  if (opener && document.contains(opener)) opener.focus();
}

// Si se elimina el enlace en vista previa, cerrar el panel
watchEffect(() => {
  if (ui.previewLinkId && !data.links.some((l) => l.id === ui.previewLinkId)) ui.previewLinkId = null;
});

// Dominios donde el iframe no funcionó (marcados por el usuario)
export const frameBlockedHosts = reactive(new Set(loadFrameBlockedHosts()));

export function markFrameBlocked(host) {
  if (!host || frameBlockedHosts.has(host)) return;
  frameBlockedHosts.add(host);
  saveFrameBlockedHosts([...frameBlockedHosts]);
}

export function unmarkFrameBlocked(host) {
  if (!frameBlockedHosts.delete(host)) return;
  saveFrameBlockedHosts([...frameBlockedHosts]);
}

export function closeForms() {
  ui.accountForm = null;
  ui.categoryForm = null;
  ui.linkForm = null;
}

// Diálogo de confirmación. Devuelve una promesa que se resuelve a true/false.
export function confirmAction({ title, message, confirmLabel = 'Aceptar', danger = false }) {
  if (ui.confirm) ui.confirm.resolve(false);
  return new Promise((resolve) => {
    ui.confirm = { title, message, confirmLabel, danger, resolve };
  });
}

export function resolveConfirm(result) {
  const dialog = ui.confirm;
  ui.confirm = null;
  dialog?.resolve(result);
}

// Avisos breves ("Enlace eliminado", errores…)
let toastTimer = null;
export function showToast(message, kind = 'info') {
  clearTimeout(toastTimer);
  ui.toast = { id: createId(), message, kind };
  toastTimer = setTimeout(() => (ui.toast = null), kind === 'error' ? 6000 : 3500);
}

// Anuncio solo para lectores de pantalla (región aria-live oculta)
export function announce(message) {
  ui.announcement = '';
  setTimeout(() => (ui.announcement = message), 50);
}

export function dismissToast() {
  clearTimeout(toastTimer);
  ui.toast = null;
}

// Recuento por estado en la vista actual (respeta la búsqueda, no el filtro
// de estado, para que los botones del filtro muestren cuántos hay de cada uno)
export const statusCounts = computed(() => {
  const counts = { all: 0, pending: 0, seen: 0, saved: 0 };
  for (const category of currentView.value.categories) {
    for (const link of linksByCategory.value.get(category.id) ?? []) {
      if (!matchesSearch(link)) continue;
      counts.all++;
      counts[link.status]++;
    }
  }
  return counts;
});

// ===========================================================================
// COPIAS DE SEGURIDAD: EXPORTAR / IMPORTAR / DESHACER
// ===========================================================================
export const backupInfo = reactive({ at: loadBackup()?.at ?? null, reason: loadBackup()?.reason ?? '' });

const dataSummary = (d) =>
  `${d.accounts.length} cuenta(s), ${d.categories.length} categoría(s) y ${d.links.length} enlace(s)`;

// Guarda una copia de los datos actuales antes de sustituirlos
function backupCurrent(reason) {
  if (data.links.length === 0 && data.accounts.length === 0) return; // nada que perder
  if (saveBackup(JSON.parse(JSON.stringify(data)), reason)) {
    backupInfo.at = new Date().toISOString();
    backupInfo.reason = reason;
  }
}

export function exportToFile() {
  downloadTextFile(serializeData(data), exportFileName());
  showToast(`Copia exportada: ${dataSummary(data)}`);
}

// Lee un archivo y devuelve sus datos validados (sin aplicarlos todavía)
export async function readImportFile(file) {
  if (file.size > 20 * 1024 * 1024) throw new Error('El archivo es demasiado grande.');
  const incoming = parseImportedText(await file.text());
  return { data: incoming, summary: dataSummary(incoming) };
}

// Combina: añade lo que no existe (por id) y respeta lo que ya hay.
// Los enlaces cuya URL ya está en la misma categoría tampoco se duplican.
function mergeInto(incoming) {
  const accountIds = new Set(data.accounts.map((a) => a.id));
  const categoryIds = new Set(data.categories.map((c) => c.id));
  const linkIds = new Set(data.links.map((l) => l.id));
  const urlsByCategory = new Set(data.links.map((l) => `${l.categoryId} ${l.url}`));
  let added = 0;
  for (const account of incoming.accounts) {
    if (!accountIds.has(account.id)) {
      data.accounts.push({ ...account, order: nextOrder(data.accounts) });
      added++;
    }
  }
  for (const category of incoming.categories) {
    if (!categoryIds.has(category.id)) {
      const siblings = data.categories.filter((c) => c.accountId === category.accountId);
      data.categories.push({ ...category, order: nextOrder(siblings) });
      added++;
    }
  }
  for (const link of incoming.links) {
    const key = `${link.categoryId} ${link.url}`;
    if (!linkIds.has(link.id) && !urlsByCategory.has(key)) {
      data.links.push({ ...link });
      urlsByCategory.add(key);
      added++;
    }
  }
  return added;
}

export function applyImport(incoming, mode) {
  if (mode === 'replace') {
    backupCurrent('importación');
    replaceData({ ...incoming, updatedAt: nowIso() });
    showToast(`Datos importados: ${dataSummary(incoming)}`);
  } else {
    backupCurrent('combinación');
    const added = mergeInto(incoming);
    touch();
    showToast(added ? `Se añadieron ${added} elemento(s) nuevos` : 'No había nada nuevo que añadir');
  }
  ui.selection = { type: 'all', id: null };
}

export async function restoreBackup() {
  const backup = loadBackup();
  if (!backup) return;
  const ok = await confirmAction({
    title: 'Restaurar copia anterior',
    message: `Se recuperarán los datos guardados antes de la última ${backup.reason} (${formatDateTime(backup.at)}): ${dataSummary(backup.data)}. Los datos actuales se sustituirán.`,
    confirmLabel: 'Restaurar',
  });
  if (!ok) return;
  replaceData({ ...backup.data, updatedAt: nowIso() });
  clearBackup();
  backupInfo.at = null;
  showToast('Copia anterior restaurada');
}

// ===========================================================================
// SINCRONIZACIÓN CON GITHUB GIST
// ----------------------------------------------------------------------------
// Para detectar conflictos se recuerda, tras cada sincronización, la fecha
// de los datos locales y remotos en ese momento:
//   - cambios locales  → data.updatedAt ≠ lastLocalUpdatedAt
//   - cambios remotos  → remote.updatedAt ≠ lastRemoteUpdatedAt
// Si hay cambios en los dos lados, gana la fecha de modificación más
// reciente, previa confirmación del usuario.
// ===========================================================================
const storedSync = loadSyncSettings();

export const sync = reactive({
  token: storedSync.token ?? '',
  login: storedSync.login ?? '',
  gistId: storedSync.gistId ?? '',
  gistUrl: storedSync.gistUrl ?? '',
  lastSyncAt: storedSync.lastSyncAt ?? null,
  lastLocalUpdatedAt: storedSync.lastLocalUpdatedAt ?? null,
  lastRemoteUpdatedAt: storedSync.lastRemoteUpdatedAt ?? null,
  busy: false,   // operación en curso: 'verify' | 'upload' | 'download' | 'sync' | false
  error: '',
  message: '',
});

function persistSync() {
  const { token, login, gistId, gistUrl, lastSyncAt, lastLocalUpdatedAt, lastRemoteUpdatedAt } = sync;
  saveSyncSettings({ token, login, gistId, gistUrl, lastSyncAt, lastLocalUpdatedAt, lastRemoteUpdatedAt });
}

// Sin datos locales (p. ej. un dispositivo nuevo) no hay nada que proteger
const isLocalEmpty = computed(() => data.accounts.length === 0 && data.links.length === 0);
export const hasLocalChanges = computed(() => !isLocalEmpty.value && data.updatedAt !== sync.lastLocalUpdatedAt);

// Ejecuta una operación mostrando estado y errores
async function runSync(kind, task) {
  if (sync.busy) return;
  sync.busy = kind;
  sync.error = '';
  sync.message = '';
  try {
    await task();
  } catch (error) {
    sync.error = error instanceof SyncError ? error.message : `Error inesperado: ${error.message}`;
    // Gist borrado o inaccesible: olvidarlo para crear uno nuevo al subir
    if (error.status === 404 && sync.gistId) {
      sync.gistId = '';
      sync.gistUrl = '';
      sync.lastRemoteUpdatedAt = null;
      persistSync();
    }
  } finally {
    sync.busy = false;
  }
}

export function connectSync(token) {
  return runSync('verify', async () => {
    const clean = token.trim();
    if (!clean) throw new SyncError('Pega tu token de GitHub.');
    const { login, hasGistScope } = await verifyToken(clean);
    if (hasGistScope === false) throw new SyncError('El token es válido pero le falta el permiso "gist".');
    sync.token = clean;
    sync.login = login;
    // Reutilizar el Gist si ya existe (p. ej. creado desde otro dispositivo)
    const existing = await findTabManagerGist(clean);
    sync.gistId = existing?.id ?? '';
    sync.gistUrl = existing?.url ?? '';
    sync.lastSyncAt = null;
    sync.lastLocalUpdatedAt = null;
    sync.lastRemoteUpdatedAt = null;
    persistSync();
    sync.message = existing
      ? `Conectado como ${login}. Se encontró tu Gist de Tab Manager: usa "Descargar" o "Sincronizar".`
      : `Conectado como ${login}. Pulsa "Subir" para crear tu Gist privado.`;
  });
}

export async function disconnectSync() {
  const ok = await confirmAction({
    title: 'Olvidar el token',
    message: 'Se borrará el token de este navegador. Tus datos locales y el Gist en GitHub no se modifican.',
    confirmLabel: 'Olvidar',
    danger: true,
  });
  if (!ok) return;
  clearSyncSettings();
  Object.assign(sync, {
    token: '', login: '', gistId: '', gistUrl: '', lastSyncAt: null,
    lastLocalUpdatedAt: null, lastRemoteUpdatedAt: null, error: '', message: '',
  });
}

function markSynced(remoteUpdatedAt) {
  sync.lastSyncAt = nowIso();
  sync.lastLocalUpdatedAt = data.updatedAt;
  sync.lastRemoteUpdatedAt = remoteUpdatedAt;
  persistSync();
}

async function fetchRemote() {
  if (!sync.gistId) return null;
  const { data: remote, url } = await readGist(sync.token, sync.gistId);
  if (url) sync.gistUrl = url;
  return remote;
}

async function pushToGist() {
  // Asegurar que lo subido es lo último guardado
  const result = sync.gistId
    ? await updateGist(sync.token, sync.gistId, data)
    : await createGist(sync.token, data);
  sync.gistId = result.id;
  sync.gistUrl = result.url;
  markSynced(data.updatedAt);
  sync.message = `Datos subidos (${dataSummary(data)}).`;
}

function pullFromRemote(remote) {
  backupCurrent('descarga desde la nube');
  replaceData(remote);
  markSynced(remote.updatedAt);
  sync.message = `Datos descargados (${dataSummary(remote)}).`;
}

const remoteChanged = (remote) => remote.updatedAt !== sync.lastRemoteUpdatedAt;
const isNewer = (a, b) => new Date(a).getTime() > new Date(b).getTime();

// "Subir": la nube pasa a tener los datos de este navegador
export function syncUpload() {
  return runSync('upload', async () => {
    const remote = await fetchRemote();
    if (remote && remoteChanged(remote) && isNewer(remote.updatedAt, data.updatedAt)) {
      const ok = await confirmAction({
        title: 'La nube tiene cambios más recientes',
        message: `La copia del Gist es del ${formatDateTime(remote.updatedAt)} y la de este navegador del ${formatDateTime(data.updatedAt)}. Si subes, se sobrescribirá (GitHub guarda las versiones anteriores en el historial del Gist).`,
        confirmLabel: 'Subir igualmente',
        danger: true,
      });
      if (!ok) return;
    }
    await pushToGist();
  });
}

// "Descargar": este navegador pasa a tener los datos de la nube
export function syncDownload() {
  return runSync('download', async () => {
    const remote = await fetchRemote();
    if (!remote) throw new SyncError('Todavía no hay datos en la nube. Usa "Subir" primero.');
    if (hasLocalChanges.value && isNewer(data.updatedAt, remote.updatedAt)) {
      const ok = await confirmAction({
        title: 'Tus datos locales son más recientes',
        message: `Los datos de este navegador son del ${formatDateTime(data.updatedAt)} y los del Gist del ${formatDateTime(remote.updatedAt)}. Si descargas, se sustituirán los locales (se guarda una copia para poder deshacerlo).`,
        confirmLabel: 'Descargar igualmente',
        danger: true,
      });
      if (!ok) return;
    }
    pullFromRemote(remote);
  });
}

// "Sincronizar": decide el sentido según qué lado ha cambiado y, si
// cambiaron los dos, según la fecha de última modificación.
export function syncNow() {
  return runSync('sync', async () => {
    const remote = await fetchRemote();
    if (!remote) return pushToGist();
    const localChanged = hasLocalChanges.value;
    const remoteDiffers = remoteChanged(remote);
    if (!localChanged && !remoteDiffers) {
      markSynced(remote.updatedAt);
      sync.message = 'Todo está sincronizado.';
      return;
    }
    if (localChanged && !remoteDiffers) return pushToGist();
    if (!localChanged && remoteDiffers) return pullFromRemote(remote);

    // Conflicto: cambios en ambos lados
    const localWins = isNewer(data.updatedAt, remote.updatedAt);
    const ok = await confirmAction({
      title: 'Cambios en los dos lados',
      message:
        `Este navegador cambió el ${formatDateTime(data.updatedAt)} y la nube el ${formatDateTime(remote.updatedAt)}. ` +
        (localWins
          ? 'La versión más reciente es la de este navegador: se subirá y sobrescribirá la del Gist (queda en su historial).'
          : 'La versión más reciente es la de la nube: se descargará y sustituirá la local (se guarda una copia para poder deshacerlo).'),
      confirmLabel: localWins ? 'Subir la mía' : 'Descargar la de la nube',
    });
    if (!ok) return;
    if (localWins) await pushToGist();
    else pullFromRemote(remote);
  });
}

// ===========================================================================
// ARRANQUE
// ===========================================================================
upgradeLegacyTitles();
requestTitles(data.links.slice(0, 40)); // límite por sesión para cuidar la cuota gratuita
