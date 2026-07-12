<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Divida, DadosEdicaoDivida } from '../services/api'
import { iconeDaCategoria } from '../theme/categorias'
import { formatarMoeda } from '../utils/formatarMoeda'
import CategoriaSelect from './CategoriaSelect.vue'

const props = defineProps<{
  divida: Divida
  editando: boolean
  salvando: boolean
}>()

const emit = defineEmits<{
  'iniciar-edicao': [divida: Divida]
  'cancelar-edicao': []
  salvar: [id: number, dados: DadosEdicaoDivida]
  excluir: [id: number]
  'lancar-parcela': [id: number]
}>()

const formDescricao = ref('')
const formCategoria = ref('')
const formValorParcela = ref('')

const parcelasPagas = computed(() => Number(props.divida.parcelas_pagas))
const temParcelaLancada = computed(() => parcelasPagas.value > 0)

const percentual = computed(() => {
  if (props.divida.total_parcelas <= 0) return 0
  return (parcelasPagas.value / props.divida.total_parcelas) * 100
})

const valorRestante = computed(() => {
  const parcelasQueFaltam = Math.max(props.divida.total_parcelas - parcelasPagas.value, 0)
  return parcelasQueFaltam * Number(props.divida.valor_parcela)
})

const iniciarEdicao = () => {
  formDescricao.value = props.divida.descricao
  formCategoria.value = props.divida.categoria
  formValorParcela.value = String(props.divida.valor_parcela)
  emit('iniciar-edicao', props.divida)
}

const salvar = () => {
  emit('salvar', props.divida.id, {
    descricao: formDescricao.value.trim(),
    categoria: formCategoria.value,
    valor_parcela: Number(formValorParcela.value.replace(',', '.')),
  })
}
</script>

<template>
  <div class="p-4 bg-white/70 dark:bg-white/5 backdrop-blur-sm rounded-2xl border border-slate-200/70 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-all duration-200">

    <!-- Modo edição -->
    <div v-if="editando" class="space-y-3">
      <input v-model="formDescricao" type="text" placeholder="Descrição"
        class="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-400" />
      <div class="flex gap-2 sm:gap-3">
        <CategoriaSelect v-model="formCategoria" />
        <input v-model="formValorParcela" type="text" inputmode="decimal" placeholder="Valor da parcela"
          class="w-28 sm:w-32 flex-shrink-0 min-w-0 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-400" />
      </div>
      <p v-if="temParcelaLancada" class="text-xs text-amber-600 dark:text-amber-400">
        Já tem parcela lançada — número de parcelas e data da primeira parcela não podem mais ser alterados.
      </p>
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
    <div v-else>
      <div class="flex items-start justify-between gap-3 mb-2">
        <div class="flex items-start gap-3 min-w-0">
          <span class="text-xl leading-none mt-0.5 flex-shrink-0">{{ iconeDaCategoria(divida.categoria) }}</span>
          <div class="flex flex-col min-w-0">
            <span class="text-base font-bold text-slate-800 dark:text-slate-200 truncate">{{ divida.descricao }}</span>
            <span class="text-xs text-slate-400 dark:text-slate-500">{{ divida.categoria }}</span>
          </div>
        </div>
        <div class="flex items-center gap-1 flex-shrink-0">
          <button v-if="divida.ativa" @click="emit('lancar-parcela', divida.id)"
            class="p-2 text-slate-400 dark:text-slate-500 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-sky-400/10 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
            title="Lançar parcela agora" aria-label="Lançar parcela agora">
            ⏩
          </button>
          <button @click="iniciarEdicao"
            class="p-2 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
            title="Editar dívida" aria-label="Editar dívida">
            ✏️
          </button>
          <button @click="emit('excluir', divida.id)"
            class="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
            title="Excluir dívida" aria-label="Excluir dívida">
            🗑️
          </button>
        </div>
      </div>

      <div class="h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
        <div class="h-full rounded-full transition-all duration-500"
          :class="divida.ativa ? 'bg-emerald-500' : 'bg-slate-400'"
          :style="{ width: Math.min(percentual, 100) + '%' }"></div>
      </div>
      <p class="text-xs text-slate-400 dark:text-slate-500 mt-1.5 font-mono">
        {{ parcelasPagas }}/{{ divida.total_parcelas }} parcelas
        <span v-if="divida.ativa">· faltam {{ formatarMoeda(valorRestante) }}</span>
        <span v-else-if="parcelasPagas >= divida.total_parcelas" class="text-emerald-500 dark:text-emerald-400 font-semibold">· quitada 🎉</span>
        <span v-else class="text-slate-400 dark:text-slate-500 font-semibold">· inativa</span>
      </p>
    </div>
  </div>
</template>
