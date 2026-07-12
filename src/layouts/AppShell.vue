<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TabsRoot, TabsList, TabsTrigger } from 'reka-ui'
import { useGastosStore } from '../stores/gastos'
import { useMetasStore } from '../stores/metas'
import { useDividasStore } from '../stores/dividas'
import { useContasFixasStore } from '../stores/contasFixas'
import { MESES } from '../constants/meses'

const route = useRoute()
const router = useRouter()
const gastosStore = useGastosStore()
const metasStore = useMetasStore()
const dividasStore = useDividasStore()
const contasFixasStore = useContasFixasStore()

// AppShell é remontado a cada troca de aba (Dashboard <-> Lançamentos são rotas
// diferentes, cada uma com sua própria instância de AppShell) — por isso é o
// lugar certo para a busca inicial da lista do mês em exibição: cobre as duas
// abas sem duplicar a chamada em cada view. O `watch` dentro do store (Task 3)
// só reage a *mudanças* de filtroMes/filtroAno, não à montagem inicial.
onMounted(() => {
  gastosStore.buscarGastos(gastosStore.filtroMes, gastosStore.filtroAno)
})

const ABAS = [
  { valor: 'painel', rota: '/painel', rotulo: 'Dashboard' },
  { valor: 'lancamentos', rota: '/lancamentos', rotulo: 'Lançamentos' },
  { valor: 'importar', rota: '/importar', rotulo: '📄 Importar' },
  { valor: 'dividas', rota: '/dividas', rotulo: '💳 Dívidas' },
  { valor: 'contas-fixas', rota: '/contas-fixas', rotulo: '🔁 Fixas' },
] as const

const abaAtiva = computed(() => ABAS.find((a) => a.rota === route.path)?.valor ?? 'painel')

const irParaAba = (valor: string | number) => {
  const aba = ABAS.find((a) => a.valor === valor)
  if (aba) router.push(aba.rota)
}

const telefoneFormatado = computed(() => {
  const n = gastosStore.telefone || ''
  if (n.length <= 2) return `+${n}`
  if (n.length <= 4) return `+${n.slice(0, 2)} ${n.slice(2)}`
  if (n.length <= 9) return `+${n.slice(0, 2)} ${n.slice(2, 4)} ${n.slice(4)}`
  return `+${n.slice(0, 2)} ${n.slice(2, 4)} ${n.slice(4, 9)}-${n.slice(9)}`
})

const sair = () => {
  gastosStore.logout()
  metasStore.resetar()
  dividasStore.resetar()
  contasFixasStore.resetar()
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen p-4 sm:p-8 font-sans">
    <div class="max-w-2xl mx-auto">

      <!-- Cabeçalho -->
      <div class="flex items-start justify-between gap-3 mb-6">
        <div class="min-w-0">
          <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
            💸 Gestor Financeiro
          </h1>
          <p class="text-emerald-600 dark:text-emerald-400 text-sm font-mono mt-1">
            📱 {{ telefoneFormatado }}
          </p>
        </div>
        <button id="btn-sair" @click="sair"
          class="flex-shrink-0 bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/20 text-sm font-semibold px-3 sm:px-4 py-2 rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60">
          ← Trocar
        </button>
      </div>

      <!-- Tabs de navegação -->
      <TabsRoot :model-value="abaAtiva" @update:model-value="irParaAba">
        <TabsList
          class="flex gap-1 mb-6 bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-1"
          aria-label="Navegação principal"
        >
          <TabsTrigger
            v-for="aba in ABAS" :key="aba.valor" :value="aba.valor"
            class="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-200 text-slate-500 dark:text-slate-400 data-[state=active]:bg-emerald-500 data-[state=active]:text-white hover:text-slate-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
          >
            {{ aba.rotulo }}
          </TabsTrigger>
        </TabsList>
      </TabsRoot>

      <!-- Seletor de mês -->
      <div class="flex items-center justify-between gap-2 mb-6 bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-2 py-2">
        <button @click="gastosStore.mesAnterior" aria-label="Mês anterior"
          class="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-900/5 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60">
          ‹
        </button>
        <span class="font-semibold text-slate-800 dark:text-slate-100 text-sm sm:text-base">
          {{ MESES[gastosStore.filtroMes - 1] }} de {{ gastosStore.filtroAno }}
        </span>
        <button @click="gastosStore.proximoMes" aria-label="Próximo mês"
          class="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-900/5 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60">
          ›
        </button>
      </div>

      <slot />
    </div>
  </div>
</template>
