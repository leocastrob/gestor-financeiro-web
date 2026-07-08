<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGastosStore, CATEGORIAS, type Transacao } from '../stores/gastos'
import { corDaCategoria, iconeDaCategoria } from '../theme/categorias'
import { formatarMoeda } from '../utils/formatarMoeda'
import { useTema } from '../composables/useTema'
import * as api from '../services/api'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Doughnut } from 'vue-chartjs'

ChartJS.register(ArcElement, Tooltip, Legend)

const router = useRouter()
const gastosStore = useGastosStore()
const { tema } = useTema()

const meses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const mesAtual = new Date().getMonth() + 1
const anoAtual = new Date().getFullYear()

const filtroMes = ref(mesAtual)
const filtroAno = ref(anoAtual)

const mesAnterior = () => {
  if (filtroMes.value === 1) {
    filtroMes.value = 12
    filtroAno.value -= 1
  } else {
    filtroMes.value -= 1
  }
}

const proximoMes = () => {
  if (filtroMes.value === 12) {
    filtroMes.value = 1
    filtroAno.value += 1
  } else {
    filtroMes.value += 1
  }
}

// --- Comparativo com o mês anterior (stat tile) ---
const totalMesAnterior = ref<number | null>(null)

const buscarTotalMesAnterior = async () => {
  let mes = filtroMes.value - 1
  let ano = filtroAno.value
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

// --- Gráfico de categorias (cores fixas por nome, nunca por posição) ---
const dadosGrafico = computed(() => {
  const contagem: Record<string, number> = {}

  gastosStore.transacoes.forEach((g) => {
    const cat = g.categoria || 'Outros'
    const valor = Number(g.valor)
    if (!contagem[cat]) contagem[cat] = 0
    contagem[cat] += valor
  })

  const categorias = Object.keys(contagem)
  const corGap = tema.value === 'dark' ? '#1e293b' : '#ffffff'

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

// --- Edição inline de um gasto ---
const editandoId = ref<number | string | null>(null)
const formDescricao = ref('')
const formCategoria = ref('')
const formValor = ref('')
const salvando = ref(false)

const iniciarEdicao = (gasto: Transacao) => {
  editandoId.value = gasto.id
  formDescricao.value = gasto.descricao
  formCategoria.value = gasto.categoria || 'Outros'
  formValor.value = String(gasto.valor)
}

const cancelarEdicao = () => {
  editandoId.value = null
}

// --- Novo gasto (adicionar direto pelo portal, sem precisar do WhatsApp) ---
const adicionandoAberto = ref(false)
const novaDescricao = ref('')
const novaCategoria = ref('') // vazio = categorização automática (mesma lógica do bot)
const novoValor = ref('')
const criando = ref(false)

const novoGastoValido = computed(() => {
  const valor = Number(novoValor.value.replace(',', '.'))
  return novaDescricao.value.trim().length > 0 && valor > 0
})

const abrirNovoGasto = () => {
  adicionandoAberto.value = true
  novaDescricao.value = ''
  novaCategoria.value = ''
  novoValor.value = ''
}

const cancelarNovoGasto = () => {
  adicionandoAberto.value = false
}

const confirmarNovoGasto = async () => {
  if (!novoGastoValido.value) return
  criando.value = true
  const criado = await gastosStore.criarGasto({
    descricao: novaDescricao.value.trim(),
    valor: Number(novoValor.value.replace(',', '.')),
    categoria: novaCategoria.value || undefined,
  })
  criando.value = false
  if (criado) {
    adicionandoAberto.value = false
    mostrarToast(`Gasto adicionado (${criado.categoria}) ✓`)
    await gastosStore.buscarGastos(filtroMes.value, filtroAno.value)
    await buscarTotalMesAnterior()
  }
}

// --- Toast de confirmação de ação ---
const toast = ref<string | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

const mostrarToast = (mensagem: string) => {
  toast.value = mensagem
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = null
  }, 2200)
}

const salvarEdicao = async (id: number | string) => {
  salvando.value = true
  const sucesso = await gastosStore.editarGasto(id, {
    descricao: formDescricao.value.trim(),
    categoria: formCategoria.value,
    valor: Number(formValor.value.replace(',', '.')),
  })
  salvando.value = false
  if (sucesso) {
    editandoId.value = null
    mostrarToast('Gasto atualizado ✓')
  }
}

const excluir = async (id: number | string) => {
  await gastosStore.excluirGasto(id)
  if (!gastosStore.erroAcao) mostrarToast('Gasto excluído ✓')
}

// Dispara a busca sempre que o mês ou ano mudar
watch([filtroMes, filtroAno], () => {
  gastosStore.buscarGastos(filtroMes.value, filtroAno.value)
  buscarTotalMesAnterior()
})

// Formata o telefone para exibição: +55 12 98872-3791
const telefoneFormatado = () => {
  const n = gastosStore.telefone || ''
  if (n.length <= 2) return `+${n}`
  if (n.length <= 4) return `+${n.slice(0, 2)} ${n.slice(2)}`
  if (n.length <= 9) return `+${n.slice(0, 2)} ${n.slice(2, 4)} ${n.slice(4)}`
  return `+${n.slice(0, 2)} ${n.slice(2, 4)} ${n.slice(4, 9)}-${n.slice(9)}`
}

const sair = () => {
  gastosStore.logout()
  router.push('/')
}

onMounted(() => {
  gastosStore.buscarGastos(filtroMes.value, filtroAno.value)
  buscarTotalMesAnterior()
})
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
            📱 {{ telefoneFormatado() }}
          </p>
        </div>
        <button id="btn-sair" @click="sair"
          class="flex-shrink-0 bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/20 text-sm font-semibold px-3 sm:px-4 py-2 rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60">
          ← Trocar
        </button>
      </div>

      <!-- Seletor de mês -->
      <div
        class="flex items-center justify-between gap-2 mb-6 bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-2 py-2">
        <button @click="mesAnterior" aria-label="Mês anterior"
          class="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-900/5 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60">
          ‹
        </button>
        <span class="font-semibold text-slate-800 dark:text-slate-100 text-sm sm:text-base">
          {{ meses[filtroMes - 1] }} de {{ filtroAno }}
        </span>
        <button @click="proximoMes" aria-label="Próximo mês"
          class="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-900/5 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60">
          ›
        </button>
      </div>

      <!-- Adicionar gasto pelo portal -->
      <div v-if="!adicionandoAberto" class="mb-6">
        <button id="btn-novo-gasto" @click="abrirNovoGasto"
          class="w-full py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60">
          + Novo gasto
        </button>
      </div>

      <div v-else class="mb-6 bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-lg shadow-slate-900/5 dark:shadow-none">
        <p class="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">💸 Novo gasto</p>
        <div class="space-y-3">
          <input v-model="novaDescricao" type="text" placeholder="Descrição (ex: mercado, uber, netflix)" autofocus
            class="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-emerald-400" />
          <div class="flex gap-2 sm:gap-3">
            <select v-model="novaCategoria"
              class="select-chevron min-w-0 flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-emerald-400 appearance-none">
              <option value="" class="bg-white dark:bg-slate-800">🤖 Automática</option>
              <option v-for="cat in CATEGORIAS" :key="cat" :value="cat" class="bg-white dark:bg-slate-800">{{ iconeDaCategoria(cat) }} {{ cat }}</option>
            </select>
            <input v-model="novoValor" type="text" inputmode="decimal" placeholder="Valor"
              class="w-24 sm:w-28 flex-shrink-0 min-w-0 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-emerald-400" />
          </div>
          <div class="flex justify-end gap-2">
            <button @click="cancelarNovoGasto" :disabled="criando"
              class="px-4 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 rounded-lg">
              Cancelar
            </button>
            <button @click="confirmarNovoGasto" :disabled="!novoGastoValido || criando"
              class="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60">
              {{ criando ? 'Adicionando...' : 'Adicionar' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Estado de Carregamento: skeleton no formato dos cards reais -->
      <div v-if="gastosStore.carregando" class="space-y-3 animate-pulse">
        <div class="h-24 rounded-2xl bg-slate-200/70 dark:bg-white/5"></div>
        <div class="h-64 rounded-2xl bg-slate-200/70 dark:bg-white/5"></div>
        <div class="h-20 rounded-2xl bg-slate-200/70 dark:bg-white/5"></div>
        <div class="h-20 rounded-2xl bg-slate-200/70 dark:bg-white/5"></div>
        <div class="h-20 rounded-2xl bg-slate-200/70 dark:bg-white/5"></div>
      </div>

      <!-- Estado de Erro -->
      <div v-else-if="gastosStore.erro"
        class="min-h-[40vh] flex items-center justify-center">
        <div class="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl">
          <p class="text-red-500 dark:text-red-400 font-semibold">{{ gastosStore.erro }}</p>
        </div>
      </div>

      <!-- Lista de Gastos -->
      <div v-else class="space-y-3">

        <!-- Erro de uma ação pontual (excluir/editar) -->
        <div v-if="gastosStore.erroAcao"
          class="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex justify-between items-center gap-3">
          <p class="text-red-500 dark:text-red-400 text-sm font-semibold">{{ gastosStore.erroAcao }}</p>
          <button @click="gastosStore.erroAcao = null"
            class="text-red-500/70 dark:text-red-400/70 hover:text-red-600 dark:hover:text-red-300 text-lg leading-none">
            ✕
          </button>
        </div>

        <!-- Card de Total (stat tile com comparativo) -->
        <div v-if="gastosStore.transacoes.length > 0"
          class="bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 border border-emerald-500/20 rounded-2xl p-5 flex justify-between items-center mb-2">
          <div>
            <p class="text-emerald-700/80 dark:text-emerald-400/70 text-xs font-semibold uppercase tracking-wider">Total gasto</p>
            <p class="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {{ formatarMoeda(gastosStore.totalGastosNumerico) }}
            </p>
            <p v-if="variacaoPercentual !== null" class="text-xs font-semibold mt-1.5" :class="variacaoPercentual > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'">
              {{ variacaoPercentual > 0 ? '↑' : variacaoPercentual < 0 ? '↓' : '→' }}
              {{ Math.abs(variacaoPercentual).toFixed(0) }}% vs. {{ meses[(filtroMes - 2 + 12) % 12] }}
            </p>
          </div>
          <div class="text-right">
            <p class="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">Registros</p>
            <p class="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1">{{ gastosStore.transacoes.length }}</p>
          </div>
        </div>

        <!-- Gráfico de Categorias -->
        <div v-if="gastosStore.transacoes.length > 0"
          class="bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 mb-4 h-64">
          <Doughnut :data="dadosGrafico" :options="opcoesGrafico" />
        </div>

        <!-- Itens -->
        <div v-for="gasto in gastosStore.transacoes" :key="gasto.id"
          class="p-4 bg-white/70 dark:bg-white/5 backdrop-blur-sm rounded-2xl border border-slate-200/70 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 hover:bg-white/90 dark:hover:bg-white/[0.07] transition-all duration-200">

          <!-- Modo edição -->
          <div v-if="editandoId === gasto.id" class="space-y-3">
            <input v-model="formDescricao" type="text" placeholder="Descrição"
              class="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-400" />
            <div class="flex gap-2 sm:gap-3">
              <select v-model="formCategoria"
                class="select-chevron min-w-0 flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-400 appearance-none">
                <option v-for="cat in CATEGORIAS" :key="cat" :value="cat" class="bg-white dark:bg-slate-800">{{ iconeDaCategoria(cat) }} {{ cat }}</option>
              </select>
              <input v-model="formValor" type="text" inputmode="decimal" placeholder="Valor"
                class="w-24 sm:w-28 flex-shrink-0 min-w-0 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-400" />
            </div>
            <div class="flex justify-end gap-2">
              <button @click="cancelarEdicao" :disabled="salvando"
                class="px-4 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 rounded-lg">
                Cancelar
              </button>
              <button @click="salvarEdicao(gasto.id)" :disabled="salvando"
                class="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60">
                {{ salvando ? 'Salvando...' : 'Salvar' }}
              </button>
            </div>
          </div>

          <!-- Modo visualização -->
          <div v-else class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div class="flex items-start gap-3 min-w-0">
              <span class="text-xl leading-none mt-0.5 flex-shrink-0">{{ iconeDaCategoria(gasto.categoria) }}</span>
              <div class="flex flex-col min-w-0">
                <span class="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 truncate">{{ gasto.descricao }}</span>
                <div class="flex items-center gap-2 mt-1 flex-wrap">
                  <span class="text-xs px-2 py-0.5 rounded-md font-medium"
                    :style="{ backgroundColor: corDaCategoria(gasto.categoria) + '26', color: corDaCategoria(gasto.categoria) }">
                    {{ gasto.categoria || 'Outros' }}
                  </span>
                  <span class="text-xs text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">
                    {{ new Date(gasto.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) }}
                  </span>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between sm:justify-end gap-2 pl-8 sm:pl-0">
              <div class="text-lg sm:text-xl font-black text-slate-700 dark:text-slate-200">
                {{ formatarMoeda(gasto.valor) }}
              </div>
              <div class="flex items-center gap-1 flex-shrink-0">
                <button @click="iniciarEdicao(gasto)"
                  class="p-2 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                  title="Editar gasto">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button @click="excluir(gasto.id)"
                  class="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
                  title="Excluir gasto">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Vazio -->
        <div v-if="gastosStore.transacoes.length === 0" class="min-h-[40vh] flex flex-col items-center justify-center text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900/5 dark:bg-white/5 mb-4">
            <span class="text-3xl">📭</span>
          </div>
          <p class="text-slate-500 dark:text-slate-400 text-lg font-semibold">Nenhum gasto registrado.</p>
          <p class="text-slate-400 dark:text-slate-600 text-sm mt-2">Mande uma mensagem pelo WhatsApp ou toque em "+ Novo gasto" para começar!</p>
        </div>
      </div>

    </div>

    <!-- Toast de confirmação -->
    <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="toast"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl z-50">
        {{ toast }}
      </div>
    </Transition>
  </div>
</template>
