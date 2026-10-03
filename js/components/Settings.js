// ============================================================================
// Settings.js — Modal de ajustes: tema, exportar/importar y sincronización
// Fase 1: selector de tema. Exportar/importar y nube llegan en la fase 5.
// ============================================================================

import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { ui, setTheme } from '../store.js';
import { AppIcon, THEME_OPTIONS, trapFocus } from '../utils.js';

export default {
  name: 'Settings',
  components: { AppIcon },
  emits: ['close'],
  setup(props, { emit }) {
    const dialogRef = ref(null);
    const themeOptionRefs = ref([]);
    // Elemento que tenía el foco antes de abrir, para devolvérselo al cerrar
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

    // Navegación con flechas dentro del grupo de radio (patrón ARIA radiogroup)
    function onThemeKeydown(event, index) {
      const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      if (!(event.key in keys)) return;
      event.preventDefault();
      const total = THEME_OPTIONS.length;
      const nextIndex = (index + keys[event.key] + total) % total;
      setTheme(THEME_OPTIONS[nextIndex].id);
      themeOptionRefs.value[nextIndex]?.focus();
    }

    onMounted(async () => {
      await nextTick();
      // Foco inicial en la opción de tema seleccionada
      const selected = THEME_OPTIONS.findIndex((opt) => opt.id === ui.theme);
      themeOptionRefs.value[selected]?.focus();
    });

    onBeforeUnmount(() => {
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    });

    return { ui, setTheme, themeOptions: THEME_OPTIONS, dialogRef, themeOptionRefs, close, onKeydown, onThemeKeydown };
  },
  template: `
    <div class="modal-backdrop" @click.self="close">
      <div
        ref="dialogRef"
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        @keydown="onKeydown"
      >
        <header class="modal__header">
          <h2 id="settings-title" class="modal__title">Ajustes</h2>
          <button type="button" class="icon-btn" aria-label="Cerrar ajustes" @click="close">
            <AppIcon name="close" />
          </button>
        </header>

        <div class="modal__body">
          <section class="settings-group" aria-labelledby="settings-theme-title">
            <div>
              <h3 id="settings-theme-title" class="settings-group__title">Apariencia</h3>
              <p class="settings-group__desc">
                "Sistema" sigue la preferencia de tu dispositivo. Tu elección se recuerda en este navegador.
              </p>
            </div>
            <div class="segmented" role="radiogroup" aria-labelledby="settings-theme-title">
              <button
                v-for="(option, index) in themeOptions"
                :key="option.id"
                :ref="(el) => (themeOptionRefs[index] = el)"
                type="button"
                role="radio"
                class="segmented__option"
                :aria-checked="ui.theme === option.id ? 'true' : 'false'"
                :tabindex="ui.theme === option.id ? 0 : -1"
                @click="setTheme(option.id)"
                @keydown="onThemeKeydown($event, index)"
              >
                <AppIcon :name="option.icon" size="sm" />
                {{ option.label }}
              </button>
            </div>
          </section>

          <section class="settings-group" aria-labelledby="settings-data-title">
            <div>
              <h3 id="settings-data-title" class="settings-group__title">Datos y sincronización</h3>
              <p class="settings-group__desc">Exportar, importar y sincronizar con GitHub Gist estarán disponibles próximamente.</p>
            </div>
          </section>
        </div>

        <footer class="modal__footer">
          <button type="button" class="btn" @click="close">Cerrar</button>
        </footer>
      </div>
    </div>
  `,
};
