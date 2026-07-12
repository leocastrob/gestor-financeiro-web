<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DropdownMenuRoot, DropdownMenuTrigger, DropdownMenuPortal, DropdownMenuContent, DropdownMenuItem } from 'reka-ui'
import { useGastosStore } from '../stores/gastos'
import { useMetasStore } from '../stores/metas'
import { useDividasStore } from '../stores/dividas'
import { useContasFixasStore } from '../stores/contasFixas'
import { useCategoriasStore } from '../stores/categorias'
import { MESES } from '../constants/meses'

const route = useRoute()
const router = useRouter()
const gastosStore = useGastosStore()
const metasStore = useMetasStore()
const dividasStore = useDividasStore()
const contasFixasStore = useContasFixasStore()
const categoriasStore = useCategoriasStore()

// AppShell é remontado a cada troca de aba (Dashboard <-> Lançamentos são rotas
// diferentes, cada uma com sua própria instância de AppShell) — por isso é o
// lugar certo para a busca inicial da lista do mês em exibição: cobre as duas
// abas sem duplicar a chamada em cada view. O `watch` dentro do store (Task 3)
// só reage a *mudanças* de filtroMes/filtroAno, não à montagem inicial.
onMounted(() => {
  gastosStore.buscarGastos(gastosStore.filtroMes, gastosStore.filtroAno)
  if (gastosStore.telefone) {
    categoriasStore.carregarCategorias(gastosStore.telefone)
  }
})

// Ordem por frequência de uso real (dia a dia primeiro, configuração/esporádico
// por último) — vale tanto para a sidebar (desktop) quanto para o bottom nav +
// menu "Mais" (mobile).
const ABAS = [
  { valor: 'painel', rota: '/painel', rotulo: 'Dashboard', icone: '🏠' },
  { valor: 'lancamentos', rota: '/lancamentos', rotulo: 'Lançamentos', icone: '💰' },
  { valor: 'dividas', rota: '/dividas', rotulo: 'Dívidas', icone: '💳' },
  { valor: 'contas-fixas', rota: '/contas-fixas', rotulo: 'Contas Fixas', icone: '🔁' },
  { valor: 'importar', rota: '/importar', rotulo: 'Importar', icone: '📄' },
  { valor: 'categorias', rota: '/categorias', rotulo: 'Categorias', icone: '🏷️' },
] as const

// No mobile só Dashboard/Lançamentos ficam fixos no bottom nav (uso diário);
// o resto mora dentro do "Mais" — são telas de checagem periódica ou setup.
const PRINCIPAIS = ABAS.slice(0, 2)
const SECUNDARIAS = ABAS.slice(2)

const abaAtiva = computed(() => ABAS.find((a) => a.rota === route.path)?.valor ?? 'painel')
const abaSecundariaAtiva = computed(() => SECUNDARIAS.some((a) => a.valor === abaAtiva.value))

// Seletor de mês só faz sentido nas abas que filtram dados por mês —
// Importar/Dívidas/Contas Fixas/Categorias ignoram filtroMes/filtroAno.
const mostrarSeletorMes = computed(() => abaAtiva.value === 'painel' || abaAtiva.value === 'lancamentos')

const irParaAba = (valor: string) => {
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
  categoriasStore.limpar()
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen font-sans">
    <div class="lg:flex lg:max-w-[1440px] lg:mx-auto">

      <!-- Sidebar (desktop, ≥1024px) -->
      <aside class="hidden lg:flex lg:flex-col lg:w-60 lg:flex-shrink-0 lg:h-screen lg:sticky lg:top-0 lg:border-r lg:border-slate-200 lg:dark:border-white/10 lg:p-6">
        <div class="mb-8">
          <h1 class="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">💸 Gestor Financeiro</h1>
          <p class="text-emerald-600 dark:text-emerald-400 text-xs font-mono mt-1">📱 {{ telefoneFormatado }}</p>
        </div>
        <nav class="flex-1 flex flex-col gap-1" aria-label="Navegação principal">
          <button
            v-for="aba in ABAS" :key="aba.valor" @click="irParaAba(aba.valor)"
            :aria-current="abaAtiva === aba.valor ? 'page' : undefined"
            class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
            :class="abaAtiva === aba.valor
              ? 'bg-emerald-500 text-white'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-900/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'"
          >
            <span class="text-lg leading-none">{{ aba.icone }}</span>
            {{ aba.rotulo }}
          </button>
        </nav>
        <button id="btn-sair" @click="sair"
          class="mt-4 px-3 py-2.5 rounded-xl text-sm font-semibold text-left text-slate-500 dark:text-slate-400 hover:bg-slate-900/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60">
          ← Trocar número
        </button>
      </aside>

      <!-- Conteúdo -->
      <div class="flex-1 min-w-0 p-4 sm:p-8 lg:p-10">

        <!-- Cabeçalho (some no desktop — sidebar já mostra logo/telefone/trocar) -->
        <div class="flex items-start justify-between gap-3 mb-6 lg:hidden">
          <div class="min-w-0">
            <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
              💸 Gestor Financeiro
            </h1>
            <p class="text-emerald-600 dark:text-emerald-400 text-sm font-mono mt-1">
              📱 {{ telefoneFormatado }}
            </p>
          </div>
          <button id="btn-sair-mobile" @click="sair"
            class="flex-shrink-0 bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/20 text-sm font-semibold px-3 sm:px-4 py-2 rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60">
            ← Trocar
          </button>
        </div>

        <!-- Seletor de mês -->
        <div v-if="mostrarSeletorMes" class="flex items-center justify-between gap-2 mb-6 lg:max-w-sm bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-2 py-2">
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

        <!-- Espaço extra embaixo no mobile pra bottom nav não cobrir o último item -->
        <div class="pb-24 lg:pb-0">
          <slot />
        </div>
      </div>
    </div>

    <!-- Bottom nav (mobile/tablet, <1024px) -->
    <nav
      class="lg:hidden fixed inset-x-0 bottom-0 z-40 flex items-stretch bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-white/10"
      aria-label="Navegação principal"
      style="padding-bottom: env(safe-area-inset-bottom)"
    >
      <button
        v-for="aba in PRINCIPAIS" :key="aba.valor" @click="irParaAba(aba.valor)"
        :aria-current="abaAtiva === aba.valor ? 'page' : undefined"
        class="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-inset"
        :class="abaAtiva === aba.valor ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'"
      >
        <span class="text-xl leading-none">{{ aba.icone }}</span>
        {{ aba.rotulo }}
      </button>

      <DropdownMenuRoot>
        <DropdownMenuTrigger as-child>
          <button
            :aria-current="abaSecundariaAtiva ? 'page' : undefined"
            class="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-inset"
            :class="abaSecundariaAtiva ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'"
          >
            <span class="text-xl leading-none">⋯</span>
            Mais
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent
            side="top" :side-offset="8" align="end"
            class="z-50 min-w-48 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl shadow-slate-900/10 dark:shadow-black/40 p-1"
          >
            <DropdownMenuItem
              v-for="aba in SECUNDARIAS" :key="aba.valor" @select="irParaAba(aba.valor)"
              class="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm outline-none cursor-pointer data-[highlighted]:bg-slate-900/5 dark:data-[highlighted]:bg-white/5"
              :class="abaAtiva === aba.valor ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-600 dark:text-slate-300'"
            >
              <span>{{ aba.icone }}</span> {{ aba.rotulo }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>
    </nav>
  </div>
</template>
