// ============================================================================
// LinkItem.js — Un enlace, en formato tarjeta o fila (según la vista)
// - Asa de arrastre (SortableJS) que también permite reordenar con las
//   flechas ↑/↓ del teclado.
// - Resalta los términos de la búsqueda en título, dominio y nota.
// ============================================================================

import { ref, computed, nextTick } from 'vue';
import {
  ui,
  fetchingTitles,
  setLinkStatus,
  deleteLink,
  moveLinkBy,
  openLinkForm,
  confirmAction,
  showToast,
  announce,
} from '../store.js';
import { AppIcon, LINK_STATUSES, getDomain, highlightParts } from '../utils.js';

// Pinta un texto con los trozos coincidentes dentro de <mark>
const Highlighted = {
  name: 'Highlighted',
  props: {
    text: { type: String, default: '' },
    terms: { type: Array, default: () => [] },
  },
  setup(props) {
    const parts = computed(() => highlightParts(props.text, props.terms));
    return { parts };
  },
  template: `<template v-for="(part, i) in parts" :key="i"><mark v-if="part.match">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template>`,
};

export default {
  name: 'LinkItem',
  components: { AppIcon, Highlighted },
  props: {
    link: { type: Object, required: true },
    terms: { type: Array, default: () => [] },
  },
  setup(props) {
    // Si el favicon no carga, se muestra la inicial del dominio
    const faviconFailed = ref(false);
    const domain = computed(() => getDomain(props.link.url));
    const initial = computed(() => (domain.value || props.link.title || '?').charAt(0).toUpperCase());
    // Mostrar el dominio aparte salvo que el título sea ya el dominio
    const showDomain = computed(() => props.link.title !== domain.value);
    const statusSelectId = computed(() => `status-${props.link.id}`);
    const isFetchingTitle = computed(() => fetchingTitles.has(props.link.id));

    function onStatusChange(event) {
      setLinkStatus(props.link.id, event.target.value);
    }

    function edit() {
      openLinkForm({ linkId: props.link.id });
    }

    async function remove() {
      const ok = await confirmAction({
        title: 'Eliminar enlace',
        message: `Se eliminará "${props.link.title}". Esta acción no se puede deshacer.`,
        confirmLabel: 'Eliminar',
        danger: true,
      });
      if (!ok) return;
      deleteLink(props.link.id);
      showToast('Enlace eliminado');
    }

    // Reordenar con el teclado desde el asa de arrastre
    async function onHandleKeydown(event) {
      const delta = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }[event.key];
      if (!delta) return;
      event.preventDefault();
      const id = props.link.id;
      if (!moveLinkBy(id, delta)) return;
      announce(delta < 0 ? 'Enlace movido hacia arriba' : 'Enlace movido hacia abajo');
      // Al mover el nodo en el DOM se pierde el foco: devolverlo al asa
      await nextTick();
      document.querySelector(`[data-drag-handle="${id}"]`)?.focus();
    }

    return {
      ui,
      statuses: LINK_STATUSES,
      faviconFailed,
      domain,
      initial,
      showDomain,
      statusSelectId,
      isFetchingTitle,
      onStatusChange,
      edit,
      remove,
      onHandleKeydown,
    };
  },
  template: `
    <article class="link-item" :data-status="link.status">
      <button
        type="button"
        class="link-item__drag"
        :data-drag-handle="link.id"
        :aria-label="'Mover ' + link.title + '. Usa las flechas para reordenar'"
        title="Arrastra para mover · flechas para reordenar"
        @keydown="onHandleKeydown"
      >
        <AppIcon name="grip" size="sm" />
      </button>

      <div class="link-item__favicon" aria-hidden="true">
        <img
          v-if="link.favicon && !faviconFailed"
          :src="link.favicon"
          alt=""
          width="32"
          height="32"
          loading="lazy"
          referrerpolicy="no-referrer"
          @error="faviconFailed = true"
        >
        <span v-else class="link-item__initial">{{ initial }}</span>
      </div>

      <div class="link-item__body">
        <h3 class="link-item__title">
          <a :href="link.url" target="_blank" rel="noopener noreferrer" :title="link.url" draggable="false">
            <Highlighted :text="link.title" :terms="terms" /><span class="visually-hidden"> (se abre en una pestaña nueva)</span>
          </a>
        </h3>
        <p v-if="showDomain || isFetchingTitle" class="link-item__domain">
          <Highlighted :text="domain" :terms="terms" />
          <span v-if="isFetchingTitle" class="link-item__fetching"> · obteniendo título…</span>
        </p>
        <p v-if="link.note" class="link-item__note"><Highlighted :text="link.note" :terms="terms" /></p>
      </div>

      <div class="link-item__footer">
        <label class="visually-hidden" :for="statusSelectId">Estado de {{ link.title }}</label>
        <select
          :id="statusSelectId"
          class="status-select"
          :data-status="link.status"
          :value="link.status"
          @change="onStatusChange"
        >
          <option v-for="status in statuses" :key="status.id" :value="status.id">{{ status.label }}</option>
        </select>

        <div class="link-item__actions">
          <button type="button" class="icon-btn icon-btn--sm" :aria-label="'Editar ' + link.title" title="Editar" @click="edit">
            <AppIcon name="edit" size="sm" />
          </button>
          <button type="button" class="icon-btn icon-btn--sm icon-btn--danger" :aria-label="'Eliminar ' + link.title" title="Eliminar" @click="remove">
            <AppIcon name="trash" size="sm" />
          </button>
        </div>
      </div>
    </article>
  `,
};
