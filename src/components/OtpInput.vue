<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = withDefaults(defineProps<{ modelValue: string; length?: number; erro?: boolean }>(), {
  length: 6,
  erro: false,
})

const emit = defineEmits<{
  'update:modelValue': [valor: string]
  completo: [valor: string]
}>()

const digitos = ref<string[]>(Array.from({ length: props.length }, (_, i) => props.modelValue[i] ?? ''))
const inputsRef = ref<HTMLInputElement[]>([])

watch(
  () => props.modelValue,
  (novoValor) => {
    if (novoValor === digitos.value.join('')) return
    digitos.value = Array.from({ length: props.length }, (_, i) => novoValor[i] ?? '')
  },
)

const emitirValor = () => {
  const valor = digitos.value.join('')
  emit('update:modelValue', valor)
  if (valor.length === props.length && !digitos.value.includes('')) emit('completo', valor)
}

const focarCaixa = async (indice: number) => {
  await nextTick()
  inputsRef.value[indice]?.focus()
  inputsRef.value[indice]?.select()
}

const aoDigitar = (indice: number, event: Event) => {
  const input = event.target as HTMLInputElement
  const somenteNumeros = input.value.replace(/\D/g, '')
  const ultimoDigito = somenteNumeros.slice(-1)
  digitos.value[indice] = ultimoDigito
  emitirValor()
  if (ultimoDigito && indice < props.length - 1) focarCaixa(indice + 1)
}

const aoTeclar = (indice: number, event: KeyboardEvent) => {
  if (event.key === 'Backspace' && !digitos.value[indice] && indice > 0) {
    digitos.value[indice - 1] = ''
    emitirValor()
    focarCaixa(indice - 1)
  } else if (event.key === 'ArrowLeft' && indice > 0) {
    focarCaixa(indice - 1)
  } else if (event.key === 'ArrowRight' && indice < props.length - 1) {
    focarCaixa(indice + 1)
  }
}

const aoColar = (indice: number, event: ClipboardEvent) => {
  event.preventDefault()
  const colado = (event.clipboardData?.getData('text') || '').replace(/\D/g, '')
  if (!colado) return
  for (let i = 0; i < colado.length && indice + i < props.length; i++) {
    digitos.value[indice + i] = colado[i]!
  }
  emitirValor()
  const proximoVazio = digitos.value.findIndex((d) => !d)
  focarCaixa(proximoVazio === -1 ? props.length - 1 : proximoVazio)
}

defineExpose({ focar: () => focarCaixa(0) })
</script>

<template>
  <div class="flex gap-2 justify-center">
    <input
      v-for="(_, indice) in digitos"
      :key="indice"
      :ref="(el) => { if (el) inputsRef[indice] = el as HTMLInputElement }"
      :value="digitos[indice]"
      type="text"
      inputmode="numeric"
      maxlength="1"
      autocomplete="one-time-code"
      :aria-label="`Dígito ${indice + 1} do código de verificação`"
      @input="aoDigitar(indice, $event)"
      @keydown="aoTeclar(indice, $event)"
      @paste="aoColar(indice, $event)"
      @focus="($event.target as HTMLInputElement).select()"
      :class="[
        'w-11 h-12 sm:w-12 sm:h-14 rounded-2xl border-2 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white text-2xl font-mono text-center',
        'placeholder-slate-400 dark:placeholder-slate-500/50 outline-none transition-all duration-200',
        'focus:border-emerald-400 focus:shadow-lg focus:shadow-emerald-500/20 focus-visible:ring-2 focus-visible:ring-emerald-400/50',
        erro ? 'border-red-400/60' : 'border-slate-200 dark:border-white/10',
      ]"
    />
  </div>
</template>
