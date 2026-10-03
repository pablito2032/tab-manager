// ============================================================================
// LinkList.js — Enlaces de la selección actual, agrupados por categoría
// (como los grupos de pestañas). Vista en tarjetas o en lista, búsqueda,
// filtro por estado y arrastrar y soltar con SortableJS.
// ============================================================================

import { computed } from 'vue';
import Sortable from 'sortablejs';
import {
  data,
  ui,
  currentView,
  linksByCategory,
  visibleLinksByCategory,
  pendingByCategory,
  statusCounts,
  activeTerms,
  isFiltering,
  findAccount,
  findCategory,
  setViewMode,
  setStatusFilter,
  clearFilters,
  moveLink,
  openAccountForm,
  openCategoryForm,
  openLinkForm,
  openLinks,
  loadSampleData,
  confirmAction,
  showToast,
} from '../store.js';
import { AppIcon, LINK_STATUSES } from '../utils.js';
import LinkItem from './LinkItem.js';

// A partir de cuántas pestañas se pide confirmación al "Abrir todos"
const OPEN_ALL_CONFIRM_THRESHOLD = 8;

// Etiquetas en plural para los botones del filtro
const FILTER_LABELS = { pending: 'Pendientes', seen: 'Vistos', saved: 'Guardados' };

// ---------------------------------------------------------------------------
// Directiva v-sortable: convierte una lista de enlaces en zona de arrastre.
// SortableJS mueve el nodo en el DOM; para no pelearse con Vue, al soltar
// se devuelve el nodo a su sitio original y se actualizan los datos, que
// Vue vuelve a pintar en el orden correcto.
// ---------------------------------------------------------------------------
const vSortable = {
  mounted(el) {
    let originalNext = null;
    el._sortable = Sortable.create(el, {
      group: 'links',               // permite mover entre categorías
      handle: '.link-item__drag',
      draggable: '[data-link-id]',
      animation: 160,
      delayOnTouchOnly: true,       // en táctil, pulsación breve para no
      delay: 120,                   // confundir arrastre con desplazamiento
      emptyInsertThreshold: 24,
      ghostClass: 'is-ghost',
      chosenClass: 'is-chosen',
      dragClass: 'is-dragging-item',
      onStart(event) {
        originalNext = event.item.nextSibling;
        ui.draggingLinkId = event.item.dataset.linkId;
      },
      onEnd(event) {
        // Se limpia en el siguiente ciclo para que la barra lateral pueda
        // leer el id en su evento "drop" (que llega antes)
        setTimeout(() => (ui.draggingLinkId = null));
        const { item, from, to, oldIndex, newIndex } = event;
        if (from === to && oldIndex === newIndex) return;

        // Vecinos visibles en la posición de destino
        const siblings = [...to.querySelectorAll(':scope > [data-link-id]')];
        const index = siblings.indexOf(item);
        const beforeId = siblings[index + 1]?.dataset.linkId ?? null;
        const afterId = siblings[index - 1]?.dataset.linkId ?? null;

        // Deshacer el movimiento del DOM y dejar que Vue lo pinte
        from.insertBefore(item, originalNext);

        const linkId = item.dataset.linkId;
        const categoryId = to.dataset.categoryId;
        const moved = moveLink(linkId, categoryId, { beforeId, afterId });
        if (moved && from !== to) showToast(`Movido a "${findCategory(categoryId)?.name}"`);
      },
    });
  },
  unmounted(el) {
    el._sortable?.destroy();
  },
};

