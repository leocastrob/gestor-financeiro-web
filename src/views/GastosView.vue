<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGastosStore } from '../stores/gastos'

const router = useRouter()
const gastosStore = useGastosStore()

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
  gastosStore.buscarGastos()
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-8 font-sans">
    <div class="max-w-2xl mx-auto">

      <!-- Cabeçalho -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-extrabold text-white tracking-tight">💸 Gestor Financeiro</h1>
          <p class="text-emerald-400 text-sm font-mono mt-1">
            📱 {{ telefoneFormatado() }}
          </p>
        </div>
        <button
          id="btn-sair"
          @click="sair"
          class="bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 text-sm font-semibold px-4 py-2 rounded-xl transition-all duration-200"
        >
          ← Trocar
        </button>
      </div>

      <!-- Estado de Carregamento -->
      <div v-if="gastosStore.carregando" class="flex justify-center items-center py-20">
        <div class="flex flex-col items-center">
          <div class="h-10 w-10 border-4 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin mb-4"></div>
          <p class="text-slate-400 font-medium">Buscando gastos...</p>
        </div>
      </div>

      <!-- Estado de Erro -->
      <div v-else-if="gastosStore.erro" class="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl">
        <p class="text-red-400 font-semibold">{{ gastosStore.erro }}</p>
      </div>

      <!-- Lista de Gastos -->
      <div v-else class="space-y-3">

        <!-- Card de Total -->
        <div v-if="gastosStore.transacoes.length > 0"
          class="bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 border border-emerald-500/20 rounded-2xl p-5 flex justify-between items-center mb-2">
          <div>
            <p class="text-emerald-400/70 text-xs font-semibold uppercase tracking-wider">Total gasto</p>
            <p class="text-3xl font-black text-emerald-400 mt-1">
              R$ {{ gastosStore.totalGastos }}
            </p>
          </div>
          <div class="text-right">
            <p class="text-slate-500 text-xs font-semibold uppercase tracking-wider">Registros</p>
            <p class="text-2xl font-black text-slate-300 mt-1">{{ gastosStore.transacoes.length }}</p>
          </div>
        </div>

        <!-- Itens -->
        <div v-for="gasto in gastosStore.transacoes" :key="gasto.id"
          class="flex justify-between items-center p-4 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/5 hover:border-white/10 hover:bg-white/[0.07] transition-all duration-200">
          <div class="flex flex-col">
            <span class="text-lg font-bold text-slate-200">{{ gasto.descricao }}</span>
            <span class="text-xs text-slate-500 font-medium mt-1">
              {{ new Date(gasto.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) }}
            </span>
          </div>
          <div class="flex items-center gap-4">
            <div class="text-xl font-black text-rose-400">
              R$ {{ Number(gasto.valor).toFixed(2).replace('.', ',') }}
            </div>
            <button
              @click="gastosStore.excluirGasto(gasto.id)"
              class="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
              title="Excluir gasto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Vazio -->
        <div v-if="gastosStore.transacoes.length === 0" class="text-center py-20">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 mb-4">
            <span class="text-3xl">📭</span>
          </div>
          <p class="text-slate-400 text-lg font-semibold">Nenhum gasto registrado.</p>
          <p class="text-slate-600 text-sm mt-2">Mande uma mensagem pelo WhatsApp para começar!</p>
        </div>
      </div>

    </div>
  </div>
</template>
