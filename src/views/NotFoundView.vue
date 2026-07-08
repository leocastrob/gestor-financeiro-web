<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="text-center max-w-md">
      <div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-900/5 dark:bg-white/5 mb-6">
        <span class="text-4xl">🧭</span>
      </div>
      <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">Página não encontrada</h1>
      <p class="text-slate-500 dark:text-slate-400 mb-8">Esse endereço não existe no Gestor Financeiro.</p>
      <button @click="router.push('/')"
        class="w-full sm:w-auto px-6 py-3 rounded-2xl font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent">
        ← Voltar para o início
      </button>
    </div>
  </div>
</template>
