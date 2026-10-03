// ============================================================================
// Sidebar.js — Barra lateral con cuentas y categorías
// Incluye los formularios (modales) de cuenta y categoría y el selector de
// color pastel que comparten.
// ============================================================================

import { ref, reactive, computed, watch, nextTick } from 'vue';
import {
  data,
  ui,
  sortedAccounts,
  categoriesByAccount,
  linksByCategory,
  pendingByAccount,
  pendingByCategory,
  totalPending,
  findAccount,
  findCategory,
  select,
  createAccount,
  updateAccount,
  deleteAccount,
  createCategory,
  updateCategory,
  deleteCategory,
  openAccountForm,
  openCategoryForm,
  confirmAction,
  showToast,
  findLink,
  moveLink,
} from '../store.js';
import { AppIcon, BaseModal, PASTEL_COLORS, nextColor } from '../utils.js';

// ---------------------------------------------------------------------------
// Selector de color (patrón ARIA radiogroup: flechas para moverse)
// ---------------------------------------------------------------------------
const ColorPicker = {
  name: 'ColorPicker',
  props: {
    modelValue: { type: String, required: true },
    labelledby: { type: String, required: true },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const buttons = ref([]);
    function onKeydown(event, index) {
      const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      if (!(event.key in keys)) return;
      event.preventDefault();
      const total = PASTEL_COLORS.length;
      const next = (index + keys[event.key] + total) % total;
      emit('update:modelValue', PASTEL_COLORS[next].id);
      buttons.value[next]?.focus();
    }
    return { colors: PASTEL_COLORS, buttons, onKeydown };
  },
  template: `
    <div class="swatches" role="radiogroup" :aria-labelledby="labelledby">
      <button
        v-for="(color, index) in colors"
        :key="color.id"
        :ref="(el) => (buttons[index] = el)"
        type="button"
        role="radio"
        class="swatch"
        :data-color="color.id"
        :aria-checked="modelValue === color.id ? 'true' : 'false'"
        :aria-label="color.label"
        :title="color.label"
        :tabindex="modelValue === color.id ? 0 : -1"
        @click="$emit('update:modelValue', color.id)"
        @keydown="onKeydown($event, index)"
      ></button>
    </div>
  `,
};

// ---------------------------------------------------------------------------
// Formulario de cuenta (crear / editar)
// ---------------------------------------------------------------------------
const AccountForm = {
  name: 'AccountForm',
  components: { BaseModal, ColorPicker },
  props: {
    accountId: { type: String, default: null },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const account = props.accountId ? findAccount(props.accountId) : null;
    const form = reactive({
      name: account?.name ?? '',
      email: account?.email ?? '',
      color: account?.color ?? nextColor(data.accounts.length),
    });
    const error = ref('');

    function submit() {
      if (!form.name.trim()) {
        error.value = 'Escribe un nombre para la cuenta.';
        return;
      }
      if (account) {
        updateAccount(account.id, form);
        showToast('Cuenta actualizada');
      } else {
        const created = createAccount(form);
        select('account', created.id);
        showToast('Cuenta creada');
      }
      emit('close');
    }

    async function remove() {
      const categoryCount = categoriesByAccount.value.get(account.id)?.length ?? 0;
      const linkCount = data.links.filter((l) => findCategory(l.categoryId)?.accountId === account.id).length;
      const ok = await confirmAction({
        title: 'Eliminar cuenta',
        message:
          `Se eliminará "${account.name}"` +
          (categoryCount ? ` junto con ${categoryCount} categoría(s) y ${linkCount} enlace(s)` : '') +
          '. Esta acción no se puede deshacer.',
        confirmLabel: 'Eliminar',
        danger: true,
      });
      if (!ok) return;
      deleteAccount(account.id);
      showToast('Cuenta eliminada');
      emit('close');
    }

    return { account, form, error, submit, remove };
  },
  template: `
    <BaseModal :title="account ? 'Editar cuenta' : 'Nueva cuenta'" @close="$emit('close')">
      <form id="account-form" class="modal__body" novalidate @submit.prevent="submit">
        <div class="field">
          <label class="field__label" for="account-name">Nombre</label>
          <input
            id="account-name"
            v-model="form.name"
            class="input"
            type="text"
            maxlength="80"
            placeholder="Ej.: Personal, Trabajo…"
            required
            data-autofocus
            :aria-invalid="error ? 'true' : 'false'"
            :aria-describedby="error ? 'account-name-error' : undefined"
            @input="error = ''"
          >
          <p v-if="error" id="account-name-error" class="field__error" role="alert">{{ error }}</p>
        </div>
        <div class="field">
          <label class="field__label" for="account-email">Email <span class="field__optional">(opcional)</span></label>
          <input id="account-email" v-model="form.email" class="input" type="email" maxlength="120" placeholder="nombre@ejemplo.com">
        </div>
        <div class="field">
          <span id="account-color-label" class="field__label">Color</span>
          <ColorPicker v-model="form.color" labelledby="account-color-label" />
        </div>
      </form>
      <template #footer>
        <button v-if="account" type="button" class="btn btn--danger modal__footer-start" @click="remove">Eliminar</button>
        <button type="button" class="btn" @click="$emit('close')">Cancelar</button>
        <button type="submit" form="account-form" class="btn btn--primary">{{ account ? 'Guardar' : 'Crear cuenta' }}</button>
      </template>
    </BaseModal>
  `,
};

