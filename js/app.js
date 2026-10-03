// ============================================================================
// app.js — Crea y monta la aplicación de Vue
// ============================================================================

import { createApp, computed } from 'vue';
import { ui, effectiveTheme, toggleTheme, setSidebarOpen, setSettingsOpen } from './store.js';
import { AppIcon } from './utils.js';
import Sidebar from './components/Sidebar.js';
import LinkList from './components/LinkList.js';
import PreviewPanel from './components/PreviewPanel.js';
import Settings from './components/Settings.js';

const App = {
  name: 'App',
  components: { AppIcon, Sidebar, LinkList, PreviewPanel, Settings },
  setup() {
    // Texto accesible del botón de tema: describe la acción, no el estado
    const themeToggleLabel = computed(() =>
      effectiveTheme.value === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro',
    );

    // Enlace en vista previa (se conectará al store de datos en la fase 2)
    const previewLink = computed(() => null);

    return {
      ui,
      effectiveTheme,
      themeToggleLabel,
      previewLink,
      toggleTheme,
      setSidebarOpen,
      setSettingsOpen,
    };
  },
  template: `
    <div class="app">
      <header class="app-header">
        <button
          type="button"
          class="icon-btn app-header__menu-toggle"
          aria-controls="app-sidebar"
          :aria-expanded="ui.sidebarOpen ? 'true' : 'false'"
          aria-label="Abrir menú de cuentas y categorías"
          @click="setSidebarOpen(!ui.sidebarOpen)"
        >
          <AppIcon name="menu" />
        </button>

        <div class="app-header__brand">
          <img class="app-header__logo" src="assets/icons/favicon.svg" alt="" width="28" height="28">
          <span class="app-header__brand-name">Tab Manager</span>
        </div>

        <div class="app-header__search search-field" role="search">
          <AppIcon name="search" />
          <label for="global-search" class="visually-hidden">Buscar enlaces</label>
          <input
            id="global-search"
            class="input"
            type="search"
            placeholder="Buscar enlaces…"
            title="Busca por título, URL o nota"
            autocomplete="off"
          >
        </div>

        <div class="app-header__actions">
          <button type="button" class="icon-btn" :aria-label="themeToggleLabel" :title="themeToggleLabel" @click="toggleTheme">
            <AppIcon :name="effectiveTheme === 'dark' ? 'sun' : 'moon'" />
          </button>
          <button type="button" class="icon-btn" aria-label="Ajustes" title="Ajustes" @click="setSettingsOpen(true)">
            <AppIcon name="settings" />
          </button>
        </div>
      </header>

      <div class="app-body">
        <Sidebar :open="ui.sidebarOpen" @close="setSidebarOpen(false)" />
        <div
          v-if="ui.sidebarOpen"
          class="app-overlay app-overlay--sidebar"
          aria-hidden="true"
          @click="setSidebarOpen(false)"
        ></div>

        <main id="main-content" class="app-main" tabindex="-1">
          <div class="app-main__inner">
            <LinkList />
          </div>
        </main>

        <PreviewPanel v-if="previewLink" :link="previewLink" @close="ui.previewLinkId = null" />
      </div>

      <Settings v-if="ui.settingsOpen" @close="setSettingsOpen(false)" />
    </div>
  `,
};

createApp(App).mount('#app');
