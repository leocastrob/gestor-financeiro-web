<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useGastosStore } from '../stores/gastos'
import * as api from '../services/api'
import OtpInput from '../components/OtpInput.vue'

const router = useRouter()
const gastosStore = useGastosStore()
const telefone = ref('')
const erro = ref('')
const focado = ref(false)

// --- Etapa de PIN (verificação de identidade via WhatsApp) ---
const etapa = ref<'telefone' | 'pin'>('telefone')
const pin = ref('')
const enviando = ref(false)
const segundosParaReenviar = ref(0)
const otpRef = ref<InstanceType<typeof OtpInput> | null>(null)
let timerReenvio: ReturnType<typeof setInterval> | null = null

const iniciarContagemReenvio = () => {
  segundosParaReenviar.value = 30
  if (timerReenvio) clearInterval(timerReenvio)
  timerReenvio = setInterval(() => {
    segundosParaReenviar.value -= 1
    if (segundosParaReenviar.value <= 0 && timerReenvio) {
      clearInterval(timerReenvio)
      timerReenvio = null
    }
  }, 1000)
}

// --- Seletor de país ---
interface Pais {
  codigo: string
  bandeira: string
  nome: string
  mascara: string
  maxDigitos: number
}

const paises: Pais[] = [
  { codigo: '55', bandeira: '🇧🇷', nome: 'Brasil', mascara: '00 00 00000-0000', maxDigitos: 13 },
  { codigo: '54', bandeira: '🇦🇷', nome: 'Argentina', mascara: '00 00 0000-0000', maxDigitos: 12 },
  { codigo: '598', bandeira: '🇺🇾', nome: 'Uruguai', mascara: '000 00 000-000', maxDigitos: 11 },
  { codigo: '595', bandeira: '🇵🇾', nome: 'Paraguai', mascara: '000 000 000-000', maxDigitos: 12 },
  { codigo: '56', bandeira: '🇨🇱', nome: 'Chile', mascara: '00 0 0000-0000', maxDigitos: 11 },
  { codigo: '57', bandeira: '🇨🇴', nome: 'Colômbia', mascara: '00 000 000-0000', maxDigitos: 12 },
  { codigo: '58', bandeira: '🇻🇪', nome: 'Venezuela', mascara: '00 000 000-0000', maxDigitos: 12 },
  { codigo: '51', bandeira: '🇵🇪', nome: 'Peru', mascara: '00 000 000-000', maxDigitos: 11 },
  { codigo: '593', bandeira: '🇪🇨', nome: 'Equador', mascara: '000 00 000-0000', maxDigitos: 12 },
  { codigo: '591', bandeira: '🇧🇴', nome: 'Bolívia', mascara: '000 0 000-0000', maxDigitos: 11 },
  { codigo: '592', bandeira: '🇬🇾', nome: 'Guiana', mascara: '000 000-0000', maxDigitos: 10 },
  { codigo: '597', bandeira: '🇸🇷', nome: 'Suriname', mascara: '000 000-000', maxDigitos: 9 },
]

const paisSelecionado = ref<Pais>(paises[0]!)
const dropdownAberto = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const selecionarPais = (pais: Pais) => {
  paisSelecionado.value = pais
  dropdownAberto.value = false
  telefone.value = ''
  erro.value = ''
}

const fecharDropdown = (e: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    dropdownAberto.value = false
  }
}

