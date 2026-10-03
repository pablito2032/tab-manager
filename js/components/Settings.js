// ============================================================================
// Settings.js — Modal de ajustes: tema, exportar/importar y sincronización
// Exportar/importar y la sincronización en la nube llegan en la fase 5.
// ============================================================================

import { ref } from 'vue';
import { ui, setTheme, setAutoTitles } from '../store.js';
import { AppIcon, BaseModal, THEME_OPTIONS } from '../utils.js';

export default {
  name: 'Settings',
  components: { AppIcon, BaseModal },
  emits: ['close'],
  setup() {
    const themeOptionRefs = ref([]);

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

    return { ui, setTheme, setAutoTitles, themeOptions: THEME_OPTIONS, themeOptionRefs, onThemeKeydown };
  },
  template: `
    <BaseModal title="Ajustes" @close="$emit('close')">
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
              :data-autofocus="ui.theme === option.id ? '' : undefined"
              @click="setTheme(option.id)"
              @keydown="onThemeKeydown($event, index)"
            >
              <AppIcon :name="option.icon" size="sm" />
              {{ option.label }}
            </button>
          </div>
        </section>

        <section class="settings-group" aria-labelledby="settings-titles-title">
          <h3 id="settings-titles-title" class="settings-group__title">Títulos de las páginas</h3>
          <label class="switch">
            <input
              type="checkbox"
              class="switch__input"
              :checked="ui.autoTitles"
              aria-describedby="settings-titles-desc"
              @change="setAutoTitles($event.target.checked)"
            >
            <span class="switch__track" aria-hidden="true"></span>
            <span class="switch__label">Obtener automáticamente el título real</span>
          </label>
          <p id="settings-titles-desc" class="settings-group__desc">
            Para mostrar el nombre del vídeo o del artículo en lugar del dominio, la URL se consulta a
            servicios públicos de metadatos (noembed.com para vídeos, microlink.io para el resto).
            Las búsquedas y los documentos privados (Drive, Docs, Colab) se resuelven a partir
            de la propia URL, sin enviarla a nadie.
          </p>
        </section>

        <section class="settings-group" aria-labelledby="settings-data-title">
          <div>
            <h3 id="settings-data-title" class="settings-group__title">Datos y sincronización</h3>
            <p class="settings-group__desc">
              Tus datos se guardan automáticamente en este navegador. Exportar, importar y sincronizar con
              GitHub Gist estarán disponibles en la fase 5.
            </p>
          </div>
        </section>
      </div>
      <template #footer>
        <button type="button" class="btn" @click="$emit('close')">Cerrar</button>
      </template>
    </BaseModal>
  `,
};
