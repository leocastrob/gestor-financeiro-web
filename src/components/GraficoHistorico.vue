<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import * as api from '../services/api'
import { useTema } from '../composables/useTema'
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler } from 'chart.js'
import { Line } from 'vue-chartjs'
import { agregarUltimosMeses } from '../utils/agregarUltimosMeses'

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler)

const props = defineProps<{ telefone: string }>()
const { tema } = useTema()

const QUANTIDADE_MESES = 6

const carregando = ref(false)
const totaisPorMes = ref<{ rotulo: string; total: number }[]>([])

const carregar = async () => {
  if (!props.telefone) return
  carregando.value = true
  try {
    const todasTransacoes = await api.buscarGastos(props.telefone)
    totaisPorMes.value = agregarUltimosMeses(todasTransacoes, QUANTIDADE_MESES)
  } catch (e) {
    console.error(e)
    totaisPorMes.value = []
  } finally {
    carregando.value = false
  }
}

onMounted(carregar)
watch(() => props.telefone, carregar)

const dadosGrafico = computed(() => ({
  labels: totaisPorMes.value.map((b) => b.rotulo),
  datasets: [
    {
      data: totaisPorMes.value.map((b) => b.total),
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      fill: true,
      tension: 0.35,
      pointRadius: 3,
      pointBackgroundColor: '#10b981',
    },
  ],
}))

const opcoesGrafico = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { color: tema.value === 'dark' ? '#94a3b8' : '#64748b' } },
    y: {
      grid: { color: tema.value === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)' },
      ticks: { color: tema.value === 'dark' ? '#94a3b8' : '#64748b' },
    },
  },
}))
</script>

<template>
  <div class="bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 h-56">
    <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Últimos 6 meses</p>
    <div v-if="carregando" class="h-32 animate-pulse bg-slate-200/50 dark:bg-white/5 rounded-xl"></div>
    <Line v-else :data="dadosGrafico" :options="opcoesGrafico" class="!h-32" />
  </div>
</template>
