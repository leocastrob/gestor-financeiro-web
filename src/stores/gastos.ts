import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import * as api from '../services/api'
import type { DadosEdicaoGasto } from '../services/api'

export interface Transacao {
  id: number | string
  telefone: string
  descricao: string
  categoria: string
  valor: number | string
  data: string | Date
}

export const CATEGORIAS = ['Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Moradia', 'Pets', 'Outros']

export const useGastosStore = defineStore('gastos', () => {
  // Inicializa o telefone buscando do localStorage se existir
  const telefone = ref<string>(localStorage.getItem('gestor_telefone') || '')

  // Observa qualquer mudança no telefone para salvar no localStorage
  watch(telefone, (novoValor) => {
    if (novoValor) {
      localStorage.setItem('gestor_telefone', novoValor)
    } else {
      localStorage.removeItem('gestor_telefone')
    }
  })

  // Estado
  const transacoes = ref<Transacao[]>([])
  const carregando = ref(false)
  const erro = ref<string | null>(null)
  // Erro de uma ação pontual (excluir/editar) — exibido como banner dispensável, não bloqueia a tela
  const erroAcao = ref<string | null>(null)

  // Computed: Total de gastos formatado
  const totalGastos = computed(() => {
    const total = transacoes.value.reduce((acc, t) => acc + Number(t.valor), 0)
    return total.toFixed(2).replace('.', ',')
  })

  // Define o telefone do usuário logado
  const setTelefone = (num: string) => {
    telefone.value = num
  }

  // Ação: Busca os gastos filtrados por número de telefone e data
  const buscarGastos = async (mes?: number, ano?: number) => {
    if (!telefone.value) return

    carregando.value = true
    erro.value = null

    try {
      transacoes.value = await api.buscarGastos(telefone.value, mes, ano)
    } catch (e) {
      console.error(e)
      erro.value = 'Não foi possível conectar ao servidor.'
    } finally {
      carregando.value = false
    }
  }

  // Ação: Exclui um gasto específico
  const excluirGasto = async (id: number | string) => {
    erroAcao.value = null
    try {
      await api.excluirGasto(id, telefone.value)
      // Remove localmente sem precisar buscar do servidor novamente
      transacoes.value = transacoes.value.filter((t) => t.id !== id)
    } catch (e) {
      console.error(e)
      erroAcao.value = 'Erro ao excluir o gasto. Tente novamente.'
    }
  }

  // Ação: Edita descrição/categoria/valor de um gasto
  const editarGasto = async (id: number | string, dados: DadosEdicaoGasto) => {
    erroAcao.value = null
    try {
      await api.editarGasto(id, telefone.value, dados)
      const item = transacoes.value.find((t) => t.id === id)
      if (item) Object.assign(item, dados)
      return true
    } catch (e) {
      console.error(e)
      erroAcao.value = 'Erro ao editar o gasto. Tente novamente.'
      return false
    }
  }

  const logout = () => {
    telefone.value = ''
    transacoes.value = []
  }

  return {
    transacoes,
    carregando,
    erro,
    erroAcao,
    telefone,
    totalGastos,
    setTelefone,
    buscarGastos,
    excluirGasto,
    editarGasto,
    logout,
  }
})