// ---------------------------------------------------------------------------
// Formulario de categoría (crear / editar)
// ---------------------------------------------------------------------------
const CategoryForm = {
  name: 'CategoryForm',
  components: { BaseModal, ColorPicker },
  props: {
    categoryId: { type: String, default: null },
    accountId: { type: String, default: null },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const category = props.categoryId ? findCategory(props.categoryId) : null;
    const form = reactive({
      name: category?.name ?? '',
      accountId: category?.accountId ?? props.accountId ?? sortedAccounts.value[0]?.id ?? '',
      color: category?.color ?? nextColor(data.categories.length),
    });
    const error = ref('');

    function submit() {
      if (!form.name.trim()) {
        error.value = 'Escribe un nombre para la categoría.';
        return;
      }
      if (category) {
        updateCategory(category.id, form);
        showToast('Categoría actualizada');
      } else {
        const created = createCategory(form);
        select('category', created.id);
        showToast('Categoría creada');
      }
      emit('close');
    }

    async function remove() {
      const linkCount = linksByCategory.value.get(category.id)?.length ?? 0;
      const ok = await confirmAction({
        title: 'Eliminar categoría',
        message:
          `Se eliminará "${category.name}"` +
          (linkCount ? ` y sus ${linkCount} enlace(s)` : '') +
          '. Esta acción no se puede deshacer.',
        confirmLabel: 'Eliminar',
        danger: true,
      });
      if (!ok) return;
      deleteCategory(category.id);
      showToast('Categoría eliminada');
      emit('close');
    }

    return { category, form, error, accounts: sortedAccounts, submit, remove };
  },
  template: `
    <BaseModal :title="category ? 'Editar categoría' : 'Nueva categoría'" @close="$emit('close')">
      <form id="category-form" class="modal__body" novalidate @submit.prevent="submit">
        <div class="field">
          <label class="field__label" for="category-name">Nombre</label>
          <input
            id="category-name"
            v-model="form.name"
            class="input"
            type="text"
            maxlength="80"
            placeholder="Ej.: Para leer, Vídeos, Recetas…"
            required
            data-autofocus
            :aria-invalid="error ? 'true' : 'false'"
            :aria-describedby="error ? 'category-name-error' : undefined"
            @input="error = ''"
          >
          <p v-if="error" id="category-name-error" class="field__error" role="alert">{{ error }}</p>
        </div>
        <div class="field">
          <label class="field__label" for="category-account">Cuenta</label>
          <select id="category-account" v-model="form.accountId" class="select">
            <option v-for="account in accounts" :key="account.id" :value="account.id">{{ account.name }}</option>
          </select>
        </div>
        <div class="field">
          <span id="category-color-label" class="field__label">Color</span>
          <ColorPicker v-model="form.color" labelledby="category-color-label" />
        </div>
      </form>
      <template #footer>
        <button v-if="category" type="button" class="btn btn--danger modal__footer-start" @click="remove">Eliminar</button>
        <button type="button" class="btn" @click="$emit('close')">Cancelar</button>
        <button type="submit" form="category-form" class="btn btn--primary">{{ category ? 'Guardar' : 'Crear categoría' }}</button>
      </template>
    </BaseModal>
  `,
};

