// ============================================================================
// app.js — Crea y monta la aplicación de Vue
// ============================================================================

import { createApp, computed } from 'vue';
import {
  ui,
  effectiveTheme,
  toggleTheme,
  setSidebarOpen,
  setSettingsOpen,
  findLink,
  resolveConfirm,
  dismissToast,
} from './store.js';
import { AppIcon, BaseModal } from './utils.js';
import Sidebar from './components/Sidebar.js';
import LinkList from './components/LinkList.js';
import LinkForm from './components/LinkForm.js';
import PreviewPanel from './components/PreviewPanel.js';
import Settings from './components/Settings.js';

const App = {
  name: 'App',
  components: { AppIcon, BaseModal, Sidebar, LinkList, LinkForm, PreviewPanel, Settings },
  setup() {
    // Texto accesible del botón de tema: describe la acción, no el estado
    const themeToggleLabel = computed(() =>
      effectiveTheme.value === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro',
    );

    // Enlace en vista previa (la vista previa se implementa en la fase 4)
    const previewLink = computed(() => (ui.previewLinkId ? findLink(ui.previewLinkId) : null));

    return {
      ui,
      effectiveTheme,
      themeToggleLabel,
      previewLink,
      toggleTheme,
      setSidebarOpen,
      setSettingsOpen,
      resolveConfirm,
      dismissToast,
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

      <LinkForm
        v-if="ui.linkForm"
        :link-id="ui.linkForm.linkId"
        :category-id="ui.linkForm.categoryId"
        :bulk="ui.linkForm.bulk"
        @close="ui.linkForm = null"
      />

      <Settings v-if="ui.settingsOpen" @close="setSettingsOpen(false)" />

      <!-- Diálogo de confirmación (por encima de cualquier otro modal) -->
      <BaseModal
        v-if="ui.confirm"
        :title="ui.confirm.title"
        layer="top"
        role="alertdialog"
        @close="resolveConfirm(false)"
      >
        <div class="modal__body">
          <p>{{ ui.confirm.message }}</p>
        </div>
        <template #footer>
          <button type="button" class="btn" data-autofocus @click="resolveConfirm(false)">Cancelar</button>
          <button
            type="button"
            class="btn"
            :class="ui.confirm.danger ? 'btn--danger-solid' : 'btn--primary'"
            @click="resolveConfirm(true)"
          >{{ ui.confirm.confirmLabel }}</button>
        </template>
      </BaseModal>

      <!-- Avisos breves -->
      <div class="toast-region" aria-live="polite" aria-atomic="true">
        <div v-if="ui.toast" :key="ui.toast.id" class="toast" :class="'toast--' + ui.toast.kind" role="status">
          <span>{{ ui.toast.message }}</span>
          <button type="button" class="icon-btn icon-btn--sm" aria-label="Cerrar aviso" @click="dismissToast">
            <AppIcon name="close" size="sm" />
          </button>
        </div>
      </div>
    </div>
  `,
};

createApp(App).mount('#app');
