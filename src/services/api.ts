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
  tipo?: 'despesa' | 'receita'
}

export interface DadosNovoGasto {
  descricao: string
  valor: number
  categoria?: string
  tipo?: 'despesa' | 'receita'
}

export function buscarGastos(telefone: string, mes?: number, ano?: number) {
  let url = `${BASE_URL}/api/gastos/${telefone}`
  if (mes && ano) url += `?mes=${mes}&ano=${ano}`
  return fetch(url).then(tratarResposta)
}

export function criarGasto(telefone: string, dados: DadosNovoGasto) {
  return fetch(`${BASE_URL}/api/gastos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telefone, ...dados }),
  }).then(tratarResposta)
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

export interface DadosMeta {
  categoria: string
  valor_teto: number
}

export function buscarMetas(telefone: string) {
  return fetch(`${BASE_URL}/api/metas/${telefone}`).then(tratarResposta)
}

export function salvarMeta(telefone: string, dados: DadosMeta) {
  return fetch(`${BASE_URL}/api/metas`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telefone, ...dados }),
  }).then(tratarResposta)
}

export function removerMeta(telefone: string, categoria: string) {
  return fetch(`${BASE_URL}/api/metas/${telefone}/${encodeURIComponent(categoria)}`, {
    method: 'DELETE',
  }).then(tratarResposta)
}

// --- Extrato bancário (Feature 1) ---

export interface PreviewExtratoResponse {
  formato: 'OFX' | 'CSV'
  nomeBanco: string | null
  totalLinhas: number
  precisaMapeamento: boolean
  colunas?: string[]
  amostra?: Record<string, unknown>[]
  perfilExistente?: boolean
}

export interface MapeamentoCSV {
  colunaData: string
  colunaDescricao: string
  colunaValor: string
  formatoData?: string
  separadorDecimal?: string
  nomeBanco?: string
}

export interface ImportarExtratoResponse {
  extratoId: number
  formato: string
  nomeBanco: string | null
  totalLinhas: number
  totalImportadas: number
  totalDuplicadas: number
}

export function previewExtrato(file: File, telefone: string): Promise<PreviewExtratoResponse> {
  const form = new FormData()
  form.append('file', file)
  form.append('telefone', telefone)
  return fetch(`${BASE_URL}/api/extratos/preview`, {
    method: 'POST',
    body: form,
  }).then(tratarResposta)
}

export function importarExtrato(
  file: File,
  telefone: string,
  mapeamento?: MapeamentoCSV,
): Promise<ImportarExtratoResponse> {
  const form = new FormData()
  form.append('file', file)
  form.append('telefone', telefone)
  if (mapeamento) {
    form.append('mapeamento', JSON.stringify(mapeamento))
  }
  return fetch(`${BASE_URL}/api/extratos/importar`, {
    method: 'POST',
    body: form,
  }).then(tratarResposta)
}
