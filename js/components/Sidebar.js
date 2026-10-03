// ============================================================================
// Sidebar.js — Barra lateral con cuentas y categorías
// Fase 1: estructura y estados vacíos. El CRUD se conecta en la fase 2.
// ============================================================================

import { ref, watch, nextTick } from 'vue';
import { AppIcon } from '../utils.js';

export default {
  name: 'Sidebar',
  components: { AppIcon },
  props: {
    open: { type: Boolean, default: false },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const closeButtonRef = ref(null);

    // Cerrar el cajón con Escape (solo relevante en móvil)
    function onKeydown(event) {
      if (event.key === 'Escape' && props.open) emit('close');
    }

    // Al abrir el cajón en móvil, mover el foco dentro de él
    watch(
      () => props.open,
      async (open) => {
        if (!open) return;
        await nextTick();
        closeButtonRef.value?.focus();
      },
    );

    return { closeButtonRef, onKeydown };
  },
  template: `
    <aside
      id="app-sidebar"
      class="app-sidebar"
      :class="{ 'is-open': open }"
      aria-label="Cuentas y categorías"
      @keydown="onKeydown"
    >
      <div class="sidebar__top">
        <button
          ref="closeButtonRef"
          type="button"
          class="icon-btn"
          aria-label="Cerrar menú"
          @click="$emit('close')"
        >
          <AppIcon name="close" />
        </button>
      </div>

      <section class="sidebar-section" aria-labelledby="sidebar-accounts-title">
        <div class="sidebar-section__header">
          <h2 id="sidebar-accounts-title" class="sidebar-section__title">Cuentas</h2>
          <button type="button" class="icon-btn icon-btn--sm" aria-label="Añadir cuenta" disabled>
            <AppIcon name="plus" size="sm" />
          </button>
        </div>
        <p class="empty-state empty-state--compact">Aún no hay cuentas.</p>
      </section>

      <section class="sidebar-section" aria-labelledby="sidebar-categories-title">
        <div class="sidebar-section__header">
          <h2 id="sidebar-categories-title" class="sidebar-section__title">Categorías</h2>
          <button type="button" class="icon-btn icon-btn--sm" aria-label="Añadir categoría" disabled>
            <AppIcon name="plus" size="sm" />
          </button>
        </div>
        <p class="empty-state empty-state--compact">Crea una cuenta para añadir categorías.</p>
      </section>
    </aside>
  `,
};
