<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useGastosStore } from '../stores/gastos'
import { useMetasStore } from '../stores/metas'
import { MESES } from '../constants/meses'
import AppShell from '../layouts/AppShell.vue'
import GraficoCategorias from '../components/GraficoCategorias.vue'
import GraficoHistorico from '../components/GraficoHistorico.vue'
import MetaProgressBar from '../components/MetaProgressBar.vue'
import * as api from '../services/api'
import type { Transacao } from '../stores/gastos'

const gastosStore = useGastosStore()
const metasStore = useMetasStore()

const totalPorCategoria = computed(() => {
  const contagem: Record<string, number> = {}
  // Considera apenas despesas no gráfico de categorias e nas barras de meta
  gastosStore.transacoesVisiveis
    .filter((g) => g.tipo === 'despesa')
    .forEach((g) => {
      const cat = g.categoria || 'Outros'
      contagem[cat] = (contagem[cat] || 0) + Number(g.valor)
    })
  return contagem
})

const salvarMeta = (categoria: string, valorTeto: number) => {
  metasStore.salvarMeta(gastosStore.telefone, categoria, valorTeto)
}

const removerMeta = (categoria: string) => {
  metasStore.removerMeta(gastosStore.telefone, categoria)
}

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
  metasStore.buscarMetas(gastosStore.telefone)
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
      <!-- Cards de resumo financeiro do mês -->
      <div v-if="gastosStore.transacoesVisiveis.length > 0"
        v-motion :initial="{ opacity: 0, y: 12 }" :enter="{ opacity: 1, y: 0, transition: { duration: 300 } }"
        class="grid grid-cols-3 gap-2">

        <!-- Total de Despesas -->
        <div class="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex flex-col gap-1">
          <p class="text-red-700/80 dark:text-red-400/70 text-xs font-semibold uppercase tracking-wider leading-tight">Despesas</p>
          <p class="text-xl font-black text-red-600 dark:text-red-400 font-mono tabular-nums">
            {{ gastosStore.totalGastos }}
          </p>
          <p v-if="variacaoPercentual !== null" class="text-xs font-semibold"
            :class="variacaoPercentual > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'">
            {{ variacaoPercentual > 0 ? '↑' : variacaoPercentual < 0 ? '↓' : '→' }}
            {{ Math.abs(variacaoPercentual).toFixed(0) }}% vs. {{ MESES[(gastosStore.filtroMes - 2 + 12) % 12] }}
          </p>
        </div>

        <!-- Total de Receitas -->
        <div class="bg-sky-500/10 border border-sky-500/20 rounded-2xl p-4 flex flex-col gap-1">
          <p class="text-sky-700/80 dark:text-sky-400/70 text-xs font-semibold uppercase tracking-wider leading-tight">Receitas</p>
          <p class="text-xl font-black text-sky-600 dark:text-sky-400 font-mono tabular-nums">
            {{ gastosStore.totalReceitas }}
          </p>
        </div>

        <!-- Saldo do mês -->
        <div class="rounded-2xl p-4 flex flex-col gap-1 border"
          :class="gastosStore.saldoNumerico >= 0
            ? 'bg-emerald-500/10 border-emerald-500/20'
            : 'bg-amber-500/10 border-amber-500/20'">
          <p class="text-xs font-semibold uppercase tracking-wider leading-tight"
            :class="gastosStore.saldoNumerico >= 0
              ? 'text-emerald-700/80 dark:text-emerald-400/70'
              : 'text-amber-700/80 dark:text-amber-400/70'">
            Saldo
          </p>
          <p class="text-xl font-black font-mono tabular-nums"
            :class="gastosStore.saldoNumerico >= 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-amber-600 dark:text-amber-400'">
            {{ gastosStore.saldo }}
          </p>
        </div>
      </div>

      <GraficoCategorias v-if="gastosStore.transacoesVisiveis.length > 0" :transacoes="gastosStore.transacoesVisiveis" />

      <GraficoHistorico :telefone="gastosStore.telefone" />

      <div class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Metas por categoria</p>

        <div v-if="metasStore.erro" class="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
          <p class="text-red-500 dark:text-red-400 text-sm font-semibold">{{ metasStore.erro }}</p>
        </div>

        <div v-if="metasStore.erroAcao" class="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex justify-between items-center gap-3">
          <p class="text-red-500 dark:text-red-400 text-sm font-semibold">{{ metasStore.erroAcao }}</p>
          <button @click="metasStore.erroAcao = null"
            class="text-red-500/70 dark:text-red-400/70 hover:text-red-600 dark:hover:text-red-300 text-lg leading-none">
            ✕
          </button>
        </div>

        <MetaProgressBar
          v-for="cat in Object.keys(totalPorCategoria)" :key="cat"
          :categoria="cat"
          :gasto-atual="totalPorCategoria[cat]!"
          :valor-teto="metasStore.metaDaCategoria(cat)?.valor_teto ? Number(metasStore.metaDaCategoria(cat)!.valor_teto) : undefined"
          @salvar="salvarMeta"
          @remover="removerMeta"
        />
      </div>

      <div v-if="gastosStore.transacoesVisiveis.length === 0" class="min-h-[30vh] flex flex-col items-center justify-center text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900/5 dark:bg-white/5 mb-4">
          <span class="text-3xl">📭</span>
        </div>
        <p class="text-slate-500 dark:text-slate-400 text-lg font-semibold">Nenhum gasto neste mês.</p>
      </div>
    </div>
  </AppShell>
</template>
