<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGastosStore } from '../stores/gastos'
import AppShell from '../layouts/AppShell.vue'
import * as api from '../services/api'
import type { PreviewExtratoResponse, MapeamentoCSV, ImportarExtratoResponse } from '../services/api'

const gastosStore = useGastosStore()

// --- Estado do fluxo ---
type Etapa = 'upload' | 'preview' | 'mapeamento' | 'importando' | 'resultado'
const etapa = ref<Etapa>('upload')

// --- Upload ---
const arquivo = ref<File | null>(null)
const arrastando = ref(false)
const erroUpload = ref<string | null>(null)

// --- Preview ---
const preview = ref<PreviewExtratoResponse | null>(null)
const erroPreview = ref<string | null>(null)
const carregandoPreview = ref(false)

// --- Mapeamento CSV ---
const colunaData = ref('')
const colunaDescricao = ref('')
const colunaValor = ref('')
const colunaIdentificador = ref('')
const formatoData = ref('DD/MM/YYYY')
const nomeBanco = ref('')

// --- Resultado ---
const resultado = ref<ImportarExtratoResponse | null>(null)
const erroImportacao = ref<string | null>(null)

const formatosAceitos = '.ofx,.csv'

const nomeArquivoExibido = computed(() => {
  if (!arquivo.value) return ''
  return arquivo.value.name
})

const mapeamentoValido = computed(() => {
  return colunaData.value && colunaDescricao.value && colunaValor.value
})

// --- Handlers ---
const selecionarArquivo = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    arquivo.value = input.files[0]
    erroUpload.value = null
  }
}

const aoSoltar = (event: DragEvent) => {
  arrastando.value = false
  const files = event.dataTransfer?.files
  if (files && files[0]) {
    const nome = files[0].name.toLowerCase()
    if (nome.endsWith('.ofx') || nome.endsWith('.csv')) {
      arquivo.value = files[0]
      erroUpload.value = null
    } else {
      erroUpload.value = 'Formato não suportado. Use .ofx ou .csv.'
    }
  }
}

const enviarPreview = async () => {
  if (!arquivo.value) return
  erroPreview.value = null
  carregandoPreview.value = true

  try {
    preview.value = await api.previewExtrato(arquivo.value, gastosStore.telefone)
    // Só troca de etapa depois que os dados chegam — evita mostrar o card de
    // preview com campos vazios enquanto a resposta da API ainda está a caminho.
    etapa.value = preview.value.precisaMapeamento ? 'mapeamento' : 'preview'
  } catch (e) {
    erroPreview.value = e instanceof Error ? e.message : 'Erro ao analisar o arquivo.'
    etapa.value = 'upload'
  } finally {
    carregandoPreview.value = false
  }
}

const importar = async () => {
  if (!arquivo.value) return
  erroImportacao.value = null
  etapa.value = 'importando'

  let mapeamento: MapeamentoCSV | undefined
  if (preview.value?.precisaMapeamento) {
    mapeamento = {
      colunaData: colunaData.value,
      colunaDescricao: colunaDescricao.value,
      colunaValor: colunaValor.value,
      colunaIdentificador: colunaIdentificador.value || undefined,
      formatoData: formatoData.value,
      nomeBanco: nomeBanco.value || undefined,
    }
  }

  try {
    resultado.value = await api.importarExtrato(arquivo.value, gastosStore.telefone, mapeamento)
    etapa.value = 'resultado'
    // Recarrega os gastos do mês atual para refletir o que foi importado
    await gastosStore.buscarGastos(gastosStore.filtroMes, gastosStore.filtroAno)
  } catch (e) {
    erroImportacao.value = e instanceof Error ? e.message : 'Erro ao importar o extrato.'
    etapa.value = preview.value?.precisaMapeamento ? 'mapeamento' : 'preview'
  }
}

const reiniciar = () => {
  etapa.value = 'upload'
  arquivo.value = null
  preview.value = null
  resultado.value = null
  erroUpload.value = null
  erroPreview.value = null
  erroImportacao.value = null
  colunaData.value = ''
  colunaDescricao.value = ''
  colunaValor.value = ''
  colunaIdentificador.value = ''
  nomeBanco.value = ''
}
</script>

