<script setup lang="ts">
import { computed } from 'vue'
import {
  SelectRoot, SelectTrigger, SelectValue, SelectIcon,
  SelectPortal, SelectContent, SelectViewport,
  SelectItem, SelectItemText, SelectItemIndicator, SelectSeparator
} from 'reka-ui'
import { CATEGORIAS, iconeDaCategoria } from '../theme/categorias'
import { useCategoriasStore } from '../stores/categorias'
import { useGastosStore } from '../stores/gastos'

const modelValue = defineModel<string>({ required: true })

const props = withDefaults(defineProps<{ incluirAutomatica?: boolean }>(), {
  incluirAutomatica: false,
})

const AUTOMATICA = '__automatica__'
const NOVA_CATEGORIA = '__nova__'

const categoriasStore = useCategoriasStore()
const gastosStore = useGastosStore()

const todasCategorias = computed(() => {
  const nomesCustomizadas = categoriasStore.categorias.map(c => c.nome)
  return [...CATEGORIAS, ...nomesCustomizadas]
})

const selectValue = computed<string>({
  get: () => (modelValue.value === '' ? AUTOMATICA : modelValue.value),
  set: async (v) => {
    if (v === NOVA_CATEGORIA) {
      const nome = window.prompt('Nome da nova categoria (máx 50 caracteres):')
      if (!nome || !nome.trim()) return

      const icone = window.prompt('Qual emoji usar para essa categoria?', '🏷️') || '🏷️'
      
      const sucesso = await categoriasStore.adicionarCategoria(gastosStore.telefone, {
        nome: nome.trim(),
        icone: icone.trim()
      })
      
      if (sucesso) {
        modelValue.value = nome.trim()
      } else {
        alert(categoriasStore.erro || 'Erro ao criar categoria.')
      }
      return
    }
    modelValue.value = v === AUTOMATICA ? '' : v
  },
})
</script>

<template>
  <SelectRoot v-model="selectValue">
    <SelectTrigger
      class="min-w-0 flex-1 flex items-center justify-between gap-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 data-[placeholder]:text-slate-400"
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
            v-if="props.incluirAutomatica"
            :value="AUTOMATICA"
            class="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-slate-600 dark:text-slate-300 outline-none cursor-pointer data-[highlighted]:bg-slate-900/5 dark:data-[highlighted]:bg-white/5 data-[state=checked]:bg-emerald-500/15 data-[state=checked]:text-emerald-700 dark:data-[state=checked]:text-emerald-300"
          >
            <SelectItemText>🤖 Automática</SelectItemText>
          </SelectItem>
          
          <SelectItem
            v-for="cat in todasCategorias" :key="cat" :value="cat"
            class="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-slate-600 dark:text-slate-300 outline-none cursor-pointer data-[highlighted]:bg-slate-900/5 dark:data-[highlighted]:bg-white/5 data-[state=checked]:bg-emerald-500/15 data-[state=checked]:text-emerald-700 dark:data-[state=checked]:text-emerald-300"
          >
            <SelectItemText>{{ iconeDaCategoria(cat) }} {{ cat }}</SelectItemText>
            <SelectItemIndicator class="ml-auto text-emerald-500">✓</SelectItemIndicator>
          </SelectItem>

          <SelectSeparator class="h-px bg-slate-200 dark:bg-white/10 my-1 mx-2" />

          <SelectItem
            :value="NOVA_CATEGORIA"
            class="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-emerald-600 dark:text-emerald-400 outline-none cursor-pointer data-[highlighted]:bg-slate-900/5 dark:data-[highlighted]:bg-white/5 font-medium"
          >
            <SelectItemText>➕ Criar nova categoria...</SelectItemText>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>

