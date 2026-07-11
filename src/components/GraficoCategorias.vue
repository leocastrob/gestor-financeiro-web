<script setup lang="ts">
import { computed } from 'vue'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Doughnut } from 'vue-chartjs'
import { useTema } from '../composables/useTema'
import { corDaCategoria } from '../theme/categorias'
import type { Transacao } from '../stores/gastos'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps<{ transacoes: Transacao[] }>()
const { tema } = useTema()

const dadosGrafico = computed(() => {
  const contagem: Record<string, number> = {}

  props.transacoes.forEach((g) => {
    const cat = g.categoria || 'Outros'
    if (!contagem[cat]) contagem[cat] = 0
    contagem[cat] += Number(g.valor)
  })

  const categorias = Object.keys(contagem)
  const corGap = tema.value === 'dark' ? '#0a0b0f' : '#ffffff'

  return {
    labels: categorias,
    datasets: [
      {
        backgroundColor: categorias.map(corDaCategoria),
        data: Object.values(contagem),
        borderColor: corGap,
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  }
})

const opcoesGrafico = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right' as const,
      labels: {
        color: tema.value === 'dark' ? '#cbd5e1' : '#475569',
        padding: 14,
      },
    },
  },
}))
</script>

<template>
  <div class="bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 h-64">
    <Doughnut :data="dadosGrafico" :options="opcoesGrafico" />
  </div>
</template>
