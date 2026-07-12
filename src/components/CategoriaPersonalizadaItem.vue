<script setup lang="ts">
import { ref } from 'vue'
import type { CategoriaPersonalizada, DadosEdicaoCategoria } from '../services/api'
import { corDaCategoria } from '../theme/categorias'

const props = defineProps<{
  categoria: CategoriaPersonalizada
  editando: boolean
  salvando: boolean
}>()

const emit = defineEmits<{
  'iniciar-edicao': [categoria: CategoriaPersonalizada]
  'cancelar-edicao': []
  salvar: [id: number, dados: DadosEdicaoCategoria]
  excluir: [id: number]
}>()

const formNome = ref('')
const formIcone = ref('')

const iniciarEdicao = () => {
  formNome.value = props.categoria.nome
  formIcone.value = props.categoria.icone
  emit('iniciar-edicao', props.categoria)
}

const salvar = () => {
  emit('salvar', props.categoria.id, {
    nome: formNome.value.trim(),
    icone: formIcone.value.trim() || '🏷️',
  })
}
</script>

<template>
  <div class="p-4 bg-white/70 dark:bg-white/5 backdrop-blur-sm rounded-2xl border border-slate-200/70 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-all duration-200">

    <!-- Modo edição -->
    <div v-if="editando" class="flex gap-2 sm:gap-3 items-start">
      <input v-model="formIcone" type="text" maxlength="10" placeholder="🏷️"
        class="w-16 flex-shrink-0 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-lg text-center rounded-xl px-2 py-2 outline-none focus:border-emerald-400" />
      <input v-model="formNome" type="text" maxlength="50" placeholder="Nome da categoria"
        class="flex-1 min-w-0 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-400" />
      <div class="flex gap-1 flex-shrink-0">
        <button @click="emit('cancelar-edicao')" :disabled="salvando"
          class="px-3 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 rounded-lg">
          Cancelar
        </button>
        <button @click="salvar" :disabled="salvando || !formNome.trim()"
          class="px-3 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60">
          {{ salvando ? 'Salvando...' : 'Salvar' }}
        </button>
      </div>
    </div>

    <!-- Modo visualização -->
    <div v-else class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3 min-w-0">
        <span class="text-xl leading-none flex-shrink-0">{{ categoria.icone }}</span>
        <span class="text-base font-bold text-slate-800 dark:text-slate-200 truncate">{{ categoria.nome }}</span>
        <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ backgroundColor: corDaCategoria(categoria.nome) }" title="Cor nos gráficos"></span>
      </div>
      <div class="flex items-center gap-1 flex-shrink-0">
        <button @click="iniciarEdicao"
          class="p-2 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
          title="Editar categoria" aria-label="Editar categoria">
          ✏️
        </button>
        <button @click="emit('excluir', categoria.id)"
          class="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
          title="Excluir categoria" aria-label="Excluir categoria">
          🗑️
        </button>
      </div>
    </div>
  </div>
</template>
