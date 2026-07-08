// Cliente de API: centraliza todas as chamadas fetch, tratamento de erro e a URL base.
// VITE_API_URL permite rodar o front separado da API durante o desenvolvimento;
// em produção (mesmo domínio) o fallback de caminho relativo funciona sem configurar nada.
const BASE_URL = import.meta.env.VITE_API_URL || ''

async function tratarResposta(resposta: Response) {
  if (!resposta.ok) {
    let mensagem = 'Falha ao comunicar com o servidor.'
    try {
      const dados = await resposta.json()
      if (dados?.erro) mensagem = dados.erro
    } catch {
      // resposta sem corpo JSON, mantém a mensagem padrão
    }
    throw new Error(mensagem)
  }
  return resposta.json()
}

export interface DadosEdicaoGasto {
  descricao?: string
  categoria?: string
  valor?: number
}

export function buscarGastos(telefone: string, mes?: number, ano?: number) {
  let url = `${BASE_URL}/api/gastos/${telefone}`
  if (mes && ano) url += `?mes=${mes}&ano=${ano}`
  return fetch(url).then(tratarResposta)
}

export function excluirGasto(id: number | string, telefone: string) {
  return fetch(`${BASE_URL}/api/gastos/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telefone }),
  }).then(tratarResposta)
}

export function editarGasto(id: number | string, telefone: string, dados: DadosEdicaoGasto) {
  return fetch(`${BASE_URL}/api/gastos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telefone, ...dados }),
  }).then(tratarResposta)
}

export function solicitarPin(telefone: string) {
  return fetch(`${BASE_URL}/api/auth/solicitar-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telefone }),
  }).then(tratarResposta)
}

export function confirmarPin(telefone: string, pin: string) {
  return fetch(`${BASE_URL}/api/auth/confirmar-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telefone, pin }),
  }).then(tratarResposta)
}
