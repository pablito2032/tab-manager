// ============================================================================
// LinkForm.js — Modal para añadir/editar enlaces, incluida la carga masiva
// ----------------------------------------------------------------------------
// - "Un enlace": URL, título (por defecto el dominio), categoría, estado, nota.
// - "Varios": pegar una lista de URLs (una por línea) en una categoría.
// - Al editar solo se muestra el modo individual.
// ============================================================================

import { ref, reactive, computed } from 'vue';
import {
  sortedAccounts,
  categoriesByAccount,
  findLink,
  findCategory,
  findDuplicateLink,
  createLink,
  createLinks,
  updateLink,
  showToast,
} from '../store.js';
import {
  AppIcon,
  BaseModal,
  LINK_STATUSES,
  DEFAULT_STATUS,
  normalizeUrl,
  getDomain,
  faviconUrl,
  parseUrlList,
} from '../utils.js';

export default {
  name: 'LinkForm',
  components: { AppIcon, BaseModal },
  props: {
    linkId: { type: String, default: null },
    categoryId: { type: String, default: null },
    bulk: { type: Boolean, default: false },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const link = props.linkId ? findLink(props.linkId) : null;
    const mode = ref(link ? 'single' : props.bulk ? 'bulk' : 'single');

    const form = reactive({
      url: link?.url ?? '',
      title: link?.title ?? '',
      note: link?.note ?? '',
      status: link?.status ?? DEFAULT_STATUS,
      categoryId: link?.categoryId ?? props.categoryId ?? '',
      bulkText: '',
    });
    const errors = reactive({ url: '', bulk: '' });

    // El título se rellena con el dominio mientras el usuario no lo edite
    const titleTouched = ref(Boolean(link));

    // Categorías agrupadas por cuenta para el <select> con <optgroup>
    const categoryGroups = computed(() =>
      sortedAccounts.value
        .map((account) => ({ account, categories: categoriesByAccount.value.get(account.id) ?? [] }))
        .filter((group) => group.categories.length > 0),
    );
    const hasCategories = computed(() => categoryGroups.value.length > 0);
    if (!findCategory(form.categoryId)) form.categoryId = categoryGroups.value[0]?.categories[0]?.id ?? '';

    // ---- Modo individual ----
    const normalizedUrl = computed(() => normalizeUrl(form.url));
    const previewFavicon = computed(() => (normalizedUrl.value ? faviconUrl(normalizedUrl.value) : ''));
    const faviconFailed = ref(false);

    const duplicate = computed(() =>
      normalizedUrl.value ? findDuplicateLink(normalizedUrl.value, { excludeId: link?.id ?? null }) : null,
    );
    const duplicateCategory = computed(() => (duplicate.value ? findCategory(duplicate.value.categoryId) : null));

    function onUrlInput() {
      errors.url = '';
      faviconFailed.value = false;
      if (!titleTouched.value) form.title = normalizedUrl.value ? getDomain(normalizedUrl.value) : '';
    }

    // Al salir del campo, mostrar la URL normalizada (con https://)
    function onUrlBlur() {
      if (normalizedUrl.value) form.url = normalizedUrl.value;
    }

    function onTitleInput() {
      titleTouched.value = form.title.trim() !== '';
    }

    // ---- Modo varios ----
    const parsedBulk = computed(() => parseUrlList(form.bulkText));

    // ---- Envío ----
    function submitSingle() {
      if (!normalizedUrl.value) {
        errors.url = form.url.trim() ? 'La URL no parece válida.' : 'Escribe o pega una URL.';
        return;
      }
      const payload = {
        url: normalizedUrl.value,
        title: form.title,
        note: form.note,
        status: form.status,
        categoryId: form.categoryId,
      };
      if (link) {
        updateLink(link.id, payload);
        showToast('Enlace actualizado');
      } else {
        createLink(payload);
        showToast('Enlace añadido');
      }
      emit('close');
    }

    function submitBulk() {
      const { valid } = parsedBulk.value;
      if (valid.length === 0) {
        errors.bulk = 'No se ha encontrado ninguna URL válida.';
        return;
      }
      const { added, skipped } = createLinks(valid, { categoryId: form.categoryId, status: form.status });
      const parts = [added === 1 ? '1 enlace añadido' : `${added} enlaces añadidos`];
      if (skipped) parts.push(skipped === 1 ? '1 ya existía en la categoría' : `${skipped} ya existían en la categoría`);
      showToast(parts.join(' · '));
      emit('close');
    }

    function submit() {
      if (!findCategory(form.categoryId)) return;
      if (mode.value === 'bulk') submitBulk();
      else submitSingle();
    }

    const submitLabel = computed(() => {
      if (link) return 'Guardar';
      if (mode.value === 'bulk') {
        const count = parsedBulk.value.valid.length;
        return count > 1 ? `Añadir ${count} enlaces` : 'Añadir';
      }
      return 'Añadir enlace';
    });

    return {
      link,
      mode,
      form,
      errors,
      statuses: LINK_STATUSES,
      categoryGroups,
      hasCategories,
      previewFavicon,
      faviconFailed,
      duplicate,
      duplicateCategory,
      parsedBulk,
      submitLabel,
      onUrlInput,
      onUrlBlur,
      onTitleInput,
      submit,
    };
  },
  template: `
    <BaseModal :title="link ? 'Editar enlace' : 'Nuevo enlace'" @close="$emit('close')">
      <div v-if="!hasCategories" class="modal__body">
        <p class="empty-state empty-state--compact">Crea primero una cuenta y una categoría para guardar enlaces.</p>
      </div>

      <form v-else id="link-form" class="modal__body" novalidate @submit.prevent="submit">
        <!-- Selector de modo (solo al crear) -->
        <div v-if="!link" class="segmented segmented--full" role="radiogroup" aria-label="Cuántos enlaces">
          <button
            type="button"
            role="radio"
            class="segmented__option"
            :aria-checked="mode === 'single' ? 'true' : 'false'"
            @click="mode = 'single'"
          >
            <AppIcon name="link" size="sm" />
            Un enlace
          </button>
          <button
            type="button"
            role="radio"
            class="segmented__option"
            :aria-checked="mode === 'bulk' ? 'true' : 'false'"
            @click="mode = 'bulk'"
          >
            <AppIcon name="tabs" size="sm" />
            Varios a la vez
          </button>
        </div>

        <!-- ---- Un enlace ---- -->
        <template v-if="mode === 'single'">
          <div class="field">
            <label class="field__label" for="link-url">URL</label>
            <div class="input-with-icon">
              <span class="input-with-icon__icon" aria-hidden="true">
                <img
                  v-if="previewFavicon && !faviconFailed"
                  :src="previewFavicon"
                  alt=""
                  width="20"
                  height="20"
                  referrerpolicy="no-referrer"
                  @error="faviconFailed = true"
                >
                <AppIcon v-else name="link" size="sm" />
              </span>
              <input
                id="link-url"
                v-model="form.url"
                class="input"
                type="text"
                inputmode="url"
                autocomplete="off"
                spellcheck="false"
                placeholder="https://ejemplo.com/articulo"
                required
                data-autofocus
                :aria-invalid="errors.url ? 'true' : 'false'"
                :aria-describedby="errors.url ? 'link-url-error' : (duplicate ? 'link-url-duplicate' : undefined)"
                @input="onUrlInput"
                @blur="onUrlBlur"
              >
            </div>
            <p v-if="errors.url" id="link-url-error" class="field__error" role="alert">{{ errors.url }}</p>
            <p v-else-if="duplicate" id="link-url-duplicate" class="field__warning">
              Este enlace ya está guardado en "{{ duplicateCategory?.name }}".
            </p>
          </div>

          <div class="field">
            <label class="field__label" for="link-title">Título</label>
            <input
              id="link-title"
              v-model="form.title"
              class="input"
              type="text"
              maxlength="200"
              placeholder="Se usará el dominio si lo dejas vacío"
              @input="onTitleInput"
            >
          </div>
        </template>

        <!-- ---- Varios a la vez ---- -->
        <div v-else class="field">
          <label class="field__label" for="link-bulk">URLs (una por línea)</label>
          <textarea
            id="link-bulk"
            v-model="form.bulkText"
            class="textarea textarea--mono"
            rows="8"
            spellcheck="false"
            placeholder="https://ejemplo.com&#10;https://otra-web.org/articulo&#10;wikipedia.org"
            data-autofocus
            :aria-invalid="errors.bulk ? 'true' : 'false'"
            aria-describedby="link-bulk-summary"
            @input="errors.bulk = ''"
          ></textarea>
          <p v-if="errors.bulk" class="field__error" role="alert">{{ errors.bulk }}</p>
          <p id="link-bulk-summary" class="field__hint" aria-live="polite">
            {{ parsedBulk.valid.length === 1 ? '1 URL válida' : parsedBulk.valid.length + ' URLs válidas' }}
            <template v-if="parsedBulk.invalid.length"> · {{ parsedBulk.invalid.length }} no reconocidas: {{ parsedBulk.invalid.slice(0, 3).join(', ') }}<template v-if="parsedBulk.invalid.length > 3">…</template></template>
          </p>
        </div>

        <!-- ---- Campos comunes ---- -->
        <div class="field-row">
          <div class="field">
            <label class="field__label" for="link-category">Categoría</label>
            <select id="link-category" v-model="form.categoryId" class="select">
              <optgroup v-for="group in categoryGroups" :key="group.account.id" :label="group.account.name">
                <option v-for="category in group.categories" :key="category.id" :value="category.id">{{ category.name }}</option>
              </optgroup>
            </select>
          </div>
          <div class="field">
            <label class="field__label" for="link-status">Estado</label>
            <select id="link-status" v-model="form.status" class="select">
              <option v-for="status in statuses" :key="status.id" :value="status.id">{{ status.label }}</option>
            </select>
          </div>
        </div>

        <div v-if="mode === 'single'" class="field">
          <label class="field__label" for="link-note">Nota <span class="field__optional">(opcional)</span></label>
          <textarea
            id="link-note"
            v-model="form.note"
            class="textarea textarea--sm"
            rows="3"
            maxlength="1000"
            placeholder="¿Por qué lo guardas?"
          ></textarea>
        </div>
      </form>

      <template #footer>
        <button type="button" class="btn" @click="$emit('close')">Cancelar</button>
        <button v-if="hasCategories" type="submit" form="link-form" class="btn btn--primary">{{ submitLabel }}</button>
      </template>
    </BaseModal>
  `,
};
