// ============================================================================
// LinkList.js — Enlaces de la selección actual, agrupados por categoría
// (como los grupos de pestañas). Vista en tarjetas o en lista.
// La búsqueda y los filtros se añaden en la fase 3.
// ============================================================================

import { computed } from 'vue';
import {
  data,
  ui,
  currentView,
  linksByCategory,
  pendingByCategory,
  findAccount,
  setViewMode,
  openAccountForm,
  openCategoryForm,
  openLinkForm,
  openLinks,
  loadSampleData,
  confirmAction,
  showToast,
} from '../store.js';
import { AppIcon } from '../utils.js';
import LinkItem from './LinkItem.js';

// A partir de cuántas pestañas se pide confirmación al "Abrir todos"
const OPEN_ALL_CONFIRM_THRESHOLD = 8;

export default {
  name: 'LinkList',
  components: { AppIcon, LinkItem },
  setup() {
    const view = currentView;
    const hasAccounts = computed(() => data.accounts.length > 0);
    const hasCategories = computed(() => data.categories.length > 0);

    const linkCountLabel = (count) => (count === 1 ? '1 enlace' : `${count} enlaces`);
    const pendingLabel = (count) => (count === 1 ? '1 pendiente' : `${count} pendientes`);

    async function openAll(category) {
      const links = linksByCategory.value.get(category.id) ?? [];
      if (links.length === 0) return;
      if (links.length > OPEN_ALL_CONFIRM_THRESHOLD) {
        const ok = await confirmAction({
          title: 'Abrir todos',
          message: `Se abrirán ${links.length} pestañas nuevas.`,
          confirmLabel: 'Abrir',
        });
        if (!ok) return;
      }
      const { blocked } = openLinks(links);
      if (blocked > 0) {
        showToast(
          `El navegador bloqueó ${blocked} pestaña(s). Permite las ventanas emergentes para este sitio y vuelve a intentarlo.`,
          'error',
        );
      }
    }

    return {
      ui,
      view,
      hasAccounts,
      hasCategories,
      linksByCategory,
      pendingByCategory,
      findAccount,
      linkCountLabel,
      pendingLabel,
      setViewMode,
      openAccountForm,
      openCategoryForm,
      openLinkForm,
      openAll,
      loadSampleData,
    };
  },
  template: `
    <section aria-labelledby="link-list-title">
      <header class="page-header">
        <div class="page-header__text">
          <h1 id="link-list-title" class="page-header__title">
            <span
              v-if="view.type === 'category'"
              class="color-dot color-dot--lg"
              :data-color="view.categories[0]?.color"
              aria-hidden="true"
            ></span>
            {{ view.title }}
          </h1>
          <p v-if="view.subtitle" class="page-header__subtitle">{{ view.subtitle }}</p>
        </div>

        <div v-if="hasCategories" class="page-header__actions">
          <div class="segmented" role="group" aria-label="Modo de vista">
            <button
              type="button"
              class="segmented__option"
              :aria-pressed="ui.viewMode === 'grid' ? 'true' : 'false'"
              aria-label="Vista en tarjetas"
              title="Tarjetas"
              @click="setViewMode('grid')"
            >
              <AppIcon name="grid" size="sm" />
            </button>
            <button
              type="button"
              class="segmented__option"
              :aria-pressed="ui.viewMode === 'list' ? 'true' : 'false'"
              aria-label="Vista en lista"
              title="Lista"
              @click="setViewMode('list')"
            >
              <AppIcon name="list" size="sm" />
            </button>
          </div>
          <button type="button" class="btn" @click="openLinkForm({ bulk: true })">
            <AppIcon name="tabs" size="sm" />
            <span class="btn__label--wide">Añadir varios</span>
          </button>
          <button type="button" class="btn btn--primary" @click="openLinkForm()">
            <AppIcon name="plus" size="sm" />
            <span>Nuevo enlace</span>
          </button>
        </div>
      </header>

      <!-- Sin cuentas: primer uso -->
      <div v-if="!hasAccounts" class="empty-state">
        <AppIcon name="link" class="empty-state__icon" />
        <h2 class="empty-state__title">Empieza creando una cuenta</h2>
        <p>Las cuentas agrupan tus categorías (por ejemplo, "Personal" y "Trabajo").</p>
        <div class="empty-state__actions">
          <button type="button" class="btn btn--primary" @click="openAccountForm()">
            <AppIcon name="plus" size="sm" />
            Crear cuenta
          </button>
          <button type="button" class="btn" @click="loadSampleData()">Cargar datos de ejemplo</button>
        </div>
      </div>

      <!-- La vista actual no tiene categorías -->
      <div v-else-if="view.categories.length === 0" class="empty-state">
        <AppIcon name="folder" class="empty-state__icon" />
        <h2 class="empty-state__title">Aún no hay categorías</h2>
        <p>Las categorías funcionan como grupos de pestañas. Crea una para empezar a guardar enlaces.</p>
        <div class="empty-state__actions">
          <button type="button" class="btn btn--primary" @click="openCategoryForm({ accountId: view.account?.id })">
            <AppIcon name="plus" size="sm" />
            Crear categoría
          </button>
        </div>
      </div>

      <!-- Grupos de enlaces por categoría -->
      <div v-else class="link-groups">
        <section
          v-for="category in view.categories"
          :key="category.id"
          class="link-group"
          :data-color="category.color"
          :aria-labelledby="'group-title-' + category.id"
        >
          <header class="link-group__header">
            <h2 :id="'group-title-' + category.id" class="link-group__title">
              <span class="link-group__pill">
                <span class="color-dot" aria-hidden="true"></span>
                {{ category.name }}
              </span>
              <span v-if="view.type === 'all'" class="link-group__account">{{ findAccount(category.accountId)?.name }}</span>
            </h2>
            <span class="link-group__count">
              {{ linkCountLabel(linksByCategory.get(category.id)?.length ?? 0) }}
              <template v-if="pendingByCategory.get(category.id)"> · {{ pendingLabel(pendingByCategory.get(category.id)) }}</template>
            </span>

            <div class="link-group__actions">
              <button
                type="button"
                class="btn btn--ghost btn--sm"
                :disabled="!linksByCategory.get(category.id)?.length"
                @click="openAll(category)"
              >
                <AppIcon name="external" size="sm" />
                <span class="btn__label--wide">Abrir todos</span>
              </button>
              <button
                type="button"
                class="icon-btn icon-btn--sm"
                :aria-label="'Añadir enlace a ' + category.name"
                title="Añadir enlace"
                @click="openLinkForm({ categoryId: category.id })"
              >
                <AppIcon name="plus" size="sm" />
              </button>
              <button
                type="button"
                class="icon-btn icon-btn--sm"
                :aria-label="'Editar categoría ' + category.name"
                title="Editar categoría"
                @click="openCategoryForm({ categoryId: category.id })"
              >
                <AppIcon name="edit" size="sm" />
              </button>
            </div>
          </header>

          <ul
            v-if="linksByCategory.get(category.id)?.length"
            class="link-grid"
            :class="{ 'link-grid--list': ui.viewMode === 'list' }"
          >
            <li v-for="link in linksByCategory.get(category.id)" :key="link.id">
              <LinkItem :link="link" />
            </li>
          </ul>
          <p v-else class="link-group__empty">
            Sin enlaces todavía.
            <button type="button" class="link-button" @click="openLinkForm({ categoryId: category.id })">Añade el primero</button>
          </p>
        </section>
      </div>
    </section>
  `,
};
