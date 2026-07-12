<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  SelectRoot, SelectTrigger, SelectValue, SelectIcon,
  SelectPortal, SelectContent, SelectViewport,
  SelectItem, SelectItemText, SelectItemIndicator, SelectSeparator,
  DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogClose
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

const isModalOpen = ref(false)
const novaCategoriaNome = ref('')
const novaCategoriaIcone = ref('🏷️')
const salvandoCategoria = ref(false)

const todasCategorias = computed(() => {
  const nomesCustomizadas = categoriasStore.categorias.map(c => c.nome)
  return [...CATEGORIAS, ...nomesCustomizadas]
})

const selectValue = computed<string>({
  get: () => (modelValue.value === '' ? AUTOMATICA : modelValue.value),
  set: (v) => {
    if (v === NOVA_CATEGORIA) {
      novaCategoriaNome.value = ''
      novaCategoriaIcone.value = '🏷️'
      categoriasStore.erro = null
      isModalOpen.value = true
      return
    }
    modelValue.value = v === AUTOMATICA ? '' : v
  },
})

async function salvarNovaCategoria() {
  if (!novaCategoriaNome.value.trim()) return

  salvandoCategoria.value = true
  const sucesso = await categoriasStore.adicionarCategoria(gastosStore.telefone, {
    nome: novaCategoriaNome.value.trim(),
    icone: novaCategoriaIcone.value.trim() || '🏷️'
  })
  salvandoCategoria.value = false

  if (sucesso) {
    modelValue.value = novaCategoriaNome.value.trim()
    isModalOpen.value = false
  }
}
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

  <DialogRoot v-model:open="isModalOpen">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity" />
      <DialogContent class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl z-50">
        <DialogTitle class="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Nova Categoria
        </DialogTitle>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nome</label>
            <input 
              v-model="novaCategoriaNome"
              type="text" 
              maxlength="50"
              placeholder="Ex: Faculdade, Pets..."
              class="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Ícone (Emoji)</label>
            <input 
              v-model="novaCategoriaIcone"
              type="text" 
              maxlength="10"
              class="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-center text-2xl"
            />
          </div>
        </div>

        <div class="mt-4">
          <p class="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1.5">Prévia</p>
          <span class="inline-flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-md font-medium bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200">
            {{ novaCategoriaIcone.trim() || '🏷️' }} {{ novaCategoriaNome.trim() || 'Nova categoria' }}
          </span>
        </div>

        <div v-if="categoriasStore.erro" class="mt-4 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
          <p class="text-red-500 dark:text-red-400 text-sm font-semibold">{{ categoriasStore.erro }}</p>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <DialogClose as-child>
            <button class="px-4 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
              Cancelar
            </button>
          </DialogClose>
          <button 
            @click="salvarNovaCategoria"
            :disabled="salvandoCategoria || !novaCategoriaNome.trim()"
            class="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50"
          >
            {{ salvandoCategoria ? 'Salvando...' : 'Salvar' }}
          </button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

