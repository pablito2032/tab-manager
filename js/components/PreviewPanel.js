// ============================================================================
// PreviewPanel.js — Vista previa bajo demanda de un enlace
// ----------------------------------------------------------------------------
// Orden de intentos:
//   1. "En vivo": la página en un <iframe> con sandbox (o su versión
//      incrustable: YouTube, Vimeo, Spotify, Google Docs/Drive…).
//   2. "Resumen": si la web no permite mostrarse en un iframe (se sabe de
//      antemano, no responde a tiempo o el usuario indica que no se ve):
//      tarjeta con título, descripción e imagen (microlink.io / noembed)
//      y captura de pantalla (thum.io).
//   3. Siempre: botón "Abrir en pestaña nueva".
// Nota: el navegador no avisa cuando un iframe es bloqueado por
// X-Frame-Options/CSP (el evento "load" llega igual), por eso se combina
// una lista de sitios conocidos, un tiempo de espera y la indicación del
// usuario, que se recuerda por dominio.
// ============================================================================

import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import {
  ui,
  frameBlockedHosts,
  markFrameBlocked,
  unmarkFrameBlocked,
  closePreview,
  setLinkStatus,
  requestTitles,
  findCategory,
} from '../store.js';
import {
  AppIcon,
  getDomain,
  getPreviewSource,
  fetchPageMetadata,
  screenshotUrl,
  isPrivateUrl,
  canFetchTitle,
} from '../utils.js';

// Tiempo máximo de espera del iframe antes de pasar al resumen
const FRAME_TIMEOUT_MS = 12000;

// Mensajes que explican por qué se muestra el resumen
const SUMMARY_REASONS = {
  blocked: 'Este sitio no permite mostrarse dentro de otras páginas.',
  insecure: 'La página usa http (sin cifrar) y el navegador no permite mostrarla aquí.',
  timeout: 'La página no respondió a tiempo.',
  user: 'Marcaste que este sitio no se ve en vivo.',
  private: 'Es una página privada: solo se puede ver con tu sesión iniciada, así que ábrela en una pestaña nueva.',
  invalid: 'La dirección no es válida.',
};

