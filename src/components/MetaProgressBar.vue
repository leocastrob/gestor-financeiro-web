<script setup lang="ts">
import { ref, computed } from 'vue'
import { iconeDaCategoria } from '../theme/categorias'
import { formatarMoeda } from '../utils/formatarMoeda'

const props = defineProps<{
  categoria: string
  gastoAtual: number
  valorTeto?: number
}>()

const emit = defineEmits<{
  salvar: [categoria: string, valorTeto: number]
  remover: [categoria: string]
}>()

const editando = ref(false)
const valorInput = ref('')

const percentual = computed(() => {
  if (!props.valorTeto || props.valorTeto <= 0) return 0
  return (props.gastoAtual / props.valorTeto) * 100
})

const corBarra = computed(() => {
  if (percentual.value >= 100) return 'bg-red-500'
  if (percentual.value >= 80) return 'bg-amber-500'
  return 'bg-emerald-500'
})

const abrirEdicao = () => {
  valorInput.value = props.valorTeto ? String(props.valorTeto) : ''
  editando.value = true
}

const confirmar = () => {
  const valor = Number(valorInput.value.replace(',', '.'))
  if (valor > 0) {
    emit('salvar', props.categoria, valor)
    editando.value = false
  }
}

const cancelar = () => {
  editando.value = false
}

const remover = () => {
  emit('remover', props.categoria)
  editando.value = false
}
</script>

<template>
  <div class="p-3 rounded-xl bg-white/70 dark:bg-white/5 border border-slate-200/70 dark:border-white/5">
    <div class="flex items-center justify-between gap-2 mb-2">
      <span class="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
        <span>{{ iconeDaCategoria(categoria) }}</span> {{ categoria }}
      </span>
      <button v-if="!editando" @click="abrirEdicao"
        class="text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 rounded">
        {{ valorTeto ? 'Editar' : '+ Definir meta' }}
      </button>
    </div>

    <div v-if="editando" class="flex items-center gap-2 flex-wrap">
      <input v-model="valorInput" type="text" inputmode="decimal" placeholder="Teto mensal"
        class="w-28 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-lg px-2 py-1.5 outline-none focus:border-emerald-400" />
      <button @click="confirmar" class="text-xs font-bold text-emerald-600 dark:text-emerald-400 px-2 py-1.5">Salvar</button>
      <button @click="cancelar" class="text-xs font-semibold text-slate-400 px-2 py-1.5">Cancelar</button>
      <button v-if="valorTeto" @click="remover" class="text-xs font-semibold text-red-500/80 px-2 py-1.5">Remover</button>
    </div>

    <template v-else-if="valorTeto">
      <div class="h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
        <div class="h-full rounded-full transition-all duration-500" :class="corBarra" :style="{ width: Math.min(percentual, 100) + '%' }"></div>
      </div>
      <p class="text-xs text-slate-400 dark:text-slate-500 mt-1.5 font-mono">
        {{ formatarMoeda(gastoAtual) }} de {{ formatarMoeda(valorTeto) }} ({{ percentual.toFixed(0) }}%)
      </p>
    </template>

    <p v-else class="text-xs text-slate-400 dark:text-slate-600">Sem teto definido para esta categoria.</p>
  </div>
</template>
