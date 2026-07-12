<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useGastosStore } from '../stores/gastos'
import { useContasFixasStore } from '../stores/contasFixas'
import AppShell from '../layouts/AppShell.vue'
import ContaFixaItem from '../components/ContaFixaItem.vue'
import CategoriaSelect from '../components/CategoriaSelect.vue'
import type { ContaFixa, DadosEdicaoContaFixa } from '../services/api'

const gastosStore = useGastosStore()
const contasFixasStore = useContasFixasStore()

onMounted(() => {
  contasFixasStore.buscarContas(gastosStore.telefone)
})

// --- Nova conta fixa ---
const adicionandoAberto = ref(false)
const novaDescricao = ref('')
const novaCategoria = ref('')
const novoValor = ref('')
const novoDiaVencimento = ref('')
const novoLancamentoAutomatico = ref(false)
const novoDiasLembrete = ref('3')
const criando = ref(false)

const novaContaValida = computed(() => {
  const valor = Number(novoValor.value.replace(',', '.'))
  const dia = Number(novoDiaVencimento.value)
  return (
    novaDescricao.value.trim().length > 0 &&
    valor > 0 &&
    Number.isInteger(dia) && dia >= 1 && dia <= 31
  )
})

const abrirNovaConta = () => {
  adicionandoAberto.value = true
  novaDescricao.value = ''
  novaCategoria.value = 'Moradia'
  novoValor.value = ''
  novoDiaVencimento.value = ''
  novoLancamentoAutomatico.value = false
  novoDiasLembrete.value = '3'
}

const cancelarNovaConta = () => {
  adicionandoAberto.value = false
}

const confirmarNovaConta = async () => {
  if (!novaContaValida.value) return
  criando.value = true
  const criada = await contasFixasStore.criarConta(gastosStore.telefone, {
    descricao: novaDescricao.value.trim(),
    categoria: novaCategoria.value || 'Moradia',
    valor: Number(novoValor.value.replace(',', '.')),
    dia_vencimento: Number(novoDiaVencimento.value),
    lancamento_automatico: novoLancamentoAutomatico.value,
    dias_lembrete_antes: Number(novoDiasLembrete.value) || 3
  })
  criando.value = false
  if (criada) {
    adicionandoAberto.value = false
  }
}

// --- Edição inline ---
const editandoId = ref<number | null>(null)
const salvando = ref(false)

const iniciarEdicao = (conta: ContaFixa) => {
  editandoId.value = conta.id
}

const cancelarEdicao = () => {
  editandoId.value = null
}

const salvarEdicao = async (id: number, dados: DadosEdicaoContaFixa) => {
  salvando.value = true
  const sucesso = await contasFixasStore.editarConta(id, gastosStore.telefone, dados)
  salvando.value = false
  if (sucesso) editandoId.value = null
}

// --- Excluir ---
const excluir = async (id: number) => {
  if (!confirm('Excluir esta conta fixa? Essa ação não pode ser desfeita.')) return
  await contasFixasStore.excluirConta(id, gastosStore.telefone)
}

// --- Lançar agora ---
const lancarPagamento = async (id: number) => {
  await contasFixasStore.lancarPagamento(id)
}
</script>

<template>
  <AppShell>
    <div class="space-y-4">

      <div v-motion :initial="{ opacity: 0, y: 12 }" :enter="{ opacity: 1, y: 0, transition: { duration: 300 } }"
        class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-3">
          <div class="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10">
            <span class="text-xl">🔁</span>
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">Contas Fixas</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">Despesas recorrentes do mês</p>
          </div>
        </div>
        <button v-if="!adicionandoAberto" @click="abrirNovaConta"
          class="px-3 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60">
          + Nova
        </button>
      </div>

      <div v-if="adicionandoAberto" class="p-4 bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl space-y-3">
        <input v-model="novaDescricao" type="text" placeholder="Descrição (ex: Aluguel, Internet)"
          class="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-amber-400" />
        <div class="flex gap-2 sm:gap-3">
          <CategoriaSelect v-model="novaCategoria" incluir-automatica />
          <input v-model="novoValor" type="text" inputmode="decimal" placeholder="Valor"
            class="w-32 flex-shrink-0 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-amber-400" />
        </div>
        <div class="flex gap-2 sm:gap-3">
          <input v-model="novoDiaVencimento" type="number" min="1" max="31" placeholder="Vencimento (dia)" title="Dia do vencimento"
            class="w-1/2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-amber-400" />
          <input v-model="novoDiasLembrete" type="number" min="0" max="15" placeholder="Avisar em (dias)" title="Quantos dias antes avisar no WhatsApp"
            class="w-1/2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-amber-400" />
        </div>
        <div class="flex items-center gap-2 pt-1 pb-2">
          <input type="checkbox" id="auto_create" v-model="novoLancamentoAutomatico" class="accent-amber-500 w-4 h-4" />
          <label for="auto_create" class="text-sm text-slate-700 dark:text-slate-300">Lançamento automático</label>
        </div>
        <div class="flex justify-end gap-2">
          <button @click="cancelarNovaConta" :disabled="criando"
            class="px-4 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 rounded-lg">
            Cancelar
          </button>
          <button @click="confirmarNovaConta" :disabled="!novaContaValida || criando"
            class="px-4 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60">
            {{ criando ? 'Criando...' : 'Criar' }}
          </button>
        </div>
      </div>

      <div v-if="contasFixasStore.erroAcao" class="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
        <p class="text-red-500 dark:text-red-400 text-sm font-semibold">{{ contasFixasStore.erroAcao }}</p>
      </div>

      <div v-if="contasFixasStore.carregando" class="space-y-3 animate-pulse">
        <div class="h-24 rounded-2xl bg-slate-200/70 dark:bg-white/5"></div>
        <div class="h-24 rounded-2xl bg-slate-200/70 dark:bg-white/5"></div>
      </div>

      <div v-else-if="contasFixasStore.erro" class="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
        <p class="text-red-500 dark:text-red-400 text-sm font-semibold">{{ contasFixasStore.erro }}</p>
      </div>

      <div v-else-if="contasFixasStore.contasFixas.length === 0" class="min-h-[30vh] flex flex-col items-center justify-center text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900/5 dark:bg-white/5 mb-4">
          <span class="text-3xl">🔁</span>
        </div>
        <p class="text-slate-500 dark:text-slate-400 text-lg font-semibold">Nenhuma conta fixa cadastrada.</p>
        <p class="text-slate-400 dark:text-slate-500 text-sm max-w-xs mt-2">Cadastre contas recorrentes como aluguel e assinaturas para ser lembrado pelo WhatsApp.</p>
      </div>

      <div v-else class="space-y-3">
        <ContaFixaItem
          v-for="conta in contasFixasStore.contasFixas" :key="conta.id"
          :conta="conta"
          :editando="editandoId === conta.id"
          :salvando="salvando"
          @iniciar-edicao="iniciarEdicao"
          @cancelar-edicao="cancelarEdicao"
          @salvar="salvarEdicao"
          @excluir="excluir"
          @lancar-pagamento="lancarPagamento"
        />
      </div>

    </div>
  </AppShell>
</template>
