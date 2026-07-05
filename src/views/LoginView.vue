<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGastosStore } from '../stores/gastos'

const router = useRouter()
const gastosStore = useGastosStore()
const telefone = ref('')
const erro = ref('')
const focado = ref(false)

onMounted(() => {
  if (gastosStore.telefone) {
    router.push('/gastos')
  }
})

// Formata o número enquanto digita: 55 12 98872-3791
const telefoneFormatado = () => {
  const n = telefone.value
  if (n.length <= 2) return n
  if (n.length <= 4) return `${n.slice(0, 2)} ${n.slice(2)}`
  if (n.length <= 9) return `${n.slice(0, 2)} ${n.slice(2, 4)} ${n.slice(4)}`
  return `${n.slice(0, 2)} ${n.slice(2, 4)} ${n.slice(4, 9)}-${n.slice(9)}`
}

const aoDigitar = (event: Event) => {
  const input = event.target as HTMLInputElement
  // Remove tudo que não é número
  const apenasNumeros = input.value.replace(/\D/g, '')
  // Limita a 13 dígitos (55 + DDD + número)
  telefone.value = apenasNumeros.slice(0, 13)
  erro.value = ''
}

const entrar = () => {
  if (telefone.value.length < 12) {
    erro.value = 'Número incompleto. Use o formato: 55 + DDD + número'
    return
  }
  // Salva o telefone na store e navega para a tela de gastos
  gastosStore.setTelefone(telefone.value)
  router.push('/gastos')
}

const aoTeclar = (event: KeyboardEvent) => {
  if (event.key === 'Enter') entrar()
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">

    <!-- Card de Login -->
    <div class="w-full max-w-md">

      <!-- Logo / Ícone -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30 mb-4">
          <span class="text-4xl">💸</span>
        </div>
        <h1 class="text-3xl font-extrabold text-white tracking-tight">
          Gestor Financeiro
        </h1>
        <p class="text-slate-400 mt-2 text-sm">
          Controle seus gastos pelo WhatsApp
        </p>
      </div>

      <!-- Card -->
      <div class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">

        <label class="block text-sm font-semibold text-slate-300 mb-3">
          📱 Número do WhatsApp
        </label>

        <!-- Input Container -->
        <div
          :class="[
            'relative flex items-center rounded-2xl border-2 transition-all duration-300 bg-white/5',
            focado ? 'border-emerald-400 shadow-lg shadow-emerald-500/20' : 'border-white/10',
            erro ? 'border-red-400/60' : ''
          ]"
        >
          <!-- Prefixo visual -->
          <span class="pl-4 pr-1 text-emerald-400 font-bold text-lg select-none">+</span>

          <input
            id="telefone-input"
            type="text"
            inputmode="numeric"
            :value="telefoneFormatado()"
            @input="aoDigitar"
            @keydown="aoTeclar"
            @focus="focado = true"
            @blur="focado = false"
            placeholder="55 12 98872-3791"
            class="w-full py-4 pr-4 pl-1 bg-transparent text-white text-xl font-mono tracking-wider placeholder-slate-500/50 focus:outline-none"
            autocomplete="off"
          />
        </div>

        <!-- Dica de formato -->
        <p class="text-xs text-slate-500 mt-2 ml-1">
          Código do país (55) + DDD + número
        </p>

        <!-- Mensagem de erro -->
        <div
          v-if="erro"
          class="mt-3 flex items-center gap-2 text-red-400 text-sm font-medium animate-pulse"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          {{ erro }}
        </div>

        <!-- Botão -->
        <button
          id="btn-entrar"
          @click="entrar"
          :disabled="telefone.length < 12"
          :class="[
            'w-full mt-6 py-4 rounded-2xl font-bold text-lg tracking-wide transition-all duration-300',
            telefone.length >= 12
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-[0.98]'
              : 'bg-white/5 text-slate-500 cursor-not-allowed'
          ]"
        >
          Ver meus gastos →
        </button>

      </div>

      <!-- Rodapé -->
      <p class="text-center text-slate-600 text-xs mt-6">
        Envie gastos pelo WhatsApp e acompanhe aqui 🚀
      </p>

    </div>
  </div>
</template>
