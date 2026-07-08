import { ref, watchEffect } from 'vue'

type Tema = 'light' | 'dark'

const CHAVE_LOCALSTORAGE = 'gestor_tema'

const tema = ref<Tema>((localStorage.getItem(CHAVE_LOCALSTORAGE) as Tema | null) || 'dark')

watchEffect(() => {
  document.documentElement.classList.toggle('dark', tema.value === 'dark')
  localStorage.setItem(CHAVE_LOCALSTORAGE, tema.value)
})

export function useTema() {
  const alternar = () => {
    tema.value = tema.value === 'dark' ? 'light' : 'dark'
  }
  return { tema, alternar }
}
