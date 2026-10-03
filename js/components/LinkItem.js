// ============================================================================
// LinkItem.js — Un enlace (tarjeta o fila)
// Fase 1: esqueleto. Se implementa en la fase 2.
// ============================================================================

export default {
  name: 'LinkItem',
  props: {
    link: { type: Object, required: true },
  },
  template: `
    <article class="card">
      <a :href="link.url" target="_blank" rel="noopener noreferrer">{{ link.title || link.url }}</a>
    </article>
  `,
};