<template>
  <AppShell>
    <div class="space-y-4 lg:max-w-2xl">

      <!-- Título da página -->
      <div class="flex items-center gap-3 mb-2">
        <div class="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-violet-500/10">
          <span class="text-xl">📄</span>
        </div>
        <div>
          <h2 class="text-lg font-bold text-slate-900 dark:text-white">Importar Extrato</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">OFX ou CSV do seu banco</p>
        </div>
      </div>

      <!-- ============ ETAPA 1: Upload ============ -->
      <div v-if="etapa === 'upload'" class="space-y-4">

        <!-- Zona de drop / seleção -->
        <div
          @dragover.prevent="arrastando = true"
          @dragleave.prevent="arrastando = false"
          @drop.prevent="aoSoltar"
          class="relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200"
          :class="arrastando
            ? 'border-violet-400 bg-violet-50 dark:bg-violet-500/10'
            : 'border-slate-200 dark:border-white/10 hover:border-violet-300 dark:hover:border-violet-500/30'"
        >
          <div class="text-4xl mb-3">📂</div>
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
            {{ arquivo ? nomeArquivoExibido : 'Arraste o arquivo aqui' }}
          </p>
          <p class="text-xs text-slate-400 dark:text-slate-500 mb-4">ou clique para selecionar</p>
          <input
            id="input-extrato"
            type="file"
            :accept="formatosAceitos"
            @change="selecionarArquivo"
            class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        <div v-if="erroUpload" class="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
          <p class="text-red-500 dark:text-red-400 text-sm font-semibold">{{ erroUpload }}</p>
        </div>

        <div v-if="erroPreview" class="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
          <p class="text-red-500 dark:text-red-400 text-sm font-semibold">{{ erroPreview }}</p>
        </div>

        <button
          id="btn-analisar-extrato"
          :disabled="!arquivo || carregandoPreview"
          @click="enviarPreview"
          class="w-full py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r from-violet-500 to-violet-600 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
        >
          {{ carregandoPreview ? 'Analisando...' : 'Analisar arquivo' }}
        </button>
      </div>

      <!-- ============ ETAPA 2: Preview (OFX ou CSV com perfil) ============ -->
      <div v-else-if="etapa === 'preview'" class="space-y-4">

        <div class="bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5">
          <div class="flex items-center gap-3 mb-4">
            <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold"
              :class="preview?.formato === 'OFX'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'">
              {{ preview?.formato }}
            </span>
            <span v-if="preview?.nomeBanco" class="text-sm text-slate-600 dark:text-slate-300 font-medium">
              {{ preview.nomeBanco }}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="bg-slate-50 dark:bg-white/5 rounded-xl p-3 text-center">
              <p class="text-2xl font-black text-slate-900 dark:text-white font-mono">{{ preview?.totalLinhas }}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold">transações</p>
            </div>
            <div class="bg-slate-50 dark:bg-white/5 rounded-xl p-3 text-center min-w-0">
              <p class="text-sm font-bold text-violet-600 dark:text-violet-400 truncate" :title="nomeArquivoExibido">{{ nomeArquivoExibido }}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold">arquivo</p>
            </div>
          </div>

          <!-- Amostra de transações (OFX / CSV com perfil) -->
          <div v-if="preview?.amostra && preview.amostra.length > 0">
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Amostra</p>
            <div class="space-y-1.5 max-h-48 overflow-y-auto">
              <div
                v-for="(item, i) in preview.amostra" :key="i"
                class="flex justify-between items-center bg-slate-50 dark:bg-white/5 rounded-xl px-3 py-2 text-sm"
              >
                <div class="min-w-0 flex-1">
                  <p class="text-slate-700 dark:text-slate-200 font-medium truncate">
                    {{ (item as Record<string, unknown>).descricao || Object.values(item)[1] }}
                  </p>
                  <p class="text-xs text-slate-400">
                    {{ (item as Record<string, unknown>).data || Object.values(item)[0] }}
                  </p>
                </div>
                <span class="text-sm font-bold font-mono ml-3 flex-shrink-0"
                  :class="(item as Record<string, unknown>).tipo === 'receita' ? 'text-sky-500' : 'text-red-500'">
                  R$ {{ Number((item as Record<string, unknown>).valor || Object.values(item)[2]).toFixed(2) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="erroImportacao" class="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
          <p class="text-red-500 dark:text-red-400 text-sm font-semibold">{{ erroImportacao }}</p>
        </div>

        <div class="flex gap-2">
          <button @click="reiniciar"
            class="flex-1 py-3 rounded-2xl font-semibold text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors">
            ← Voltar
          </button>
          <button
            id="btn-importar-extrato"
            @click="importar"
            class="flex-1 py-3 rounded-2xl font-bold text-white bg-gradient-to-r from-violet-500 to-violet-600 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60">
            Importar {{ preview?.totalLinhas }} transações
          </button>
        </div>
      </div>

      <!-- ============ ETAPA 3: Mapeamento CSV ============ -->
      <div v-else-if="etapa === 'mapeamento'" class="space-y-4">

        <div class="bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5">
          <p class="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">🗂️ Mapeamento de colunas</p>
          <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Este CSV é novo — nos diga qual coluna corresponde a cada campo.
            O mapeamento será salvo e da próxima vez será automático.
          </p>

          <!-- Amostra do CSV cru -->
          <div v-if="preview?.amostra && preview.amostra.length > 0" class="mb-5">
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Amostra do CSV</p>
            <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
              <table class="w-full text-xs">
                <thead>
                  <tr class="bg-slate-50 dark:bg-white/5">
                    <th v-for="col in preview.colunas" :key="col"
                      class="px-3 py-2 text-left font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {{ col }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(linha, i) in preview.amostra" :key="i"
                    class="border-t border-slate-100 dark:border-white/5">
                    <td v-for="col in preview.colunas" :key="col"
                      class="px-3 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {{ (linha as Record<string, unknown>)[col] }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Selects de mapeamento -->
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">📅 Coluna de Data</label>
              <select v-model="colunaData" id="select-coluna-data"
                class="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-violet-400">
                <option value="" disabled>Selecione...</option>
                <option v-for="col in preview?.colunas" :key="col" :value="col">{{ col }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">📝 Coluna de Descrição</label>
              <select v-model="colunaDescricao" id="select-coluna-descricao"
                class="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-violet-400">
                <option value="" disabled>Selecione...</option>
                <option v-for="col in preview?.colunas" :key="col" :value="col">{{ col }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">💰 Coluna de Valor</label>
              <select v-model="colunaValor" id="select-coluna-valor"
                class="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-violet-400">
                <option value="" disabled>Selecione...</option>
                <option v-for="col in preview?.colunas" :key="col" :value="col">{{ col }}</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Formato de data</label>
              <select v-model="formatoData"
                class="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-violet-400">
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">🔑 Coluna de identificador (opcional)</label>
              <select v-model="colunaIdentificador"
                class="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-violet-400">
                <option value="">Calcular automaticamente</option>
                <option v-for="col in preview?.colunas" :key="col" :value="col">{{ col }}</option>
              </select>
              <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Se o banco expõe um ID único por transação (ex.: "Identificador"), selecione aqui para uma deduplicação mais confiável.
              </p>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">🏦 Nome do banco (opcional)</label>
              <input v-model="nomeBanco" type="text" placeholder="Ex: Nubank, Itaú..."
                class="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-violet-400" />
            </div>
          </div>
        </div>

        <div v-if="erroImportacao" class="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
          <p class="text-red-500 dark:text-red-400 text-sm font-semibold">{{ erroImportacao }}</p>
        </div>

        <div class="flex gap-2">
          <button @click="reiniciar"
            class="flex-1 py-3 rounded-2xl font-semibold text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors">
            ← Voltar
          </button>
          <button
            id="btn-confirmar-mapeamento"
            :disabled="!mapeamentoValido"
            @click="importar"
            class="flex-1 py-3 rounded-2xl font-bold text-white bg-gradient-to-r from-violet-500 to-violet-600 shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:pointer-events-none hover:shadow-violet-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60">
            Importar transações
          </button>
        </div>
      </div>

      <!-- ============ ETAPA 4: Importando (loading) ============ -->
      <div v-else-if="etapa === 'importando'" class="min-h-[40vh] flex flex-col items-center justify-center text-center">
        <div class="w-12 h-12 border-4 border-violet-200 dark:border-violet-800 border-t-violet-500 rounded-full animate-spin mb-4"></div>
        <p class="text-slate-600 dark:text-slate-300 font-semibold">Importando transações...</p>
        <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">Isso pode levar alguns segundos</p>
      </div>

      <!-- ============ ETAPA 5: Resultado ============ -->
      <div v-else-if="etapa === 'resultado'" class="space-y-4">
        <div v-motion :initial="{ opacity: 0, scale: 0.95 }" :enter="{ opacity: 1, scale: 1, transition: { duration: 300 } }"
          class="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center">
          <div class="text-4xl mb-3">✅</div>
          <p class="text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-4">Importação concluída!</p>

          <div class="grid grid-cols-3 gap-3">
            <div class="bg-white/60 dark:bg-white/5 rounded-xl p-3">
              <p class="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{{ resultado?.totalImportadas }}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold">importadas</p>
            </div>
            <div class="bg-white/60 dark:bg-white/5 rounded-xl p-3">
              <p class="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">{{ resultado?.totalDuplicadas }}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold">duplicadas</p>
            </div>
            <div class="bg-white/60 dark:bg-white/5 rounded-xl p-3">
              <p class="text-2xl font-black text-slate-600 dark:text-slate-300 font-mono">{{ resultado?.totalLinhas }}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold">no arquivo</p>
            </div>
          </div>

          <p v-if="resultado?.nomeBanco" class="text-xs text-slate-500 dark:text-slate-400 mt-3">
            Banco: {{ resultado.nomeBanco }} · Formato: {{ resultado.formato }}
          </p>
        </div>

        <button @click="reiniciar"
          class="w-full py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r from-violet-500 to-violet-600 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60">
          Importar outro extrato
        </button>
      </div>

    </div>
  </AppShell>
</template>
