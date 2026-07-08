<script setup lang="ts">
import { useTema } from '../composables/useTema'

const { tema, alternar } = useTema()
</script>

<template>
  <button
    id="btn-tema"
    type="button"
    @click="alternar"
    :aria-label="tema === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'"
    title="Trocar tema"
    class="fixed bottom-4 right-4 z-50 w-10 h-10 rounded-full flex items-center justify-center
      bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10
      text-slate-600 dark:text-slate-300 backdrop-blur-xl shadow-sm
      hover:border-emerald-400/60 hover:text-emerald-600 dark:hover:text-emerald-400
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60
      transition-colors duration-200"
  >
    <span class="text-lg leading-none">{{ tema === 'dark' ? '☀️' : '🌙' }}</span>
  </button>
</template>
