<script setup lang="ts">
import { computed } from 'vue'
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js'
import { Doughnut } from 'vue-chartjs'
import { useTema } from '../composables/useTema'
import { corDaCategoria } from '../theme/categorias'
import { formatarMoeda } from '../utils/formatarMoeda'
import type { Transacao } from '../stores/gastos'

ChartJS.register(ArcElement, Tooltip)

const props = defineProps<{ transacoes: Transacao[] }>()
const { tema } = useTema()

// Maior primeiro: a legenda passa a ser lida em ordem de peso no mês.
const fatias = computed(() => {
  const contagem: Record<string, number> = {}

  props.transacoes.forEach((g) => {
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
    <div class="flex flex-col sm:flex-row sm:items-center gap-4">
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
