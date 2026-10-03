// ============================================================================
// PreviewPanel.js — Panel de vista previa bajo demanda
// Fase 1: contenedor y cabecera. La lógica iframe → captura → metadatos
// se implementa en la fase 4.
// ============================================================================

import { AppIcon } from '../utils.js';

export default {
  name: 'PreviewPanel',
  components: { AppIcon },
  props: {
    link: { type: Object, required: true },
  },
  emits: ['close'],
  template: `
    <aside class="app-preview" aria-labelledby="preview-title">
      <header class="preview__header">
        <h2 id="preview-title" class="preview__title">{{ link.title || link.url }}</h2>
        <a
          class="icon-btn"
          :href="link.url"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Abrir en pestaña nueva"
        >
          <AppIcon name="external" />
        </a>
        <button type="button" class="icon-btn" aria-label="Cerrar vista previa" @click="$emit('close')">
          <AppIcon name="close" />
        </button>
      </header>
      <div class="preview__body"></div>
    </aside>
  `,
};
