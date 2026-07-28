<script setup lang="ts">
import { computed } from 'vue'
import { PALETA_CORES } from '../theme/paletaCategorias'

export interface CorEmUso {
  cor: string
  nome: string
  icone: string
}

const props = withDefaults(
  defineProps<{
    emUso?: CorEmUso[]
  }>(),
  { emUso: () => [] },
)

// null = cor automática (hash do nome)
const modelo = defineModel<string | null>({ default: null })

// Índice por cor para não varrer a lista a cada swatch renderizado
const ocupadas = computed(() => {
  const mapa = new Map<string, CorEmUso>()
  for (const item of props.emUso) mapa.set(item.cor, item)
  return mapa
})
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Cor</span>
      <button type="button" @click="modelo = null"
        class="text-xs font-semibold px-2 py-1 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
        :class="modelo === null
          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
          : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'">
        Automática
      </button>
    </div>

    <div class="grid grid-cols-6 gap-2">
      <button v-for="cor in PALETA_CORES" :key="cor" type="button"
        @click="modelo = cor"
        :title="ocupadas.get(cor) ? `Já usada por ${ocupadas.get(cor)!.nome}` : cor"
        :aria-label="ocupadas.get(cor) ? `Cor ${cor}, já usada por ${ocupadas.get(cor)!.nome}` : `Cor ${cor}`"
        :aria-pressed="modelo === cor"
        class="relative aspect-square rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-slate-400 dark:focus-visible:ring-offset-slate-900"
        :class="[
          modelo === cor ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white dark:ring-offset-slate-900 scale-105' : 'hover:scale-105',
          ocupadas.get(cor) && modelo !== cor ? 'opacity-40' : '',
        ]"
        :style="{ backgroundColor: cor }">
        <span v-if="ocupadas.get(cor)" class="absolute inset-0 flex items-center justify-center text-[10px] leading-none">
          {{ ocupadas.get(cor)!.icone }}
        </span>
      </button>
    </div>
  </div>
</template>