export default {
  name: 'PreviewPanel',
  components: { AppIcon },
  props: {
    link: { type: Object, required: true },
  },
  setup(props) {
    const headingRef = ref(null);
    const host = computed(() => getDomain(props.link.url));
    const source = computed(() => getPreviewSource(props.link.url));
    const category = computed(() => findCategory(props.link.categoryId));
    const isPrivate = computed(() => isPrivateUrl(props.link.url));
    const canEmbedLive = computed(() => source.value.mode !== 'summary');

    // ---- Modo inicial ----
    function initialReason() {
      if (source.value.mode === 'summary') return isPrivate.value ? 'private' : source.value.reason;
      if (source.value.mode === 'frame' && frameBlockedHosts.has(host.value)) return 'user';
      return null;
    }
    const summaryReason = ref(initialReason());
    const mode = ref(summaryReason.value ? 'summary' : 'live'); // 'live' | 'summary'

    // ---- En vivo ----
    const frameLoaded = ref(false);
    let frameTimer = null;

    function startFrameTimer() {
      clearTimeout(frameTimer);
      frameLoaded.value = false;
      frameTimer = setTimeout(() => {
        if (!frameLoaded.value && mode.value === 'live') showSummary('timeout');
      }, FRAME_TIMEOUT_MS);
    }

    function onFrameLoad() {
      frameLoaded.value = true;
      clearTimeout(frameTimer);
    }

    // El usuario indica que la página no se ve: recordar el dominio
    function reportNotVisible() {
      if (source.value.mode === 'frame') markFrameBlocked(host.value);
      showSummary('user');
    }

    function showLive() {
      if (!canEmbedLive.value) return;
      if (summaryReason.value === 'user') unmarkFrameBlocked(host.value);
      summaryReason.value = null;
      mode.value = 'live';
      startFrameTimer();
    }

    // ---- Resumen ----
    const meta = ref(null);
    const metaState = ref('idle'); // 'idle' | 'loading' | 'done' | 'error' | 'unavailable'
    const shotState = ref('loading'); // 'loading' | 'done' | 'error'
    const imageFailed = ref(false);
    const canScreenshot = computed(() => !isPrivate.value && /^https?:/.test(props.link.url));

    async function loadSummary() {
      if (metaState.value !== 'idle') return;
      if (!canFetchTitle(props.link.url)) {
        metaState.value = 'unavailable';
        return;
      }
      metaState.value = 'loading';
      const result = await fetchPageMetadata(props.link.url);
      meta.value = result;
      metaState.value = result ? 'done' : 'error';
    }

    function showSummary(reason = null) {
      clearTimeout(frameTimer);
      if (reason) summaryReason.value = reason;
      mode.value = 'summary';
      loadSummary();
    }

    // ---- Acciones ----
    function markSeen() {
      setLinkStatus(props.link.id, 'seen');
    }

    function onKeydown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closePreview();
      }
    }

    onMounted(async () => {
      if (mode.value === 'live') startFrameTimer();
      else loadSummary();
      // Aprovechar la consulta para completar el título si era automático
      requestTitles([props.link]);
      await nextTick();
      headingRef.value?.focus();
    });

    onBeforeUnmount(() => clearTimeout(frameTimer));

    const reasonText = computed(() => SUMMARY_REASONS[summaryReason.value] ?? '');

    // Webs protegidas por verificaciones anti-bots (Cloudflare…): el servicio
    // de capturas también las ve, así que la captura muestra la verificación
    const isBotChallenge = computed(() =>
      /just a moment|attention required|verify(ing)? you are (a )?human|checking your browser|un momento|security check|ddos protection/i.test(
        meta.value?.title ?? '',
      ),
    );
    const displayDescription = computed(() => meta.value?.description || props.link.note || '');

    return {
      ui,
      headingRef,
      host,
      source,
      category,
      isPrivate,
      canEmbedLive,
      mode,
      frameLoaded,
      summaryReason,
      reasonText,
      isBotChallenge,
      meta,
      metaState,
      shotState,
      imageFailed,
      canScreenshot,
      displayDescription,
      screenshotSrc: computed(() => screenshotUrl(props.link.url)),
      onFrameLoad,
      reportNotVisible,
      showLive,
      showSummary,
      markSeen,
      onKeydown,
      closePreview,
    };
  },
  template: `
    <aside id="preview-panel" class="app-preview preview" aria-labelledby="preview-title" @keydown="onKeydown">
      <header class="preview__header">
        <img
          v-if="link.favicon"
          class="preview__favicon"
          :src="link.favicon"
          alt=""
          width="20"
          height="20"
          referrerpolicy="no-referrer"
          @error="$event.target.style.display = 'none'"
        >
        <div class="preview__heading">
          <h2 id="preview-title" ref="headingRef" class="preview__title" tabindex="-1">{{ link.title }}</h2>
          <p class="preview__meta">
            {{ host }}<template v-if="category"> · {{ category.name }}</template>
          </p>
        </div>
        <button type="button" class="icon-btn" aria-label="Cerrar vista previa" title="Cerrar (Esc)" @click="closePreview">
          <AppIcon name="close" />
        </button>
      </header>

      <!-- Selector de modo -->
      <div class="preview__toolbar">
        <div class="segmented" role="group" aria-label="Tipo de vista previa">
          <button
            type="button"
            class="segmented__option"
            :aria-pressed="mode === 'live' ? 'true' : 'false'"
            :disabled="!canEmbedLive"
            :title="canEmbedLive ? 'Mostrar la página' : 'Este sitio no permite mostrarse aquí'"
            @click="showLive"
          >
            <AppIcon name="globe" size="sm" />
            En vivo
          </button>
          <button
            type="button"
            class="segmented__option"
            :aria-pressed="mode === 'summary' ? 'true' : 'false'"
            @click="showSummary()"
          >
            <AppIcon name="image" size="sm" />
            Resumen
          </button>
        </div>
        <button
          v-if="link.status === 'pending'"
          type="button"
          class="btn btn--ghost btn--sm"
          @click="markSeen"
        >
          <AppIcon name="check" size="sm" />
          Marcar como visto
        </button>
      </div>

      <!-- ---- En vivo ---- -->
      <div v-if="mode === 'live'" class="preview__live">
        <div v-if="!frameLoaded" class="preview__loading" aria-live="polite">
          <span class="spinner" aria-hidden="true"></span>
          Cargando la página…
        </div>
        <iframe
          class="preview__frame"
          :class="{ 'is-loaded': frameLoaded }"
          :src="source.src"
          :title="'Vista previa de ' + link.title"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-presentation"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write"
          allowfullscreen
          referrerpolicy="strict-origin-when-cross-origin"
          @load="onFrameLoad"
        ></iframe>
        <p v-if="source.mode === 'frame'" class="preview__hint">
          ¿Aparece en blanco o con un error?
          <button type="button" class="link-button" @click="reportNotVisible">Ver el resumen</button>
        </p>
        <p v-else-if="source.private" class="preview__hint">
          Para ver documentos privados debes tener la sesión de Google iniciada en este navegador.
        </p>
      </div>

      <!-- ---- Resumen ---- -->
      <div v-else class="preview__summary">
        <p v-if="reasonText" class="preview__notice">
          {{ reasonText }}
          <button
            v-if="summaryReason === 'user' || summaryReason === 'timeout'"
            type="button"
            class="link-button"
            @click="showLive"
          >Intentar en vivo</button>
        </p>

        <!-- Tarjeta de metadatos -->
        <article class="preview-card">
          <img
            v-if="meta?.image && !imageFailed"
            class="preview-card__image"
            :src="meta.image"
            alt=""
            loading="lazy"
            referrerpolicy="no-referrer"
            @error="imageFailed = true"
          >
          <div class="preview-card__body">
            <p v-if="meta?.publisher || meta?.author" class="preview-card__publisher">
              <img
                v-if="meta.logo"
                :src="meta.logo"
                alt=""
                width="16"
                height="16"
                referrerpolicy="no-referrer"
                @error="$event.target.style.display = 'none'"
              >
              {{ [meta.publisher, meta.author].filter(Boolean).join(' · ') }}
            </p>
            <h3 class="preview-card__title">{{ (!isBotChallenge && meta?.title) || link.title }}</h3>
            <p v-if="metaState === 'loading'" class="preview-card__desc preview-card__desc--muted">Buscando información de la página…</p>
            <p v-else-if="isBotChallenge" class="preview-card__desc preview-card__desc--muted">
              Esta web protege su contenido con una verificación anti-bots, así que los servicios externos
              no pueden leerla. Ábrela en una pestaña nueva para verla.
            </p>
            <p v-else-if="displayDescription" class="preview-card__desc">{{ displayDescription }}</p>
            <p v-else-if="metaState === 'unavailable' && !isPrivate" class="preview-card__desc preview-card__desc--muted">
              Las páginas de resultados de búsqueda no se pueden previsualizar.
            </p>
            <p v-else-if="metaState === 'error'" class="preview-card__desc preview-card__desc--muted">
              No se pudo obtener información de la página.
            </p>
            <p class="preview-card__url">{{ link.url }}</p>
          </div>
        </article>

        <!-- Captura de pantalla -->
        <figure v-if="canScreenshot" class="preview-shot">
          <div v-if="shotState === 'loading'" class="preview-shot__placeholder" aria-hidden="true">
            <span class="spinner"></span>
            Generando captura…
          </div>
          <img
            v-show="shotState === 'done'"
            class="preview-shot__image"
            :src="screenshotSrc"
            :alt="'Captura de ' + link.title"
            referrerpolicy="no-referrer"
            @load="shotState = 'done'"
            @error="shotState = 'error'"
          >
          <p v-if="shotState === 'error'" class="preview-shot__error">No se pudo generar la captura.</p>
          <figcaption class="preview-shot__caption">
            <template v-if="isBotChallenge">La captura puede mostrar la verificación anti-bots en lugar de la página. · </template>Captura generada por thum.io
          </figcaption>
        </figure>
      </div>

      <footer class="preview__footer">
        <a class="btn btn--primary btn--block" :href="link.url" target="_blank" rel="noopener noreferrer">
          <AppIcon name="external" size="sm" />
          Abrir en pestaña nueva
        </a>
      </footer>
    </aside>
  `,
};
