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
const novoTipo = ref<'despesa' | 'receita'>('despesa')
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
  novoTipo.value = 'despesa'
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
    tipo: novoTipo.value,
  })
  criando.value = false
  if (criado) {
    adicionandoAberto.value = false
    const label = novoTipo.value === 'receita' ? 'Receita adicionada' : 'Gasto adicionado'
    mostrarToast(`${label} (${criado.categoria}) ✓`)
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

// --- Toasts de confirmação ---
// Fila (não um único slot): excluir dois itens em sequência não pode fazer o
// segundo toast apagar a chance de desfazer o primeiro.
interface ToastItem {
  id: number
  mensagem: string
  acao?: () => void
}

let proximoToastId = 0
const toasts = ref<ToastItem[]>([])

const mostrarToast = (mensagem: string, acao?: () => void) => {
  const id = proximoToastId++
  toasts.value.push({ id, mensagem, acao })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, acao ? 5000 : 2200)
}

const executarAcaoToast = (item: ToastItem) => {
  item.acao?.()
  toasts.value = toasts.value.filter((t) => t.id !== item.id)
}
</script>

<template>
  <AppShell>
    <div class="space-y-3">

      <!-- Botão principal: muda label e gradiente conforme tipo selecionado -->
      <div v-if="!adicionandoAberto" class="flex gap-2 mb-2">
        <button id="btn-novo-lancamento" @click="abrirNovoGasto"
          class="flex-1 py-3.5 rounded-2xl font-bold text-white shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
          :class="novoTipo === 'receita'
            ? 'bg-gradient-to-r from-sky-500 to-sky-600 shadow-sky-500/20 hover:shadow-sky-500/40'
            : 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/20 hover:shadow-emerald-500/40'">
          + Novo lançamento
        </button>
        <ExportarMenu :transacoes="gastosStore.transacoesVisiveis" :mes="gastosStore.filtroMes" :ano="gastosStore.filtroAno" />
      </div>

      <div v-else class="mb-2 bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-lg shadow-slate-900/5 dark:shadow-none">
        <!-- Toggle despesa / receita -->
        <div class="flex gap-1 mb-4 bg-slate-100 dark:bg-white/5 rounded-xl p-1">
          <button id="btn-tipo-despesa"
            @click="novoTipo = 'despesa'"
            class="flex-1 py-1.5 rounded-lg text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
            :class="novoTipo === 'despesa'
              ? 'bg-white dark:bg-white/15 text-red-500 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'">
            💸 Despesa
          </button>
          <button id="btn-tipo-receita"
            @click="novoTipo = 'receita'"
            class="flex-1 py-1.5 rounded-lg text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
            :class="novoTipo === 'receita'
              ? 'bg-white dark:bg-white/15 text-sky-500 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'">
            💰 Receita
          </button>
        </div>

        <div class="space-y-3">
          <input v-model="novaDescricao" type="text"
            :placeholder="novoTipo === 'receita' ? 'Descrição (ex: salário, freelance, aluguel)' : 'Descrição (ex: mercado, uber, netflix)'"
            autofocus
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
              class="px-4 py-2 text-sm font-bold text-white rounded-xl transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
              :class="novoTipo === 'receita' ? 'bg-sky-600 hover:bg-sky-500 focus-visible:ring-sky-400/60' : 'bg-emerald-600 hover:bg-emerald-500'">
              {{ criando ? 'Adicionando...' : (novoTipo === 'receita' ? 'Adicionar receita' : 'Adicionar despesa') }}
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
          <p class="text-slate-500 dark:text-slate-400 text-lg font-semibold">Nenhum lançamento registrado.</p>
          <p class="text-slate-400 dark:text-slate-600 text-sm mt-2">Mande uma mensagem pelo WhatsApp ou toque em "+ Novo lançamento" para começar!</p>
        </div>
      </div>
    </div>

    <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
      <TransitionGroup enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-for="item in toasts" :key="item.id"
          class="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl">
          <span>{{ item.mensagem }}</span>
          <button v-if="item.acao" @click="executarAcaoToast(item)" class="ml-3 font-bold text-emerald-400 dark:text-emerald-600 underline underline-offset-2">
            Desfazer
          </button>
        </div>
      </TransitionGroup>
    </div>
  </AppShell>
</template>
