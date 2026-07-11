<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGastosStore } from '../stores/gastos'
import type { Transacao } from '../stores/gastos'
import type { DadosEdicaoGasto } from '../services/api'
import AppShell from '../layouts/AppShell.vue'
import GastoItem from '../components/GastoItem.vue'
import CategoriaSelect from '../components/CategoriaSelect.vue'
import ExportarMenu from '../components/ExportarMenu.vue'

const gastosStore = useGastosStore()

// --- Novo gasto ---
const adicionandoAberto = ref(false)
const novaDescricao = ref('')
const novaCategoria = ref('')
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
    // gastosStore.criarGasto() só retorna o registro criado — não o insere em
    // transacoes.value (diferente de excluirGasto/editarGasto, que já
    // atualizam o estado local). Sem este refetch o novo gasto fica invisível
    // na lista até a próxima remontagem do AppShell ou troca de mês. O
    // GastosView.vue original (pré-Task 7) já fazia essa mesma chamada por
    // este exato motivo; ficou de fora da extração literal do brief.
    await gastosStore.buscarGastos(gastosStore.filtroMes, gastosStore.filtroAno)
  }
}

// --- Edição inline ---
const editandoId = ref<number | string | null>(null)
const salvando = ref(false)

const iniciarEdicao = (gasto: Transacao) => {
  editandoId.value = gasto.id
}

const cancelarEdicao = () => {
  editandoId.value = null
}

const salvarEdicao = async (id: number | string, dados: DadosEdicaoGasto) => {
  salvando.value = true
  const sucesso = await gastosStore.editarGasto(id, dados)
  salvando.value = false
  if (sucesso) {
    editandoId.value = null
    mostrarToast('Gasto atualizado ✓')
  }
}

// --- Excluir ---
const excluir = (id: number | string) => {
  gastosStore.marcarParaExcluir(id)
  mostrarToast('Gasto excluído', () => gastosStore.desfazerExclusao(id))
}

// --- Toast de confirmação ---
const toast = ref<string | null>(null)
const acaoToast = ref<(() => void) | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

const mostrarToast = (mensagem: string, acao?: () => void) => {
  toast.value = mensagem
  acaoToast.value = acao ?? null
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = null
    acaoToast.value = null
  }, acao ? 5000 : 2200)
}

const executarAcaoToast = () => {
  acaoToast.value?.()
  toast.value = null
  acaoToast.value = null
  if (toastTimer) clearTimeout(toastTimer)
}
</script>

<template>
  <AppShell>
    <div class="space-y-3">

      <!-- Adicionar gasto pelo portal + exportar -->
      <div v-if="!adicionandoAberto" class="flex gap-2 mb-2">
        <button id="btn-novo-gasto" @click="abrirNovoGasto"
          class="flex-1 py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60">
          + Novo gasto
        </button>
        <ExportarMenu :transacoes="gastosStore.transacoesVisiveis" :mes="gastosStore.filtroMes" :ano="gastosStore.filtroAno" />
      </div>

      <div v-else class="mb-2 bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-lg shadow-slate-900/5 dark:shadow-none">
        <p class="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">💸 Novo gasto</p>
        <div class="space-y-3">
          <input v-model="novaDescricao" type="text" placeholder="Descrição (ex: mercado, uber, netflix)" autofocus
            class="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-emerald-400" />
          <div class="flex gap-2 sm:gap-3">
            <CategoriaSelect v-model="novaCategoria" incluir-automatica />
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

      <div v-if="gastosStore.carregando" class="space-y-3 animate-pulse">
        <div class="h-20 rounded-2xl bg-slate-200/70 dark:bg-white/5"></div>
        <div class="h-20 rounded-2xl bg-slate-200/70 dark:bg-white/5"></div>
        <div class="h-20 rounded-2xl bg-slate-200/70 dark:bg-white/5"></div>
      </div>

      <div v-else-if="gastosStore.erro" class="min-h-[40vh] flex items-center justify-center">
        <div class="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl">
          <p class="text-red-500 dark:text-red-400 font-semibold">{{ gastosStore.erro }}</p>
        </div>
      </div>

      <div v-else class="space-y-3">
        <div v-if="gastosStore.erroAcao" class="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex justify-between items-center gap-3">
          <p class="text-red-500 dark:text-red-400 text-sm font-semibold">{{ gastosStore.erroAcao }}</p>
          <button @click="gastosStore.erroAcao = null"
            class="text-red-500/70 dark:text-red-400/70 hover:text-red-600 dark:hover:text-red-300 text-lg leading-none">
            ✕
          </button>
        </div>

        <GastoItem
          v-for="gasto in gastosStore.transacoesVisiveis" :key="gasto.id"
          :gasto="gasto"
          :editando="editandoId === gasto.id"
          :salvando="salvando"
          @iniciar-edicao="iniciarEdicao"
          @cancelar-edicao="cancelarEdicao"
          @salvar="salvarEdicao"
          @excluir="excluir"
        />

        <div v-if="gastosStore.transacoesVisiveis.length === 0" class="min-h-[40vh] flex flex-col items-center justify-center text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900/5 dark:bg-white/5 mb-4">
            <span class="text-3xl">📭</span>
          </div>
          <p class="text-slate-500 dark:text-slate-400 text-lg font-semibold">Nenhum gasto registrado.</p>
          <p class="text-slate-400 dark:text-slate-600 text-sm mt-2">Mande uma mensagem pelo WhatsApp ou toque em "+ Novo gasto" para começar!</p>
        </div>
      </div>
    </div>

    <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="toast"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl z-50">
        <span>{{ toast }}</span>
        <button v-if="acaoToast" @click="executarAcaoToast" class="ml-3 font-bold text-emerald-400 dark:text-emerald-600 underline underline-offset-2">
          Desfazer
        </button>
      </div>
    </Transition>
  </AppShell>
</template>
