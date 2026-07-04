<script setup lang="ts">
import { onMounted } from 'vue'
import { useGastosStore } from './stores/gastos' // Importa a ponte do Pinia que criamos

// Inicializa a Store
const gastosStore = useGastosStore()

// Assim que a tela carregar, dispara a função para buscar os dados no servidor
onMounted(() => {
  gastosStore.buscarGastos()
})
</script>

<template>
  <div class="min-h-screen bg-slate-100 p-8 font-sans">
    <div class="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-6 border border-slate-200">

      <!-- Cabeçalho -->
      <div class="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
        <h1 class="text-2xl font-extrabold text-slate-800">💸 Gestor Financeiro</h1>
        <span class="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
          Conectado
        </span>
      </div>

      <!-- Estado de Carregamento -->
      <div v-if="gastosStore.carregando" class="flex justify-center items-center py-10">
        <div class="animate-pulse flex flex-col items-center">
          <div class="h-8 w-8 bg-slate-300 rounded-full mb-4"></div>
          <p class="text-slate-500 font-medium">Buscando dados no Moto G...</p>
        </div>
      </div>

      <!-- Estado de Erro -->
      <div v-else-if="gastosStore.erro" class="bg-red-50 border-l-4 border-red-500 p-4 rounded-md mb-6">
        <p class="text-red-700 font-semibold">{{ gastosStore.erro }}</p>
      </div>

      <!-- Lista de Gastos Renderizada -->
      <div v-else class="space-y-4">
        <div v-for="gasto in gastosStore.transacoes" :key="gasto.id"
          class="flex justify-between items-center p-4 bg-slate-50 rounded-xl hover:bg-slate-100 hover:shadow-sm transition-all duration-200 border border-transparent hover:border-slate-200">
          <div class="flex flex-col">
            <span class="text-lg font-bold text-slate-700">{{ gasto.descricao }}</span>
            <span class="text-sm text-slate-400 font-medium mt-1">
              <!-- Formata a data que vem do banco -->
              {{ new Date(gasto.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
              }}
            </span>
          </div>

          <div class="text-xl font-black text-rose-500">
            <!-- Formata o valor para R$ -->
            R$ {{ Number(gasto.valor).toFixed(2).replace('.', ',') }}
          </div>
        </div>

        <!-- Caso não tenha nada no banco -->
        <div v-if="gastosStore.transacoes.length === 0" class="text-center py-10">
          <p class="text-slate-500 text-lg">Nenhum gasto registrado ainda.</p>
          <p class="text-slate-400 text-sm mt-2">Mande uma mensagem pelo WhatsApp para começar!</p>
        </div>
      </div>

    </div>
  </div>
</template>