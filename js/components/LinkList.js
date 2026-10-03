// ============================================================================
// LinkList.js — Lista / tarjetas de enlaces, búsqueda y filtros
// Fase 1: cabecera, estado vacío y muestra de la paleta pastel para
// comprobar visualmente ambos temas. Se sustituye en las fases 2 y 3.
// ============================================================================

import { AppIcon, PASTEL_COLORS } from '../utils.js';

export default {
  name: 'LinkList',
  components: { AppIcon },
  setup() {
    return { colors: PASTEL_COLORS };
  },
  template: `
    <section aria-labelledby="link-list-title">
      <header class="page-header">
        <div>
          <h1 id="link-list-title" class="page-header__title">Todos los enlaces</h1>
          <p class="page-header__subtitle">Tus pestañas pendientes, organizadas en un solo lugar.</p>
        </div>
        <button type="button" class="btn btn--primary" disabled>
          <AppIcon name="plus" size="sm" />
          Nuevo enlace
        </button>
      </header>

      <div class="empty-state">
        <AppIcon name="link" class="empty-state__icon" />
        <h2 class="empty-state__title">Todavía no hay enlaces</h2>
        <p>Cuando añadas cuentas, categorías y enlaces aparecerán aquí.</p>
      </div>

      <!-- Muestra temporal de la paleta (fase 1) -->
      <section style="margin-top: var(--space-10)" aria-labelledby="palette-title">
        <h2 id="palette-title" class="settings-group__title" style="margin-bottom: var(--space-3)">
          Paleta de categorías
        </h2>
        <ul class="palette-demo">
          <li v-for="color in colors" :key="color.id" class="palette-demo__item" :data-color="color.id">
            <span class="color-dot"></span>
            {{ color.label }}
          </li>
        </ul>
      </section>
    </section>
  `,
};
