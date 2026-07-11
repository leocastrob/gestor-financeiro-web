<script setup lang="ts">
import { ref } from 'vue'
import { DropdownMenuRoot, DropdownMenuTrigger, DropdownMenuPortal, DropdownMenuContent, DropdownMenuItem } from 'reka-ui'
import { exportarCsv, exportarPdf } from '../services/exportar'
import type { Transacao } from '../stores/gastos'

const props = defineProps<{
  transacoes: Transacao[]
  mes: number
  ano: number
}>()

const aberto = ref(false)

const exportar = (formato: 'csv' | 'pdf') => {
  if (formato === 'csv') exportarCsv(props.transacoes, props.mes, props.ano)
  else exportarPdf(props.transacoes, props.mes, props.ano)
  aberto.value = false
}
</script>

<template>
  <DropdownMenuRoot v-model:open="aberto">
    <DropdownMenuTrigger
      :disabled="transacoes.length === 0"
      class="flex-shrink-0 px-4 py-2.5 rounded-2xl font-semibold text-sm text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
    >
      ⬇ Exportar
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        class="z-50 min-w-40 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl shadow-slate-900/10 dark:shadow-black/40 p-1"
        :side-offset="6"
        align="end"
      >
        <DropdownMenuItem
          class="px-3 py-2.5 rounded-xl text-sm text-slate-600 dark:text-slate-300 outline-none cursor-pointer data-[highlighted]:bg-slate-900/5 dark:data-[highlighted]:bg-white/5"
          @select="exportar('csv')"
        >
          📄 CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          class="px-3 py-2.5 rounded-xl text-sm text-slate-600 dark:text-slate-300 outline-none cursor-pointer data-[highlighted]:bg-slate-900/5 dark:data-[highlighted]:bg-white/5"
          @select="exportar('pdf')"
        >
          📕 PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
