<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGastosStore } from '../stores/gastos'
import { useCategoriasStore } from '../stores/categorias'
import AppShell from '../layouts/AppShell.vue'
import CategoriaPersonalizadaItem from '../components/CategoriaPersonalizadaItem.vue'
import type { CategoriaPersonalizada, DadosEdicaoCategoria } from '../services/api'

const gastosStore = useGastosStore()
const categoriasStore = useCategoriasStore()

// --- Nova categoria ---
const adicionandoAberto = ref(false)
const novoNome = ref('')
const novoIcone = ref('🏷️')
const criando = ref(false)

const novaCategoriaValida = computed(() => novoNome.value.trim().length > 0)

const abrirNovaCategoria = () => {
  adicionandoAberto.value = true
  novoNome.value = ''
  novoIcone.value = '🏷️'
}

const cancelarNovaCategoria = () => {
  adicionandoAberto.value = false
}

const confirmarNovaCategoria = async () => {
  if (!novaCategoriaValida.value) return
  criando.value = true
  const criada = await categoriasStore.adicionarCategoria(gastosStore.telefone, {
    nome: novoNome.value.trim(),
    icone: novoIcone.value.trim() || '🏷️',
  })
  criando.value = false
  if (criada) {
    adicionandoAberto.value = false
  }
}

// --- Edição inline ---
const editandoId = ref<number | null>(null)
const salvando = ref(false)

const iniciarEdicao = (categoria: CategoriaPersonalizada) => {
  editandoId.value = categoria.id
}

const cancelarEdicao = () => {
  editandoId.value = null
}

const salvarEdicao = async (id: number, dados: DadosEdicaoCategoria) => {
  salvando.value = true
  const sucesso = await categoriasStore.editarCategoria(gastosStore.telefone, id, dados)
  salvando.value = false
  if (sucesso) editandoId.value = null
}

// --- Excluir ---
const excluir = async (id: number) => {
  if (!confirm('Excluir esta categoria? Lançamentos já registrados com ela não serão afetados.')) return
  await categoriasStore.removerCategoria(gastosStore.telefone, id)
}
</script>

<template>
  <AppShell>
    <div class="space-y-4">

      <div v-motion :initial="{ opacity: 0, y: 12 }" :enter="{ opacity: 1, y: 0, transition: { duration: 300 } }"
        class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-3">
          <div class="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10">
            <span class="text-xl">🏷️</span>
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">Categorias</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">Suas categorias personalizadas</p>
          </div>
        </div>
        <button v-if="!adicionandoAberto" @click="abrirNovaCategoria"
          class="px-3 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60">
          + Nova
        </button>
      </div>

      <div v-if="adicionandoAberto" class="p-4 bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl space-y-3">
        <div class="flex gap-2 sm:gap-3">
          <input v-model="novoIcone" type="text" maxlength="10" placeholder="🏷️"
            class="w-16 flex-shrink-0 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-lg text-center rounded-xl px-2 py-2.5 outline-none focus:border-emerald-400" />
          <input v-model="novoNome" type="text" maxlength="50" placeholder="Nome (ex: Faculdade, Pets...)"
            class="flex-1 min-w-0 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-emerald-400" />
        </div>
        <div class="flex justify-end gap-2">
          <button @click="cancelarNovaCategoria" :disabled="criando"
            class="px-4 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 rounded-lg">
            Cancelar
          </button>
          <button @click="confirmarNovaCategoria" :disabled="!novaCategoriaValida || criando"
            class="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60">
            {{ criando ? 'Criando...' : 'Criar' }}
          </button>
        </div>
      </div>

      <div v-if="categoriasStore.erro" class="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
        <p class="text-red-500 dark:text-red-400 text-sm font-semibold">{{ categoriasStore.erro }}</p>
      </div>

      <div v-if="categoriasStore.carregando" class="space-y-3 animate-pulse">
        <div class="h-16 rounded-2xl bg-slate-200/70 dark:bg-white/5"></div>
        <div class="h-16 rounded-2xl bg-slate-200/70 dark:bg-white/5"></div>
      </div>

      <div v-else-if="categoriasStore.categorias.length === 0" class="min-h-[30vh] flex flex-col items-center justify-center text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900/5 dark:bg-white/5 mb-4">
          <span class="text-3xl">🏷️</span>
        </div>
        <p class="text-slate-500 dark:text-slate-400 text-lg font-semibold">Nenhuma categoria personalizada ainda.</p>
        <p class="text-slate-400 dark:text-slate-600 text-sm mt-2 max-w-xs">Crie categorias além das 8 padrão do sistema — elas aparecem em qualquer seletor de categoria do app.</p>
      </div>

      <div v-else class="space-y-3">
        <CategoriaPersonalizadaItem
          v-for="categoria in categoriasStore.categorias" :key="categoria.id"
          :categoria="categoria"
          :editando="editandoId === categoria.id"
          :salvando="salvando"
          @iniciar-edicao="iniciarEdicao"
          @cancelar-edicao="cancelarEdicao"
          @salvar="salvarEdicao"
          @excluir="excluir"
        />
      </div>

    </div>
  </AppShell>
</template>