export default {
  name: 'LinkList',
  components: { AppIcon, LinkItem },
  directives: { sortable: vSortable },
  setup() {
    const view = currentView;
    const hasAccounts = computed(() => data.accounts.length > 0);
    const hasCategories = computed(() => data.categories.length > 0);

    // Categorías a pintar: con filtros activos se ocultan las que no tienen coincidencias
    const visibleCategories = computed(() =>
      isFiltering.value
        ? view.value.categories.filter((c) => (visibleLinksByCategory.value.get(c.id) ?? []).length > 0)
        : view.value.categories,
    );
    const noResults = computed(
      () => isFiltering.value && view.value.categories.length > 0 && visibleCategories.value.length === 0,
    );

    const filterOptions = computed(() => [
      { id: 'all', label: 'Todos', count: statusCounts.value.all },
      ...LINK_STATUSES.map((s) => ({ id: s.id, label: FILTER_LABELS[s.id], count: statusCounts.value[s.id] })),
    ]);

    const linkCountLabel = (count) => (count === 1 ? '1 enlace' : `${count} enlaces`);
    const pendingLabel = (count) => (count === 1 ? '1 pendiente' : `${count} pendientes`);

    async function openAll(category) {
      // Se abren los enlaces visibles (respeta búsqueda y filtro)
      const links = visibleLinksByCategory.value.get(category.id) ?? [];
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
      visibleCategories,
      noResults,
      filterOptions,
      linksByCategory,
      visibleLinksByCategory,
      pendingByCategory,
      activeTerms,
      isFiltering,
      findAccount,
      linkCountLabel,
      pendingLabel,
      setViewMode,
      setStatusFilter,
      clearFilters,
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
          <button type="button" class="btn" @click="openLinkForm({ bulk: true })">
            <AppIcon name="tabs" size="sm" />
            <span class="btn__label--wide">Añadir varios</span>
          </button>
          <button type="button" class="btn btn--primary" aria-keyshortcuts="n" @click="openLinkForm()">
            <AppIcon name="plus" size="sm" />
            <span>Nuevo enlace</span>
          </button>
        </div>
      </header>

      <!-- Barra de filtros y modo de vista -->
      <div v-if="hasCategories && view.categories.length" class="toolbar">
        <div class="segmented segmented--scroll" role="group" aria-label="Filtrar por estado">
          <button
            v-for="option in filterOptions"
            :key="option.id"
            type="button"
            class="segmented__option"
            :aria-pressed="ui.statusFilter === option.id ? 'true' : 'false'"
            @click="setStatusFilter(option.id)"
          >
            {{ option.label }}
            <span class="segmented__count">{{ option.count }}</span>
          </button>
        </div>

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
      </div>

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

      <!-- Nada coincide con la búsqueda o el filtro -->
      <div v-else-if="noResults" class="empty-state" role="status">
        <AppIcon name="search" class="empty-state__icon" />
        <h2 class="empty-state__title">No hay enlaces que coincidan</h2>
        <p>Prueba con otras palabras o cambia el filtro de estado.</p>
        <div class="empty-state__actions">
          <button type="button" class="btn" @click="clearFilters()">Quitar búsqueda y filtros</button>
        </div>
      </div>

      <!-- Grupos de enlaces por categoría -->
      <div v-else class="link-groups" :class="{ 'is-dragging': ui.draggingLinkId }">
        <section
          v-for="category in visibleCategories"
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
              <span v-if="view.type === 'all' || view.type === 'search'" class="link-group__account">{{ findAccount(category.accountId)?.name }}</span>
            </h2>
            <span class="link-group__count">
              <template v-if="isFiltering">{{ visibleLinksByCategory.get(category.id)?.length ?? 0 }} de </template>{{ linkCountLabel(linksByCategory.get(category.id)?.length ?? 0) }}
              <template v-if="!isFiltering && pendingByCategory.get(category.id)"> · {{ pendingLabel(pendingByCategory.get(category.id)) }}</template>
            </span>

            <div class="link-group__actions">
              <button
                type="button"
                class="btn btn--ghost btn--sm"
                :disabled="!visibleLinksByCategory.get(category.id)?.length"
                @click="openAll(category)"
              >
                <AppIcon name="external" size="sm" />
                <span class="btn__label--wide">{{ isFiltering ? 'Abrir estos' : 'Abrir todos' }}</span>
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

          <!-- La lista existe siempre (aunque esté vacía) para poder soltar enlaces en ella -->
          <ul
            v-sortable
            class="link-grid"
            :class="{
              'link-grid--list': ui.viewMode === 'list',
              'link-grid--empty': !visibleLinksByCategory.get(category.id)?.length,
            }"
            :data-category-id="category.id"
            :aria-label="'Enlaces de ' + category.name"
          >
            <li v-for="link in visibleLinksByCategory.get(category.id)" :key="link.id" :data-link-id="link.id">
              <LinkItem :link="link" :terms="activeTerms" />
            </li>
          </ul>
          <p v-if="!visibleLinksByCategory.get(category.id)?.length && !ui.draggingLinkId" class="link-group__empty">
            Sin enlaces todavía. Arrastra uno aquí o
            <button type="button" class="link-button" @click="openLinkForm({ categoryId: category.id })">añade el primero</button>.
          </p>
        </section>
      </div>
    </section>
  `,
};
