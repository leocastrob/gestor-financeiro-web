<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useGastosStore } from '../stores/gastos'
import { formatarMoeda } from '../utils/formatarMoeda'
import { MESES } from '../constants/meses'
import AppShell from '../layouts/AppShell.vue'
import GraficoCategorias from '../components/GraficoCategorias.vue'
import * as api from '../services/api'
import type { Transacao } from '../stores/gastos'

const gastosStore = useGastosStore()

const totalMesAnterior = ref<number | null>(null)

const buscarTotalMesAnterior = async () => {
  let mes = gastosStore.filtroMes - 1
  let ano = gastosStore.filtroAno
  if (mes === 0) {
    mes = 12
    ano -= 1
  }
  try {
    const dados = await api.buscarGastos(gastosStore.telefone, mes, ano)
    totalMesAnterior.value = dados.reduce((acc: number, g: Transacao) => acc + Number(g.valor), 0)
  } catch {
    totalMesAnterior.value = null
  }
}

const variacaoPercentual = computed(() => {
  if (totalMesAnterior.value === null || totalMesAnterior.value === 0) return null
  return ((gastosStore.totalGastosNumerico - totalMesAnterior.value) / totalMesAnterior.value) * 100
})

watch([() => gastosStore.filtroMes, () => gastosStore.filtroAno], buscarTotalMesAnterior)

// A busca da lista principal (gastosStore.transacoes) já é disparada pelo
// AppShell (que envolve esta view) — aqui só falta o total do mês anterior,
// que é uma preocupação específica do Dashboard. Fica em bloco (e não como
// referência direta `onMounted(buscarTotalMesAnterior)`) porque a Task 12
// adiciona uma segunda chamada aqui dentro.
onMounted(() => {
  buscarTotalMesAnterior()
})
</script>

<template>
  <AppShell>
    <div v-if="gastosStore.carregando" class="space-y-3 animate-pulse">
      <div class="h-24 rounded-2xl bg-slate-200/70 dark:bg-white/5"></div>
      <div class="h-64 rounded-2xl bg-slate-200/70 dark:bg-white/5"></div>
    </div>

    <div v-else-if="gastosStore.erro" class="min-h-[40vh] flex items-center justify-center">
      <div class="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl">
        <p class="text-red-500 dark:text-red-400 font-semibold">{{ gastosStore.erro }}</p>
      </div>
    </div>

    <div v-else class="space-y-4">
      <div v-if="gastosStore.transacoesVisiveis.length > 0"
        v-motion :initial="{ opacity: 0, y: 12 }" :enter="{ opacity: 1, y: 0, transition: { duration: 300 } }"
        class="bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 border border-emerald-500/20 rounded-2xl p-5 flex justify-between items-center">
        <div>
          <p class="text-emerald-700/80 dark:text-emerald-400/70 text-xs font-semibold uppercase tracking-wider">Total gasto</p>
          <p class="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {{ formatarMoeda(gastosStore.totalGastosNumerico) }}
          </p>
          <p v-if="variacaoPercentual !== null" class="text-xs font-semibold mt-1.5"
            :class="variacaoPercentual > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'">
            {{ variacaoPercentual > 0 ? '↑' : variacaoPercentual < 0 ? '↓' : '→' }}
            {{ Math.abs(variacaoPercentual).toFixed(0) }}% vs. {{ MESES[(gastosStore.filtroMes - 2 + 12) % 12] }}
          </p>
        </div>
        <div class="text-right">
          <p class="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">Registros</p>
          <p class="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1 font-mono">{{ gastosStore.transacoesVisiveis.length }}</p>
        </div>
      </div>

      <GraficoCategorias v-if="gastosStore.transacoesVisiveis.length > 0" :transacoes="gastosStore.transacoesVisiveis" />

      <div v-if="gastosStore.transacoesVisiveis.length === 0" class="min-h-[30vh] flex flex-col items-center justify-center text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900/5 dark:bg-white/5 mb-4">
          <span class="text-3xl">📭</span>
        </div>
        <p class="text-slate-500 dark:text-slate-400 text-lg font-semibold">Nenhum gasto neste mês.</p>
      </div>
    </div>
  </AppShell>
</template>
