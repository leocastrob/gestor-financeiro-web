import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  buscarCategoriasCustomizadas,
  criarCategoriaCustomizada,
  excluirCategoriaCustomizada,
  type CategoriaPersonalizada,
  type DadosNovaCategoria
} from '@/services/api'

export const useCategoriasStore = defineStore('categorias', () => {
  const categorias = ref<CategoriaPersonalizada[]>([])
  const carregando = ref(false)
  const erro = ref<string | null>(null)

  async function carregarCategorias(telefone: string) {
    if (!telefone) return
    carregando.value = true
    erro.value = null
    try {
      categorias.value = await buscarCategoriasCustomizadas(telefone)
    } catch (e: any) {
      erro.value = e.message
    } finally {
      carregando.value = false
    }
  }

  async function adicionarCategoria(telefone: string, dados: DadosNovaCategoria) {
    erro.value = null
    try {
      const nova = await criarCategoriaCustomizada(telefone, dados)
      categorias.value.push(nova)
      return true
    } catch (e: any) {
      erro.value = e.message
      return false
    }
  }

  async function removerCategoria(telefone: string, id: number) {
    erro.value = null
    try {
      await excluirCategoriaCustomizada(id, telefone)
      categorias.value = categorias.value.filter(c => c.id !== id)
      return true
    } catch (e: any) {
      erro.value = e.message
      return false
    }
  }

  function limpar() {
    categorias.value = []
    erro.value = null
  }

  return {
    categorias,
    carregando,
    erro,
    carregarCategorias,
    adicionarCategoria,
    removerCategoria,
    limpar
  }
})