onMounted(() => {
  if (gastosStore.telefone) {
    router.push('/gastos')
  }
  document.addEventListener('click', fecharDropdown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', fecharDropdown)
  if (timerReenvio) clearInterval(timerReenvio)
})

// Formata o número enquanto digita (formato genérico)
const telefoneFormatado = () => {
  const n = telefone.value
  const cod = paisSelecionado.value.codigo

  // Formato específico para Brasil: DD DDDDD-DDDD
  if (cod === '55') {
    if (n.length <= 2) return n
    if (n.length <= 7) return `${n.slice(0, 2)} ${n.slice(2)}`
    return `${n.slice(0, 2)} ${n.slice(2, 7)}-${n.slice(7)}`
  }

  // Formato genérico para outros países
  if (n.length <= 3) return n
  if (n.length <= 7) return `${n.slice(0, 3)} ${n.slice(3)}`
  return `${n.slice(0, 3)} ${n.slice(3, 7)}-${n.slice(7)}`
}

const placeholderPais = () => {
  const cod = paisSelecionado.value.codigo
  if (cod === '55') return '11 91234-5678'
  if (cod === '54') return '11 5678-1234'
  if (cod === '598') return '94 123-456'
  if (cod === '595') return '981 234-567'
  if (cod === '56') return '9 1234-5678'
  if (cod === '57') return '312 345-6789'
  if (cod === '58') return '412 345-6789'
  if (cod === '51') return '912 345-678'
  if (cod === '593') return '99 123-4567'
  if (cod === '591') return '7 123-4567'
  if (cod === '592') return '612-3456'
  if (cod === '597') return '812-345'
  return '000-0000'
}

const maxDigitosSemCodigo = () => {
  // Número de dígitos do número local (sem o código do país)
  return paisSelecionado.value.maxDigitos - paisSelecionado.value.codigo.length
}

const aoDigitar = (event: Event) => {
  const input = event.target as HTMLInputElement
  const apenasNumeros = input.value.replace(/\D/g, '')
  telefone.value = apenasNumeros.slice(0, maxDigitosSemCodigo())
  erro.value = ''
}

const numeroCompleto = () => {
  return paisSelecionado.value.codigo + telefone.value
}

const minimoDigitosLocal = () => {
  // Mínimo razoável para um número local
  return maxDigitosSemCodigo() - 2
}

const enviarCodigo = async () => {
  if (telefone.value.length < minimoDigitosLocal()) {
    erro.value = `Número incompleto. Insira o número completo com DDD.`
    return
  }

  erro.value = ''
  enviando.value = true
  try {
    await api.solicitarPin(numeroCompleto())
    etapa.value = 'pin'
    pin.value = ''
    iniciarContagemReenvio()
    otpRef.value?.focar()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Não foi possível enviar o código.'
  } finally {
    enviando.value = false
  }
}

const confirmarCodigo = async () => {
  if (pin.value.trim().length !== 6) {
    erro.value = 'Digite o código de 6 dígitos que você recebeu no WhatsApp.'
    return
  }

  erro.value = ''
  enviando.value = true
  try {
    await api.confirmarPin(numeroCompleto(), pin.value.trim())
    gastosStore.setTelefone(numeroCompleto())
    router.push('/gastos')
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Código inválido.'
  } finally {
    enviando.value = false
  }
}

const voltarParaTelefone = () => {
  etapa.value = 'telefone'
  pin.value = ''
  erro.value = ''
  if (timerReenvio) {
    clearInterval(timerReenvio)
    timerReenvio = null
  }
  segundosParaReenviar.value = 0
}

const aoTeclar = (event: KeyboardEvent) => {
  if (event.key === 'Enter') enviarCodigo()
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4">

    <!-- Card de Login -->
    <div class="w-full max-w-md">

      <!-- Logo / Ícone -->
      <div class="text-center mb-8">
        <div
          class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30 mb-4">
          <span class="text-4xl">💸</span>
        </div>
        <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Gestor Financeiro
        </h1>
        <p class="text-slate-500 dark:text-slate-400 mt-2 text-sm">
          Controle seus gastos pelo WhatsApp
        </p>
      </div>

      <!-- Card: etapa 1, telefone -->
      <div v-if="etapa === 'telefone'"
        class="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-3xl p-8 shadow-xl shadow-slate-900/5 dark:shadow-2xl">

        <label class="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">
          📱 Número do WhatsApp
        </label>

        <!-- Input Container -->
        <div :class="[
          'relative flex items-center rounded-2xl border-2 transition-all duration-300 bg-slate-50 dark:bg-white/5',
          focado ? 'border-emerald-400 shadow-lg shadow-emerald-500/20' : 'border-slate-200 dark:border-white/10',
          erro ? '!border-red-400/60' : ''
        ]">

          <!-- Seletor de País -->
          <div ref="dropdownRef" class="relative flex-shrink-0">
            <button id="btn-pais-selector" type="button" @click.stop="dropdownAberto = !dropdownAberto"
              class="flex items-center gap-1.5 pl-3 pr-2 py-4 rounded-l-2xl hover:bg-slate-900/5 dark:hover:bg-white/5 transition-colors duration-200 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-inset">
              <span class="text-2xl leading-none">{{ paisSelecionado.bandeira }}</span>
              <span class="text-emerald-600 dark:text-emerald-400 font-bold text-base select-none">+{{ paisSelecionado.codigo }}</span>
              <svg
                :class="['w-3.5 h-3.5 text-slate-400 transition-transform duration-200', dropdownAberto ? 'rotate-180' : '']"
                fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <!-- Dropdown de países -->
            <Transition enter-active-class="transition duration-200 ease-out"
              enter-from-class="opacity-0 -translate-y-2 scale-95" enter-to-class="opacity-100 translate-y-0 scale-100"
              leave-active-class="transition duration-150 ease-in"
              leave-from-class="opacity-100 translate-y-0 scale-100" leave-to-class="opacity-0 -translate-y-2 scale-95">
              <div v-if="dropdownAberto"
                class="absolute top-full left-0 mt-2 w-64 max-h-72 overflow-y-auto bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl shadow-slate-900/10 dark:shadow-black/40 z-50 py-2 scrollbar-thin">
                <button v-for="pais in paises" :key="pais.codigo" type="button" @click="selecionarPais(pais)" :class="[
                  'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-150 cursor-pointer',
                  pais.codigo === paisSelecionado.codigo
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-900/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                ]">
                  <span class="text-2xl leading-none">{{ pais.bandeira }}</span>
                  <span class="flex-1 text-sm font-medium">{{ pais.nome }}</span>
                  <span class="text-xs font-mono text-slate-400">+{{ pais.codigo }}</span>
                </button>
              </div>
            </Transition>
          </div>

          <!-- Divisor vertical -->
          <div class="w-px h-7 bg-slate-200 dark:bg-white/10 flex-shrink-0"></div>

          <input id="telefone-input" type="text" inputmode="numeric" :value="telefoneFormatado()" @input="aoDigitar"
            @keydown="aoTeclar" @focus="focado = true" @blur="focado = false" :placeholder="placeholderPais()"
            class="w-full py-4 pr-4 pl-3 bg-transparent text-slate-900 dark:text-white text-xl font-mono tracking-wider placeholder-slate-400 dark:placeholder-slate-500/50 focus:outline-none"
            autocomplete="off" />
        </div>

        <!-- Dica de formato -->
        <p class="text-xs text-slate-400 dark:text-slate-500 mt-2 ml-1">
          {{ paisSelecionado.bandeira }} {{ paisSelecionado.nome }} (+{{ paisSelecionado.codigo }}) · DDD + número
        </p>

        <!-- Mensagem de erro -->
        <div v-if="erro" class="mt-3 flex items-center gap-2 text-red-500 dark:text-red-400 text-sm font-medium animate-pulse">
          <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd" />
          </svg>
          {{ erro }}
        </div>

        <!-- Botão -->
        <button id="btn-entrar" @click="enviarCodigo" :disabled="telefone.length < minimoDigitosLocal() || enviando" :class="[
          'w-full mt-6 py-4 rounded-2xl font-bold text-base sm:text-lg tracking-wide transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
          telefone.length >= minimoDigitosLocal() && !enviando
            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-[0.98]'
            : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 cursor-not-allowed'
        ]">
          {{ enviando ? 'Enviando...' : 'Enviar código →' }}
        </button>

      </div>

      <!-- Card: etapa 2, confirmação do PIN -->
      <div v-else
        class="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-3xl p-8 shadow-xl shadow-slate-900/5 dark:shadow-2xl">

        <label class="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">
          🔐 Código de verificação
        </label>
        <p class="text-xs text-slate-400 dark:text-slate-500 mb-4">
          Enviamos um código de 6 dígitos pelo WhatsApp para
          {{ paisSelecionado.bandeira }} +{{ numeroCompleto() }}.
        </p>

        <OtpInput ref="otpRef" v-model="pin" :erro="!!erro" @completo="confirmarCodigo" />

        <!-- Mensagem de erro -->
        <div v-if="erro" class="mt-3 flex items-center justify-center gap-2 text-red-500 dark:text-red-400 text-sm font-medium animate-pulse">
          <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd" />
          </svg>
          {{ erro }}
        </div>

        <!-- Botão confirmar -->
        <button id="btn-confirmar-pin" @click="confirmarCodigo" :disabled="pin.trim().length !== 6 || enviando" :class="[
          'w-full mt-6 py-4 rounded-2xl font-bold text-lg tracking-wide transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
          pin.trim().length === 6 && !enviando
            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-[0.98]'
            : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 cursor-not-allowed'
        ]">
          {{ enviando ? 'Confirmando...' : 'Confirmar →' }}
        </button>

        <!-- Reenviar / voltar -->
        <div class="flex justify-between items-center mt-4">
          <button id="btn-voltar" type="button" @click="voltarParaTelefone"
            class="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 rounded">
            ← Trocar número
          </button>
          <button id="btn-reenviar" type="button" @click="enviarCodigo" :disabled="segundosParaReenviar > 0 || enviando"
            :class="[
              'text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 rounded',
              segundosParaReenviar > 0 || enviando ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed' : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300'
            ]">
            {{ segundosParaReenviar > 0 ? `Reenviar em ${segundosParaReenviar}s` : 'Reenviar código' }}
          </button>
        </div>

      </div>

      <!-- Rodapé -->
      <p class="text-center text-slate-400 dark:text-slate-500 text-xs mt-6">
        Envie gastos pelo WhatsApp e acompanhe aqui 🚀
      </p>

    </div>
  </div>
</template>
