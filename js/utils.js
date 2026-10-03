// ============================================================================
// utils.js — Funciones auxiliares, constantes compartidas, iconos y el
// componente de modal base (se define aquí para no añadir archivos fuera
// de la estructura acordada).
// ============================================================================

import { h, ref, onMounted, onBeforeUnmount, nextTick } from 'vue';

// ---------------------------------------------------------------------------
// Paleta pastel de categorías. El "id" coincide con [data-color] en
// css/variables.css; el "label" se muestra en los selectores.
// ---------------------------------------------------------------------------
export const PASTEL_COLORS = [
  { id: 'rose', label: 'Rosa' },
  { id: 'peach', label: 'Melocotón' },
  { id: 'yellow', label: 'Amarillo' },
  { id: 'lime', label: 'Lima' },
  { id: 'mint', label: 'Menta' },
  { id: 'teal', label: 'Turquesa' },
  { id: 'sky', label: 'Cielo' },
  { id: 'periwinkle', label: 'Pervinca' },
  { id: 'lavender', label: 'Lavanda' },
  { id: 'gray', label: 'Gris' },
];

export const DEFAULT_COLOR = 'periwinkle';

export function isValidColor(color) {
  return PASTEL_COLORS.some((c) => c.id === color);
}

// Color siguiente de la paleta, para que cada elemento nuevo tenga uno distinto
export function nextColor(count) {
  return PASTEL_COLORS[count % PASTEL_COLORS.length].id;
}

// Opciones de tema disponibles
export const THEME_OPTIONS = [
  { id: 'system', label: 'Sistema', icon: 'monitor' },
  { id: 'light', label: 'Claro', icon: 'sun' },
  { id: 'dark', label: 'Oscuro', icon: 'moon' },
];

// Estados de un enlace. Los valores internos van en inglés; las etiquetas,
// en español.
export const LINK_STATUSES = [
  { id: 'pending', label: 'Pendiente' },
  { id: 'seen', label: 'Visto' },
  { id: 'saved', label: 'Guardado' },
];

export const DEFAULT_STATUS = 'pending';

export function isValidStatus(status) {
  return LINK_STATUSES.some((s) => s.id === status);
}

export function statusLabel(status) {
  return LINK_STATUSES.find((s) => s.id === status)?.label ?? status;
}

// ---------------------------------------------------------------------------
// Iconos SVG (estilo trazo, 24×24). Se pintan con currentColor para que
// hereden el color del texto en ambos temas.
// ---------------------------------------------------------------------------
const ICON_PATHS = {
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 6l12 12M18 6L6 18',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5',
  plus: 'M12 5v14M5 12h14',
  settings:
    'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z' +
    'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  sun:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z' +
    'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  monitor: 'M3 5h18v11H3zM8 21h8M12 16v5',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  tabs: 'M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 8V5a1 1 0 0 1 1-1h5l2 4',
};

// Componente funcional <AppIcon name="..." /> — decorativo (aria-hidden)
export const AppIcon = (props) =>
  h(
    'svg',
    {
      class: ['icon', props.size === 'sm' && 'icon--sm'],
      viewBox: '0 0 24 24',
      'aria-hidden': 'true',
      focusable: 'false',
    },
    [h('path', { d: ICON_PATHS[props.name] || '' })],
  );
AppIcon.props = ['name', 'size'];

// ---------------------------------------------------------------------------
// Utilidades generales
// ---------------------------------------------------------------------------

// Genera un identificador único y corto (con prefijo opcional)
export function createId(prefix = '') {
  const random =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return prefix ? `${prefix}_${random}` : random;
}

// Fecha actual en formato ISO (para createdAt / updatedAt)
export function nowIso() {
  return new Date().toISOString();
}

