<script setup lang="ts">
import { ref } from 'vue'
import type { ContaFixa, DadosEdicaoContaFixa } from '../services/api'
import { iconeDaCategoria } from '../theme/categorias'
import { formatarMoeda } from '../utils/formatarMoeda'
import CategoriaSelect from './CategoriaSelect.vue'

const props = defineProps<{
  conta: ContaFixa
  editando: boolean
  salvando: boolean
}>()

const emit = defineEmits<{
  'iniciar-edicao': [conta: ContaFixa]
  'cancelar-edicao': []
  salvar: [id: number, dados: DadosEdicaoContaFixa]
  excluir: [id: number]
  'lancar-pagamento': [id: number]
}>()

const formDescricao = ref('')
const formCategoria = ref('')
const formValor = ref('')
const formDiaVencimento = ref('')
const formLancamentoAutomatico = ref(false)
const formDiasLembrete = ref('')

const iniciarEdicao = () => {
  formDescricao.value = props.conta.descricao
  formCategoria.value = props.conta.categoria
  formValor.value = String(props.conta.valor)
  formDiaVencimento.value = String(props.conta.dia_vencimento)
  formLancamentoAutomatico.value = Boolean(props.conta.lancamento_automatico)
  formDiasLembrete.value = String(props.conta.dias_lembrete_antes)
  emit('iniciar-edicao', props.conta)
}

const salvar = () => {
  emit('salvar', props.conta.id, {
    descricao: formDescricao.value.trim(),
    categoria: formCategoria.value,
    valor: Number(formValor.value.replace(',', '.')),
    dia_vencimento: Number(formDiaVencimento.value),
    lancamento_automatico: formLancamentoAutomatico.value,
    dias_lembrete_antes: Number(formDiasLembrete.value)
  })
}
</script>

<template>
  <div class="p-4 bg-white/70 dark:bg-white/5 backdrop-blur-sm rounded-2xl border border-slate-200/70 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-all duration-200">

    <!-- Modo edição -->
    <div v-if="editando" class="space-y-3">
      <input v-model="formDescricao" type="text" placeholder="Descrição"
        class="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2 outline-none focus:border-amber-400" />
      <div class="flex gap-2 sm:gap-3">
        <CategoriaSelect v-model="formCategoria" />
        <input v-model="formValor" type="text" inputmode="decimal" placeholder="Valor"
          class="w-28 sm:w-32 flex-shrink-0 min-w-0 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2 outline-none focus:border-amber-400" />
      </div>
      <div class="flex gap-2 sm:gap-3">
        <input v-model="formDiaVencimento" type="number" min="1" max="31" placeholder="Dia Vencimento" title="Dia do vencimento"
          class="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2 outline-none focus:border-amber-400" />
        <input v-model="formDiasLembrete" type="number" min="0" max="15" placeholder="Dias Lembrete" title="Dias para avisar antes do vencimento"
          class="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2 outline-none focus:border-amber-400" />
      </div>
      <div class="flex items-center gap-2 pt-1 pb-2">
        <input type="checkbox" id="auto_edit" v-model="formLancamentoAutomatico" class="accent-amber-500 w-4 h-4" />
        <label for="auto_edit" class="text-sm text-slate-700 dark:text-slate-300">Lançamento automático</label>
      </div>
      <div class="flex justify-end gap-2">
        <button @click="emit('cancelar-edicao')" :disabled="salvando"
          class="px-4 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 rounded-lg">
          Cancelar
        </button>
        <button @click="salvar" :disabled="salvando"
          class="px-4 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60">
          {{ salvando ? 'Salvando...' : 'Salvar' }}
        </button>
      </div>
    </div>

    <!-- Modo visualização -->
    <div v-else>
      <div class="flex items-start justify-between gap-3 mb-1">
        <div class="flex items-start gap-3 min-w-0">
          <span class="text-xl leading-none mt-0.5 flex-shrink-0">{{ iconeDaCategoria(conta.categoria) }}</span>
          <div class="flex flex-col min-w-0">
            <span class="text-base font-bold text-slate-800 dark:text-slate-200 truncate">{{ conta.descricao }}</span>
            <span class="text-xs text-slate-400 dark:text-slate-500">{{ conta.categoria }}</span>
          </div>
        </div>
        <div class="flex items-center gap-1 flex-shrink-0">
          <button v-if="conta.ativa && !conta.paga_neste_mes" @click="emit('lancar-pagamento', conta.id)"
            class="p-2 text-slate-400 dark:text-slate-500 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
            title="Lançar pagamento agora">
            ✅
          </button>
          <button @click="iniciarEdicao"
            class="p-2 text-slate-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
            title="Editar conta fixa">
            ✏️
          </button>
          <button @click="emit('excluir', conta.id)"
            class="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
            title="Excluir conta fixa">
            🗑️
          </button>
        </div>
      </div>

      <div class="flex items-center justify-between mt-3">
        <p class="text-sm font-semibold" :class="conta.paga_neste_mes ? 'text-emerald-500' : (conta.ativa ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400')">
          {{ formatarMoeda(Number(conta.valor)) }}
        </p>
        <p class="text-xs text-slate-400 dark:text-slate-500 font-mono flex items-center gap-2">
          <span>Vence dia {{ String(conta.dia_vencimento).padStart(2, '0') }}</span>
          <span v-if="!conta.ativa" class="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-500">Inativa</span>
          <span v-else-if="conta.paga_neste_mes" class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Pago no mês</span>
          <span v-else class="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">Pendente</span>
        </p>
      </div>
      <div v-if="conta.lancamento_automatico" class="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
        🤖 Lançamento automático ativado
      </div>
    </div>
  </div>
</template>
