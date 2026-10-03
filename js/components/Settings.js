// ============================================================================
// Settings.js — Modal de ajustes: tema, títulos, exportar/importar y
// sincronización con GitHub Gist
// ============================================================================

import { ref, computed } from 'vue';
import {
  ui,
  data,
  sync,
  backupInfo,
  hasLocalChanges,
  setTheme,
  setAutoTitles,
  exportToFile,
  readImportFile,
  applyImport,
  restoreBackup,
  connectSync,
  disconnectSync,
  syncUpload,
  syncDownload,
  syncNow,
  confirmAction,
} from '../store.js';
import { AppIcon, BaseModal, THEME_OPTIONS, formatDateTime, formatRelative } from '../utils.js';

// Enlace para crear un token clásico con solo el permiso "gist"
const TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=gist&description=Tab%20Manager';

export default {
  name: 'Settings',
  components: { AppIcon, BaseModal },
  emits: ['close'],
  setup() {
    // ---- Tema ----
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

    // ---- Importar ----
    const fileInput = ref(null);
    const pendingImport = ref(null); // { name, data, summary }
    const importError = ref('');

    function chooseFile() {
      importError.value = '';
      fileInput.value?.click();
    }

    async function onFileChange(event) {
      const file = event.target.files?.[0];
      event.target.value = ''; // permitir elegir el mismo archivo otra vez
      if (!file) return;
      try {
        const { data: incoming, summary } = await readImportFile(file);
        pendingImport.value = { name: file.name, data: incoming, summary };
        importError.value = '';
      } catch (error) {
        pendingImport.value = null;
        importError.value = error.message;
      }
    }

    async function confirmImport(mode) {
      const pending = pendingImport.value;
      if (!pending) return;
      if (mode === 'replace' && data.links.length > 0) {
        const ok = await confirmAction({
          title: 'Reemplazar todos los datos',
          message: `Se sustituirán tus datos actuales por los de "${pending.name}". Se guardará una copia para poder deshacerlo.`,
          confirmLabel: 'Reemplazar',
          danger: true,
        });
        if (!ok) return;
      }
      applyImport(pending.data, mode);
      pendingImport.value = null;
    }

    // ---- Sincronización ----
    const tokenInput = ref('');
    const showToken = ref(false);

    async function connect() {
      await connectSync(tokenInput.value);
      if (sync.token) tokenInput.value = '';
    }

    const busyLabel = computed(
      () =>
        ({
          verify: 'Comprobando el token…',
          upload: 'Subiendo…',
          download: 'Descargando…',
          sync: 'Sincronizando…',
        })[sync.busy] ?? '',
    );

    return {
      ui,
      data,
      sync,
      backupInfo,
      hasLocalChanges,
      setTheme,
      setAutoTitles,
      themeOptions: THEME_OPTIONS,
      themeOptionRefs,
      onThemeKeydown,
      exportToFile,
      fileInput,
      pendingImport,
      importError,
      chooseFile,
      onFileChange,
      confirmImport,
      restoreBackup,
      tokenInput,
      showToken,
      connect,
      disconnectSync,
      syncUpload,
      syncDownload,
      syncNow,
      busyLabel,
      tokenUrl: TOKEN_URL,
      formatDateTime,
      formatRelative,
    };
  },
  template: `
    <BaseModal title="Ajustes" @close="$emit('close')">
      <div class="modal__body">
        <!-- ================= Apariencia ================= -->
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

        <!-- ================= Títulos ================= -->
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

        <!-- ================= Copia de seguridad ================= -->
        <section class="settings-group" aria-labelledby="settings-backup-title">
          <div>
            <h3 id="settings-backup-title" class="settings-group__title">Copia de seguridad</h3>
            <p class="settings-group__desc">
              Tus datos se guardan automáticamente en este navegador. Exporta un archivo JSON de vez en
              cuando para no perderlos si se borran los datos del sitio. El token de sincronización no se
              incluye en la copia.
            </p>
          </div>
          <div class="settings-actions">
            <button type="button" class="btn" @click="exportToFile">
              <AppIcon name="download" size="sm" />
              Exportar JSON
            </button>
            <button type="button" class="btn" @click="chooseFile">
              <AppIcon name="upload" size="sm" />
              Importar JSON
            </button>
            <input
              ref="fileInput"
              type="file"
              accept=".json,application/json"
              class="visually-hidden"
              tabindex="-1"
              aria-hidden="true"
              @change="onFileChange"
            >
          </div>

          <p v-if="importError" class="field__error" role="alert">{{ importError }}</p>

          <div v-if="pendingImport" class="import-panel" role="region" aria-label="Importar archivo">
            <p><strong>{{ pendingImport.name }}</strong>: {{ pendingImport.summary }}<template v-if="pendingImport.data.updatedAt">, modificado el {{ formatDateTime(pendingImport.data.updatedAt) }}</template>.</p>
            <p class="settings-group__desc">
              <strong>Combinar</strong> añade lo que no tengas y conserva lo actual.
              <strong>Reemplazar</strong> deja exactamente lo que hay en el archivo.
            </p>
            <div class="settings-actions">
              <button type="button" class="btn btn--primary" @click="confirmImport('merge')">Combinar</button>
              <button type="button" class="btn btn--danger" @click="confirmImport('replace')">Reemplazar todo</button>
              <button type="button" class="btn btn--ghost" @click="pendingImport = null">Cancelar</button>
            </div>
          </div>

          <p v-if="backupInfo.at" class="settings-group__desc">
            Hay una copia de los datos de antes de la última {{ backupInfo.reason }} ({{ formatDateTime(backupInfo.at) }}).
            <button type="button" class="link-button" @click="restoreBackup">Restaurarla</button>
          </p>
        </section>

        <!-- ================= Sincronización ================= -->
        <section class="settings-group" aria-labelledby="settings-sync-title">
          <div>
            <h3 id="settings-sync-title" class="settings-group__title">Sincronización con GitHub Gist</h3>
            <p class="settings-group__desc">
              Guarda tus datos en un Gist privado de tu cuenta de GitHub para usarlos en varios dispositivos.
              El token se guarda solo en este navegador.
            </p>
          </div>

          <!-- Sin token: conectar -->
          <form v-if="!sync.token" class="sync-connect" @submit.prevent="connect">
            <ol class="sync-steps">
              <li>
                <a :href="tokenUrl" target="_blank" rel="noopener noreferrer">Crea un token clásico en GitHub</a>
                con solo el permiso <code>gist</code> (elige una caducidad).
              </li>
              <li>Cópialo y pégalo aquí:</li>
            </ol>
            <div class="field">
              <label class="field__label" for="sync-token">Token personal de GitHub</label>
              <div class="input-group">
                <input
                  id="sync-token"
                  v-model="tokenInput"
                  class="input input--mono"
                  :type="showToken ? 'text' : 'password'"
                  autocomplete="off"
                  spellcheck="false"
                  placeholder="ghp_…"
                >
                <button
                  type="button"
                  class="icon-btn"
                  :aria-label="showToken ? 'Ocultar token' : 'Mostrar token'"
                  :aria-pressed="showToken ? 'true' : 'false'"
                  @click="showToken = !showToken"
                >
                  <AppIcon name="eye" size="sm" />
                </button>
              </div>
            </div>
            <div class="settings-actions">
              <button type="submit" class="btn btn--primary" :disabled="Boolean(sync.busy) || !tokenInput.trim()">
                Conectar
              </button>
            </div>
          </form>

          <!-- Con token: estado y acciones -->
          <div v-else class="sync-panel">
            <dl class="sync-status">
              <div>
                <dt>Cuenta</dt>
                <dd>{{ sync.login || '—' }}</dd>
              </div>
              <div>
                <dt>Gist</dt>
                <dd>
                  <a v-if="sync.gistUrl" :href="sync.gistUrl" target="_blank" rel="noopener noreferrer">Ver en GitHub</a>
                  <template v-else>Se creará al subir</template>
                </dd>
              </div>
              <div>
                <dt>Última sincronización</dt>
                <dd>
                  <template v-if="sync.lastSyncAt">
                    <time :datetime="sync.lastSyncAt" :title="formatDateTime(sync.lastSyncAt)">{{ formatRelative(sync.lastSyncAt) }}</time>
                  </template>
                  <template v-else>Nunca</template>
                </dd>
              </div>
              <div>
                <dt>Este navegador</dt>
                <dd>{{ hasLocalChanges ? 'Con cambios sin sincronizar' : 'Sin cambios pendientes' }}</dd>
              </div>
            </dl>

            <div class="settings-actions">
              <button type="button" class="btn btn--primary" :disabled="Boolean(sync.busy)" @click="syncNow">
                <AppIcon name="refresh" size="sm" :class="{ 'is-spinning': sync.busy === 'sync' }" />
                Sincronizar
              </button>
              <button type="button" class="btn" :disabled="Boolean(sync.busy)" @click="syncUpload">
                <AppIcon name="upload" size="sm" />
                Subir
              </button>
              <button type="button" class="btn" :disabled="Boolean(sync.busy) || !sync.gistId" @click="syncDownload">
                <AppIcon name="download" size="sm" />
                Descargar
              </button>
              <button type="button" class="btn btn--ghost" :disabled="Boolean(sync.busy)" @click="disconnectSync">
                Olvidar token
              </button>
            </div>
            <p class="settings-group__desc">
              <strong>Sincronizar</strong> sube o descarga según dónde haya cambios; si cambiaron los dos
              lados, propone quedarse con la versión modificada más recientemente.
            </p>
          </div>

          <div aria-live="polite">
            <p v-if="busyLabel" class="sync-message">
              <span class="spinner" aria-hidden="true"></span>
              {{ busyLabel }}
            </p>
            <p v-else-if="sync.error" class="field__error" role="alert">{{ sync.error }}</p>
            <p v-else-if="sync.message" class="sync-message sync-message--ok">{{ sync.message }}</p>
          </div>
        </section>
      </div>
      <template #footer>
        <button type="button" class="btn" @click="$emit('close')">Cerrar</button>
      </template>
    </BaseModal>
  `,
};