// ---------------------------------------------------------------------------
// Barra lateral
// ---------------------------------------------------------------------------
export default {
  name: 'Sidebar',
  components: { AppIcon, AccountForm, CategoryForm },
  props: {
    open: { type: Boolean, default: false },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const closeButtonRef = ref(null);

    // Cerrar el cajón con Escape (solo relevante en móvil)
    function onKeydown(event) {
      if (event.key === 'Escape' && props.open) emit('close');
    }

    // Al abrir el cajón en móvil, mover el foco dentro de él
    watch(
      () => props.open,
      async (open) => {
        if (!open) return;
        await nextTick();
        closeButtonRef.value?.focus();
      },
    );

    const isSelected = (type, id = null) => ui.selection.type === type && ui.selection.id === id;

    // ---- Soltar enlaces sobre una categoría de la barra lateral ----
    const dropTargetId = ref(null);

    function canDropOn(categoryId) {
      const link = ui.draggingLinkId ? findLink(ui.draggingLinkId) : null;
      return Boolean(link && link.categoryId !== categoryId);
    }

    function onDragOver(event, category) {
      if (!canDropOn(category.id)) return;
      event.preventDefault(); // permite soltar aquí
      event.dataTransfer.dropEffect = 'move';
      dropTargetId.value = category.id;
    }

    function onDragLeave(category) {
      if (dropTargetId.value === category.id) dropTargetId.value = null;
    }

    function onDrop(event, category) {
      dropTargetId.value = null;
      if (!canDropOn(category.id)) return;
      event.preventDefault();
      if (moveLink(ui.draggingLinkId, category.id)) showToast(`Movido a "${category.name}"`);
    }
    const pendingLabel = (count) => (count === 1 ? '1 pendiente' : `${count} pendientes`);

    return {
      ui,
      closeButtonRef,
      onKeydown,
      accounts: sortedAccounts,
      categoriesByAccount,
      pendingByAccount,
      pendingByCategory,
      totalPending: computed(() => totalPending.value),
      isSelected,
      pendingLabel,
      dropTargetId,
      onDragOver,
      onDragLeave,
      onDrop,
      select,
      openAccountForm,
      openCategoryForm,
    };
  },
  template: `
    <aside
      id="app-sidebar"
      class="app-sidebar"
      :class="{ 'is-open': open }"
      aria-label="Cuentas y categorías"
      @keydown="onKeydown"
    >
      <div class="sidebar__top">
        <button
          ref="closeButtonRef"
          type="button"
          class="icon-btn"
          aria-label="Cerrar menú"
          @click="$emit('close')"
        >
          <AppIcon name="close" />
        </button>
      </div>

      <nav aria-label="Navegación de enlaces">
        <button
          type="button"
          class="nav-item"
          :aria-current="isSelected('all') ? 'true' : undefined"
          @click="select('all')"
        >
          <AppIcon name="layers" size="sm" />
          <span class="nav-item__label">Todos los enlaces</span>
          <span v-if="totalPending" class="nav-item__count" :aria-label="pendingLabel(totalPending)">{{ totalPending }}</span>
        </button>

        <section class="sidebar-section" aria-labelledby="sidebar-accounts-title">
          <div class="sidebar-section__header">
            <h2 id="sidebar-accounts-title" class="sidebar-section__title">Cuentas</h2>
            <button type="button" class="icon-btn icon-btn--sm" aria-label="Añadir cuenta" title="Añadir cuenta" @click="openAccountForm()">
              <AppIcon name="plus" size="sm" />
            </button>
          </div>

          <p v-if="accounts.length === 0" class="empty-state empty-state--compact">
            Aún no hay cuentas.
            <button type="button" class="btn btn--ghost btn--sm" @click="openAccountForm()">Crear cuenta</button>
          </p>

          <ul v-else class="nav-tree">
            <li v-for="account in accounts" :key="account.id" class="nav-tree__account">
              <div class="nav-row" :data-color="account.color">
                <button
                  type="button"
                  class="nav-item"
                  :aria-current="isSelected('account', account.id) ? 'true' : undefined"
                  @click="select('account', account.id)"
                >
                  <span class="color-dot color-dot--account"></span>
                  <span class="nav-item__label">
                    {{ account.name }}
                    <span v-if="account.email" class="nav-item__meta">{{ account.email }}</span>
                  </span>
                  <span
                    v-if="pendingByAccount.get(account.id)"
                    class="nav-item__count"
                    :aria-label="pendingLabel(pendingByAccount.get(account.id))"
                  >{{ pendingByAccount.get(account.id) }}</span>
                </button>
                <button
                  type="button"
                  class="icon-btn icon-btn--sm nav-row__action"
                  :aria-label="'Editar cuenta ' + account.name"
                  title="Editar cuenta"
                  @click="openAccountForm(account.id)"
                >
                  <AppIcon name="edit" size="sm" />
                </button>
              </div>

              <ul class="nav-tree__categories">
                <li
                  v-for="category in categoriesByAccount.get(account.id)"
                  :key="category.id"
                  class="nav-row"
                  :data-color="category.color"
                >
                  <button
                    type="button"
                    class="nav-item"
                    :class="{ 'is-drop-target': dropTargetId === category.id }"
                    :aria-current="isSelected('category', category.id) ? 'true' : undefined"
                    @click="select('category', category.id)"
                    @dragover="onDragOver($event, category)"
                    @dragleave="onDragLeave(category)"
                    @drop="onDrop($event, category)"
                  >
                    <span class="color-dot"></span>
                    <span class="nav-item__label">{{ category.name }}</span>
                    <span
                      v-if="pendingByCategory.get(category.id)"
                      class="nav-item__count"
                      :aria-label="pendingLabel(pendingByCategory.get(category.id))"
                    >{{ pendingByCategory.get(category.id) }}</span>
                  </button>
                  <button
                    type="button"
                    class="icon-btn icon-btn--sm nav-row__action"
                    :aria-label="'Editar categoría ' + category.name"
                    title="Editar categoría"
                    @click="openCategoryForm({ categoryId: category.id })"
                  >
                    <AppIcon name="edit" size="sm" />
                  </button>
                </li>
                <li>
                  <button type="button" class="nav-item nav-item--add" @click="openCategoryForm({ accountId: account.id })">
                    <AppIcon name="plus" size="sm" />
                    <span class="nav-item__label">Nueva categoría</span>
                  </button>
                </li>
              </ul>
            </li>
          </ul>
        </section>
      </nav>

      <AccountForm
        v-if="ui.accountForm"
        :account-id="ui.accountForm.accountId"
        @close="ui.accountForm = null"
      />
      <CategoryForm
        v-if="ui.categoryForm"
        :category-id="ui.categoryForm.categoryId"
        :account-id="ui.categoryForm.accountId"
        @close="ui.categoryForm = null"
      />
    </aside>
  `,
};
