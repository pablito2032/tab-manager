// ============================================================================
// store.js — Estado reactivo global
// En la fase 1 solo contiene el estado de interfaz (tema, paneles abiertos).
// Los datos (cuentas, categorías, enlaces) y su CRUD llegan en la fase 2.
// ============================================================================

import { reactive, computed, watchEffect } from 'vue';
import { loadThemePreference, saveThemePreference } from './storage.js';

// Media query del sistema para el modo oscuro
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

// ---------------------------------------------------------------------------
// Estado de interfaz
// ---------------------------------------------------------------------------
export const ui = reactive({
  theme: loadThemePreference(),     // 'system' | 'light' | 'dark'
  systemPrefersDark: darkQuery.matches,
  sidebarOpen: false,               // cajón lateral en móvil
  settingsOpen: false,              // modal de ajustes
  previewLinkId: null,              // enlace mostrado en la vista previa
});

// Tema realmente aplicado ('light' | 'dark') tras resolver 'system'
export const effectiveTheme = computed(() => {
  if (ui.theme === 'system') return ui.systemPrefersDark ? 'dark' : 'light';
  return ui.theme;
});

// Seguir los cambios de preferencia del sistema en vivo
darkQuery.addEventListener('change', (event) => {
  ui.systemPrefersDark = event.matches;
});

// Aplicar el tema al <html> y recordarlo cada vez que cambie.
// En modo 'system' se elimina el atributo y manda la media query del CSS.
watchEffect(() => {
  const root = document.documentElement;
  if (ui.theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', ui.theme);
  }
  saveThemePreference(ui.theme);
});

// ---------------------------------------------------------------------------
// Acciones de interfaz
// ---------------------------------------------------------------------------
export function setTheme(theme) {
  ui.theme = theme;
}

// Botón rápido de la cabecera: alterna entre claro y oscuro respecto al
// tema visible y fija esa elección. Para volver a seguir al sistema se
// usa la opción "Sistema" en Ajustes.
export function toggleTheme() {
  ui.theme = effectiveTheme.value === 'dark' ? 'light' : 'dark';
}

export function setSidebarOpen(open) {
  ui.sidebarOpen = open;
}

export function setSettingsOpen(open) {
  ui.settingsOpen = open;
}
