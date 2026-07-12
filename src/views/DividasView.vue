<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useGastosStore } from '../stores/gastos'
import { useDividasStore } from '../stores/dividas'
import AppShell from '../layouts/AppShell.vue'
import DividaItem from '../components/DividaItem.vue'
import CategoriaSelect from '../components/CategoriaSelect.vue'
import type { Divida, DadosEdicaoDivida } from '../services/api'

const gastosStore = useGastosStore()
const dividasStore = useDividasStore()

onMounted(() => {
  dividasStore.buscarDividas(gastosStore.telefone)
})

// --- Nova dívida ---
const adicionandoAberto = ref(false)
const novaDescricao = ref('')
const novaCategoria = ref('')
const novoValorParcela = ref('')
const novoTotalParcelas = ref('')
const novaDataPrimeiraParcela = ref('')
const criando = ref(false)

const novaDividaValida = computed(() => {
  const valor = Number(novoValorParcela.value.replace(',', '.'))
  const total = Number(novoTotalParcelas.value)
  return (
    novaDescricao.value.trim().length > 0 &&
    valor > 0 &&
    Number.isInteger(total) && total > 0 &&
    novaDataPrimeiraParcela.value.length > 0
  )
})

const abrirNovaDivida = () => {
  adicionandoAberto.value = true
  novaDescricao.value = ''
  novaCategoria.value = ''
  novoValorParcela.value = ''
  novoTotalParcelas.value = ''
  novaDataPrimeiraParcela.value = ''
}

const cancelarNovaDivida = () => {
  adicionandoAberto.value = false
}

const confirmarNovaDivida = async () => {
  if (!novaDividaValida.value) return
  criando.value = true
  const criada = await dividasStore.criarDivida(gastosStore.telefone, {
    descricao: novaDescricao.value.trim(),
    categoria: novaCategoria.value || undefined,
    valor_parcela: Number(novoValorParcela.value.replace(',', '.')),
    total_parcelas: Number(novoTotalParcelas.value),
    data_primeira_parcela: novaDataPrimeiraParcela.value,
  })
  criando.value = false
  if (criada) {
    adicionandoAberto.value = false
  }
}

// --- Edição inline ---
const editandoId = ref<number | null>(null)
const salvando = ref(false)

const iniciarEdicao = (divida: Divida) => {
  editandoId.value = divida.id
}

const cancelarEdicao = () => {
  editandoId.value = null
}

const salvarEdicao = async (id: number, dados: DadosEdicaoDivida) => {
  salvando.value = true
  const sucesso = await dividasStore.editarDivida(id, gastosStore.telefone, dados)
  salvando.value = false
  if (sucesso) editandoId.value = null
}

// --- Excluir ---
const excluir = async (id: number) => {
  if (!confirm('Excluir esta dívida? Essa ação não pode ser desfeita.')) return
  await dividasStore.excluirDivida(id, gastosStore.telefone)
}

// --- Lançar parcela agora ---
const lancarParcela = async (id: number) => {
  await dividasStore.lancarParcela(id)
}
</script>

<template>
  <AppShell>
    <div class="space-y-4">

      <div v-motion :initial="{ opacity: 0, y: 12 }" :enter="{ opacity: 1, y: 0, transition: { duration: 300 } }"
        class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-3">
          <div class="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-violet-500/10">
            <span class="text-xl">💳</span>
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">Dívidas parceladas</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">Parcelamentos em andamento</p>
          </div>
        </div>
        <button v-if="!adicionandoAberto" @click="abrirNovaDivida"
          class="px-3 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-violet-600 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60">
          + Nova
        </button>
      </div>

      <div v-if="adicionandoAberto" class="p-4 bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl space-y-3">
        <input v-model="novaDescricao" type="text" placeholder="Descrição (ex: Geladeira em 10x)"
          class="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-violet-400" />
        <div class="flex gap-2 sm:gap-3">
          <CategoriaSelect v-model="novaCategoria" incluir-automatica />
          <input v-model="novoValorParcela" type="text" inputmode="decimal" placeholder="Valor da parcela"
            class="w-32 flex-shrink-0 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-violet-400" />
        </div>
        <div class="flex gap-2 sm:gap-3">
          <input v-model="novoTotalParcelas" type="text" inputmode="numeric" placeholder="Total de parcelas"
            class="w-32 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-violet-400" />
          <input v-model="novaDataPrimeiraParcela" type="date"
            class="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-violet-400" />
        </div>
        <div class="flex justify-end gap-2">
          <button @click="cancelarNovaDivida" :disabled="criando"
            class="px-4 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 rounded-lg">
            Cancelar
          </button>
          <button @click="confirmarNovaDivida" :disabled="!novaDividaValida || criando"
            class="px-4 py-2 text-sm font-bold text-white bg-violet-600 hover:bg-violet-500 rounded-xl transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60">
            {{ criando ? 'Criando...' : 'Criar' }}
          </button>
        </div>
      </div>

      <div v-if="dividasStore.erroAcao" class="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
        <p class="text-red-500 dark:text-red-400 text-sm font-semibold">{{ dividasStore.erroAcao }}</p>
      </div>

      <div v-if="dividasStore.carregando" class="space-y-3 animate-pulse">
        <div class="h-20 rounded-2xl bg-slate-200/70 dark:bg-white/5"></div>
        <div class="h-20 rounded-2xl bg-slate-200/70 dark:bg-white/5"></div>
      </div>

      <div v-else-if="dividasStore.erro" class="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
        <p class="text-red-500 dark:text-red-400 text-sm font-semibold">{{ dividasStore.erro }}</p>
      </div>

      <div v-else-if="dividasStore.dividas.length === 0" class="min-h-[30vh] flex flex-col items-center justify-center text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900/5 dark:bg-white/5 mb-4">
          <span class="text-3xl">💳</span>
        </div>
        <p class="text-slate-500 dark:text-slate-400 text-lg font-semibold">Nenhuma dívida cadastrada.</p>
      </div>

      <div v-else class="space-y-3">
        <DividaItem
          v-for="divida in dividasStore.dividas" :key="divida.id"
          :divida="divida"
          :editando="editandoId === divida.id"
          :salvando="salvando"
          @iniciar-edicao="iniciarEdicao"
          @cancelar-edicao="cancelarEdicao"
          @salvar="salvarEdicao"
          @excluir="excluir"
          @lancar-parcela="lancarParcela"
        />
      </div>

    </div>
  </AppShell>
</template>
