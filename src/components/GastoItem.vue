<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Transacao } from '../stores/gastos'
import type { DadosEdicaoGasto } from '../services/api'
import { corDaCategoria, iconeDaCategoria } from '../theme/categorias'
import { formatarMoeda } from '../utils/formatarMoeda'
import CategoriaSelect from './CategoriaSelect.vue'

const props = defineProps<{
  gasto: Transacao
  editando: boolean
  salvando: boolean
}>()

const emit = defineEmits<{
  'iniciar-edicao': [gasto: Transacao]
  'cancelar-edicao': []
  salvar: [id: number | string, dados: DadosEdicaoGasto]
  excluir: [id: number | string]
}>()

const formDescricao = ref('')
const formCategoria = ref('')
const formValor = ref('')

// Recarrega o formulário sempre que este item entra em modo de edição
watch(
  () => props.editando,
  (ativo) => {
    if (ativo) {
      formDescricao.value = props.gasto.descricao
      formCategoria.value = props.gasto.categoria || 'Outros'
      formValor.value = String(props.gasto.valor)
    }
  },
)

const salvar = () => {
  emit('salvar', props.gasto.id, {
    descricao: formDescricao.value.trim(),
    categoria: formCategoria.value,
    valor: Number(formValor.value.replace(',', '.')),
  })
}
</script>

<template>
  <div class="p-4 bg-white/70 dark:bg-white/5 backdrop-blur-sm rounded-2xl border border-slate-200/70 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 hover:bg-white/90 dark:hover:bg-white/[0.07] transition-all duration-200">

    <!-- Modo edição -->
    <div v-if="editando" class="space-y-3">
      <input v-model="formDescricao" type="text" placeholder="Descrição"
        class="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-400" />
      <div class="flex gap-2 sm:gap-3">
        <CategoriaSelect v-model="formCategoria" />
        <input v-model="formValor" type="text" inputmode="decimal" placeholder="Valor"
          class="w-24 sm:w-28 flex-shrink-0 min-w-0 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-400" />
      </div>
      <div class="flex justify-end gap-2">
        <button @click="emit('cancelar-edicao')" :disabled="salvando"
          class="px-4 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 rounded-lg">
          Cancelar
        </button>
        <button @click="salvar" :disabled="salvando"
          class="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60">
          {{ salvando ? 'Salvando...' : 'Salvar' }}
        </button>
      </div>
    </div>

    <!-- Modo visualização -->
    <div v-else class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div class="flex items-start gap-3 min-w-0">
        <span class="text-xl leading-none mt-0.5 flex-shrink-0">{{ iconeDaCategoria(gasto.categoria) }}</span>
        <div class="flex flex-col min-w-0">
          <span class="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 truncate">{{ gasto.descricao }}</span>
          <div class="flex items-center gap-2 mt-1 flex-wrap">
            <span class="text-xs px-2 py-0.5 rounded-md font-medium"
              :style="{ backgroundColor: corDaCategoria(gasto.categoria) + '26', color: corDaCategoria(gasto.categoria) }">
              {{ gasto.categoria || 'Outros' }}
            </span>
            <span class="text-xs text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">
              {{ new Date(gasto.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) }}
            </span>
          </div>
        </div>
      </div>
      <div class="flex items-center justify-between sm:justify-end gap-2 pl-8 sm:pl-0">
        <div class="text-lg sm:text-xl font-black text-slate-700 dark:text-slate-200 font-mono">
          {{ formatarMoeda(gasto.valor) }}
        </div>
        <div class="flex items-center gap-1 flex-shrink-0">
          <button @click="emit('iniciar-edicao', gasto)"
            class="p-2 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
            title="Editar gasto">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button @click="emit('excluir', gasto.id)"
            class="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
            title="Excluir gasto">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
