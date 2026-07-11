<script setup lang="ts">
import { computed } from 'vue'
import {
  SelectRoot, SelectTrigger, SelectValue, SelectIcon,
  SelectPortal, SelectContent, SelectViewport,
  SelectItem, SelectItemText, SelectItemIndicator,
} from 'reka-ui'
import { CATEGORIAS, iconeDaCategoria } from '../theme/categorias'

const modelValue = defineModel<string>({ required: true })

withDefaults(defineProps<{ incluirAutomatica?: boolean }>(), {
  incluirAutomatica: false,
})

// reka-ui's SelectItem não aceita value="" (lança erro em runtime), mas o
// contrato público deste componente usa '' para representar "Automática".
// Este sentinel traduz entre os dois mundos apenas internamente, sem
// nunca vazar para o v-model exposto ao consumidor do componente.
const AUTOMATICA = '__automatica__'

const selectValue = computed<string>({
  get: () => (modelValue.value === '' ? AUTOMATICA : modelValue.value),
  set: (v) => {
    modelValue.value = v === AUTOMATICA ? '' : v
  },
})
</script>

<template>
  <SelectRoot v-model="selectValue">
    <SelectTrigger
      class="min-w-0 flex-1 flex items-center justify-between gap-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-emerald-400 data-[placeholder]:text-slate-400"
    >
      <SelectValue placeholder="🤖 Automática" />
      <SelectIcon as-child>
        <svg class="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </SelectIcon>
    </SelectTrigger>
    <SelectPortal>
      <SelectContent
        class="z-50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl shadow-slate-900/10 dark:shadow-black/40 overflow-hidden"
        position="popper"
        :side-offset="6"
      >
        <SelectViewport class="p-1 max-h-72 overflow-y-auto">
          <SelectItem
            v-if="incluirAutomatica"
            :value="AUTOMATICA"
            class="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-slate-600 dark:text-slate-300 outline-none cursor-pointer data-[highlighted]:bg-slate-900/5 dark:data-[highlighted]:bg-white/5 data-[state=checked]:bg-emerald-500/15 data-[state=checked]:text-emerald-700 dark:data-[state=checked]:text-emerald-300"
          >
            <SelectItemText>🤖 Automática</SelectItemText>
          </SelectItem>
          <SelectItem
            v-for="cat in CATEGORIAS" :key="cat" :value="cat"
            class="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-slate-600 dark:text-slate-300 outline-none cursor-pointer data-[highlighted]:bg-slate-900/5 dark:data-[highlighted]:bg-white/5 data-[state=checked]:bg-emerald-500/15 data-[state=checked]:text-emerald-700 dark:data-[state=checked]:text-emerald-300"
          >
            <SelectItemText>{{ iconeDaCategoria(cat) }} {{ cat }}</SelectItemText>
            <SelectItemIndicator class="ml-auto text-emerald-500">✓</SelectItemIndicator>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
