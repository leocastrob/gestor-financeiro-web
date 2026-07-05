import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export interface Transacao {
  id: number | string
  telefone: string
  descricao: string
  valor: number | string
  data: string | Date
}

export const useGastosStore = defineStore('gastos', () => {
  // Estado
  const transacoes = ref<Transacao[]>([])
  const carregando = ref(false)
  const erro = ref<string | null>(null)
  const telefone = ref<string | null>(null)

  // Computed: Total de gastos formatado
  const totalGastos = computed(() => {
    const total = transacoes.value.reduce((acc, t) => acc + Number(t.valor), 0)
    return total.toFixed(2).replace('.', ',')
  })

  // Define o telefone do usuário logado
  const setTelefone = (num: string) => {
    telefone.value = num
  }

  // Ação: Busca os gastos filtrados por número de telefone
  const buscarGastos = async () => {
    if (!telefone.value) return

    carregando.value = true
    erro.value = null
    
    try {
      // Front e API rodam no mesmo servidor Fastify
      const resposta = await fetch(`/gastos/${telefone.value}`)
      
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

  const logout = () => {
    telefone.value = null
    transacoes.value = []
  }

  return { transacoes, carregando, erro, telefone, totalGastos, setTelefone, buscarGastos, logout }
})