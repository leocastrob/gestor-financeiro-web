import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'

export interface Transacao {
  id: number | string
  telefone: string
  descricao: string
  valor: number | string
  data: string | Date
}

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
      let url = `/api/gastos/${telefone.value}`
      if (mes && ano) {
        url += `?mes=${mes}&ano=${ano}`
      }
      
      const resposta = await fetch(url)
      
      if (!resposta.ok) {
        throw new Error('Falha ao buscar os dados do servidor')
      }
      
      const dados = await resposta.json()
      transacoes.value = dados
      
    } catch (e) {
      console.error(e)
      erro.value = 'Não foi possível conectar ao servidor.'
    } finally {
      carregando.value = false
    }
  }

  // Ação: Exclui um gasto específico
  const excluirGasto = async (id: number | string) => {
    try {
      const resposta = await fetch(`/api/gastos/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ telefone: telefone.value })
      })

      if (!resposta.ok) {
        throw new Error('Falha ao excluir o gasto.')
      }

      // Remove localmente sem precisar buscar do servidor novamente
      transacoes.value = transacoes.value.filter(t => t.id !== id)
    } catch (e) {
      console.error(e)
      alert('Erro ao excluir o gasto. Tente novamente.')
    }
  }

  const logout = () => {
    telefone.value = ''
    transacoes.value = []
  }

  return { transacoes, carregando, erro, telefone, totalGastos, setTelefone, buscarGastos, excluirGasto, logout }
})