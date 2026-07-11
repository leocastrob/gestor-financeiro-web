import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as api from '../services/api'

export interface Meta {
  telefone: string
  categoria: string
  valor_teto: number | string
}

export const useMetasStore = defineStore('metas', () => {
  const metas = ref<Meta[]>([])
  const carregando = ref(false)
  const erro = ref<string | null>(null)
  const erroAcao = ref<string | null>(null)

  const buscarMetas = async (telefone: string) => {
    if (!telefone) return
    carregando.value = true
    erro.value = null
    try {
      metas.value = await api.buscarMetas(telefone)
    } catch (e) {
      console.error(e)
      erro.value = 'Não foi possível carregar as metas.'
    } finally {
      carregando.value = false
    }
  }

  const salvarMeta = async (telefone: string, categoria: string, valorTeto: number) => {
    erroAcao.value = null
    try {
      await api.salvarMeta(telefone, { categoria, valor_teto: valorTeto })
      const existente = metas.value.find((m) => m.categoria === categoria)
      if (existente) {
        existente.valor_teto = valorTeto
      } else {
        metas.value.push({ telefone, categoria, valor_teto: valorTeto })
      }
      return true
    } catch (e) {
      console.error(e)
      erroAcao.value = 'Erro ao salvar a meta. Tente novamente.'
      return false
    }
  }

  const removerMeta = async (telefone: string, categoria: string) => {
    erroAcao.value = null
    try {
      await api.removerMeta(telefone, categoria)
      metas.value = metas.value.filter((m) => m.categoria !== categoria)
      return true
    } catch (e) {
      console.error(e)
      erroAcao.value = 'Erro ao remover a meta. Tente novamente.'
      return false
    }
  }

  const metaDaCategoria = (categoria: string) => metas.value.find((m) => m.categoria === categoria)

  // Ação: limpa o estado do usuário anterior (chamada no logout, junto com
  // gastosStore.logout()) para não deixar metas em memória em dispositivo
  // compartilhado.
  const resetar = () => {
    metas.value = []
    erro.value = null
    erroAcao.value = null
  }

  return { metas, carregando, erro, erroAcao, buscarMetas, salvarMeta, removerMeta, metaDaCategoria, resetar }
})
