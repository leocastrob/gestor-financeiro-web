<script setup lang="ts">
import { computed, ref } from 'vue'
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js'
import { Doughnut } from 'vue-chartjs'
import { useTema } from '../composables/useTema'
import { corDaCategoria } from '../theme/categorias'
import { formatarMoeda } from '../utils/formatarMoeda'
import type { Transacao } from '../stores/gastos'

ChartJS.register(ArcElement, Tooltip)

const props = defineProps<{ transacoes: Transacao[] }>()
const { tema } = useTema()

const abaAtiva = ref<'despesa' | 'receita'>('despesa')

// Maior primeiro: a legenda passa a ser lida em ordem de peso no mês.
const fatias = computed(() => {
  const contagem: Record<string, number> = {}

  props.transacoes
    .filter((g) => g.tipo === abaAtiva.value)
    .forEach((g) => {
      const cat = g.categoria || 'Outros'
      contagem[cat] = (contagem[cat] || 0) + Number(g.valor)
    })

  return Object.entries(contagem)
    .map(([nome, valor]) => ({ nome, valor, cor: corDaCategoria(nome) }))
    .sort((a, b) => b.valor - a.valor)
})

const dadosGrafico = computed(() => ({
  labels: fatias.value.map((f) => f.nome),
  datasets: [
    {
      backgroundColor: fatias.value.map((f) => f.cor),
      data: fatias.value.map((f) => f.valor),
      borderColor: tema.value === 'dark' ? '#0a0b0f' : '#ffffff',
      borderWidth: 2,
      hoverOffset: 6,
    },
  ],
}))

const opcoesGrafico = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    // A legenda é HTML, fora do canvas: a nativa quebrava em duas colunas na
    // largura do celular e a segunda coluna saía cortada pela borda do card.
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: { label?: string; parsed: number }) =>
          ` ${ctx.label ?? ''}: ${formatarMoeda(ctx.parsed)}`,
      },
    },
  },
}))
</script>

<template>
  <div class="bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 mb-4">

    <!-- Mesmo toggle do formulário de lançamentos: despesas e receitas nunca
         se somam na mesma rosca -->
    <div class="flex gap-1 mb-4 bg-slate-100 dark:bg-white/5 rounded-xl p-1">
      <button id="btn-grafico-despesas" type="button" @click="abaAtiva = 'despesa'"
        :aria-pressed="abaAtiva === 'despesa'"
        class="flex-1 py-1.5 rounded-lg text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
        :class="abaAtiva === 'despesa'
          ? 'bg-white dark:bg-white/15 text-red-500 shadow-sm'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'">
        💸 Despesas
      </button>
      <button id="btn-grafico-receitas" type="button" @click="abaAtiva = 'receita'"
        :aria-pressed="abaAtiva === 'receita'"
        class="flex-1 py-1.5 rounded-lg text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
        :class="abaAtiva === 'receita'
          ? 'bg-white dark:bg-white/15 text-sky-500 shadow-sm'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'">
        💰 Receitas
      </button>
    </div>

    <div v-if="fatias.length === 0" class="h-40 flex items-center justify-center text-center">
      <p class="text-sm text-slate-400 dark:text-slate-500">
        Nenhuma {{ abaAtiva === 'receita' ? 'receita' : 'despesa' }} neste mês.
      </p>
    </div>

    <div v-else class="flex flex-col sm:flex-row sm:items-center gap-4">
      <div class="h-48 sm:h-56 sm:w-1/2 flex-shrink-0">
        <Doughnut :data="dadosGrafico" :options="opcoesGrafico" />
      </div>

      <ul class="grid grid-cols-2 sm:grid-cols-1 gap-x-3 gap-y-2 min-w-0 sm:flex-1">
        <li v-for="fatia in fatias" :key="fatia.nome" class="flex items-start gap-2 min-w-0">
          <span class="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
            :style="{ backgroundColor: fatia.cor }"></span>
          <div class="min-w-0">
            <p class="text-xs font-medium text-slate-600 dark:text-slate-300 truncate" :title="fatia.nome">
              {{ fatia.nome }}
            </p>
            <p class="text-xs font-mono text-slate-500 dark:text-slate-400">
              {{ formatarMoeda(fatia.valor) }}
            </p>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
