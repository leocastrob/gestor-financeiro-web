// Conversões entre o formato de <input type="date"> (AAAA-MM-DD, sempre local)
// e o que a API devolve na coluna `data` (Date do mysql2, serializado em ISO UTC).

const APENAS_DIA = /^\d{4}-\d{2}-\d{2}$/

function doisDigitos(numero: number): string {
  return String(numero).padStart(2, '0')
}

function diaLocalISO(momento: Date): string {
  return `${momento.getFullYear()}-${doisDigitos(momento.getMonth() + 1)}-${doisDigitos(momento.getDate())}`
}

export function hojeISO(): string {
  return diaLocalISO(new Date())
}

export function paraInputDate(valor: string | Date): string {
  // Uma string AAAA-MM-DD já é o formato do input. Passá-la por new Date()
  // a interpretaria como meia-noite UTC e recuaria um dia em fusos negativos.
  if (typeof valor === 'string' && APENAS_DIA.test(valor)) return valor

  const momento = valor instanceof Date ? valor : new Date(valor)
  if (Number.isNaN(momento.getTime())) return ''

  return diaLocalISO(momento)
}