// Copia profunda de datos serializables en JSON
export function deepClone(value) {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

// Siguiente valor de "order" para añadir un elemento al final de una lista
export function nextOrder(items) {
  return items.reduce((max, item) => Math.max(max, item.order ?? 0), -1) + 1;
}

// Ordena una copia de la lista por su campo "order"
export function byOrder(items) {
  return [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

// ---------------------------------------------------------------------------
// URLs
// ---------------------------------------------------------------------------

// Normaliza lo que escribe el usuario a una URL absoluta válida.
// Añade https:// si falta. Devuelve null si no es una URL web válida.
export function normalizeUrl(input) {
  const text = String(input ?? '').trim();
  if (!text) return null;
  const withProtocol = /^[a-z][a-z\d+\-.]*:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    // Exigir un dominio con punto (o localhost) para descartar texto suelto
    if (!url.hostname.includes('.') && url.hostname !== 'localhost') return null;
    return url.href;
  } catch {
    return null;
  }
}

// Dominio sin "www." — se usa como título por defecto
export function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// URL del favicon mediante el servicio público de Google
export function faviconUrl(url) {
  const domain = getDomain(url);
  return domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64` : '';
}

// Analiza un bloque de texto con una URL por línea (también acepta
// separadas por espacios o comas). Devuelve las válidas sin duplicados y
// las líneas que no se pudieron interpretar.
export function parseUrlList(text) {
  const tokens = String(text ?? '')
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const valid = [];
  const invalid = [];
  const seen = new Set();
  for (const token of tokens) {
    const url = normalizeUrl(token);
    if (!url) {
      invalid.push(token);
    } else if (!seen.has(url)) {
      seen.add(url);
      valid.push(url);
    }
  }
  return { valid, invalid };
}

// ---------------------------------------------------------------------------
// Accesibilidad: mantiene el foco de teclado dentro de un contenedor
// (modales). Se llama desde un manejador de 'keydown' con la tecla Tab.
// ---------------------------------------------------------------------------
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

export function getFocusable(container) {
  return [...container.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

export function trapFocus(event, container) {
  if (event.key !== 'Tab' || !container) return;
  const focusable = getFocusable(container);
  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

// ---------------------------------------------------------------------------
// <BaseModal> — diálogo accesible reutilizable
// - Se teletransporta a <body> (evita problemas con contenedores con
//   transform, como la barra lateral en móvil).
// - Escape y clic fuera cierran; el foco queda atrapado dentro y vuelve al
//   elemento anterior al cerrar.
// - Foco inicial: el primer elemento con [data-autofocus] o el primero
//   enfocable.
// Slots: default (cuerpo), footer.
// ---------------------------------------------------------------------------
export const BaseModal = {
  name: 'BaseModal',
  components: { AppIcon },
  props: {
    title: { type: String, required: true },
    // 'top' coloca el modal por encima de otros (p. ej. confirmaciones)
    layer: { type: String, default: 'base' },
    role: { type: String, default: 'dialog' },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const dialogRef = ref(null);
    const titleId = createId('modal-title');
    const previouslyFocused = document.activeElement;

    function close() {
      emit('close');
    }

    function onKeydown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
        return;
      }
      trapFocus(event, dialogRef.value);
    }

    onMounted(async () => {
      await nextTick();
      const dialog = dialogRef.value;
      if (!dialog) return;
      const target = dialog.querySelector('[data-autofocus]') || getFocusable(dialog)[0] || dialog;
      target.focus();
    });

    onBeforeUnmount(() => {
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    });

    return { dialogRef, titleId, close, onKeydown };
  },
  template: `
    <Teleport to="body">
      <div
        class="modal-backdrop"
        :class="{ 'modal-backdrop--top': layer === 'top' }"
        @mousedown.self="close"
      >
        <div
          ref="dialogRef"
          class="modal"
          :role="role"
          aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
          @keydown="onKeydown"
        >
          <header class="modal__header">
            <h2 :id="titleId" class="modal__title">{{ title }}</h2>
            <button type="button" class="icon-btn" aria-label="Cerrar" @click="close">
              <AppIcon name="close" />
            </button>
          </header>
          <slot />
          <footer v-if="$slots.footer" class="modal__footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Teleport>
  `,
};
