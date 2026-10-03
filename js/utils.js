// ============================================================================
// utils.js — Funciones auxiliares, constantes compartidas e iconos
// ============================================================================

import { h } from 'vue';

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

// Opciones de tema disponibles
export const THEME_OPTIONS = [
  { id: 'system', label: 'Sistema', icon: 'monitor' },
  { id: 'light', label: 'Claro', icon: 'sun' },
  { id: 'dark', label: 'Oscuro', icon: 'moon' },
];

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
