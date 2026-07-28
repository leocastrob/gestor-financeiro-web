# Data de Lançamento Editável — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir escolher a data de uma despesa/receita no cadastro e alterá-la depois pelo portal, mantendo o dia atual como padrão quando nada é informado.

**Architecture:** Um módulo puro no backend (`lib/data-lancamento.js`) concentra toda a regra de validação e de montagem do timestamp; as rotas `POST /api/gastos` e `PATCH /api/gastos/:id` apenas o consomem. No frontend, um util (`utils/dataInput.ts`) faz as conversões entre o `Date` que a API devolve e o `YYYY-MM-DD` que o `<input type="date">` exige; a store recarrega a lista quando a data muda, evitando estado local inconsistente.

**Tech Stack:** Backend Fastify + mysql2 + `node:test`. Frontend Vue 3 (`<script setup>`) + Pinia + Vitest + Tailwind.

**Spec:** `gestor-financeiro-web/docs/superpowers/specs/2026-07-28-data-lancamento-editavel-design.md`

## Global Constraints

- Dois repositórios git independentes: `gestor-financeiro-api/` e `gestor-financeiro-web/`. Cada task commita no repo que ela toca. Não existe repo na raiz `gestor-financeiro/`.
- **Nunca** passar objeto `Date` para o mysql2 na coluna `data`. Sempre string `'YYYY-MM-DD HH:MM:SS'`. Um `Date` é serializado em UTC e divergiria do `CURRENT_TIMESTAMP`, que o MySQL avalia na timezone da sessão. `plugins/db.js` não fixa `timezone` no pool.
- O campo `data` é sempre opcional na API. Ausente, `null` ou `''` significa "não informado": no `POST` cai no `CURRENT_TIMESTAMP` atual, no `PATCH` significa "não alterar". Isso mantém bot WhatsApp e importação de extrato funcionando sem alteração.
- Mensagens de erro exatas, em português: `'Data inválida. Use o formato AAAA-MM-DD.'` e `'Data não pode ser futura.'`
- Backend: indentação de 4 espaços, `'use strict'` no topo, `module.exports`. Frontend: 2 espaços, sem ponto e vírgula, TypeScript.
- Mensagens de commit em português, prefixo Conventional Commits (`feat:`, `test:`, `docs:`). **Não** incluir linha `Co-Authored-By`.

---

### Task 1: Módulo de resolução da data (backend)

Módulo puro, sem Fastify e sem banco. Recebe o que veio do body e devolve ou o
timestamp pronto para o SQL, ou uma mensagem de erro.

O parâmetro `agora` existe para os testes: sem ele, "hoje" mudaria conforme o
relógio da máquina e o teste do caminho "data igual a hoje" seria não
determinístico. Em produção ninguém passa o segundo argumento.

**Files:**
- Create: `gestor-financeiro-api/lib/data-lancamento.js`
- Test: `gestor-financeiro-api/test/lib/data-lancamento.test.js`

**Interfaces:**
- Consumes: nada
- Produces: `resolverDataLancamento(valor, agora = new Date())` →
  `{ ok: true, timestamp: null }` (não informado) |
  `{ ok: true, timestamp: '2026-07-10 12:00:00' }` |
  `{ ok: false, erro: string }`

- [ ] **Step 1: Escrever os testes que falham**

Criar `gestor-financeiro-api/test/lib/data-lancamento.test.js`:

```js
'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { resolverDataLancamento } = require('../../lib/data-lancamento')

// Relógio fixo usado em todos os testes: 28/07/2026 às 14:32:07, hora local.
const AGORA = new Date(2026, 6, 28, 14, 32, 7)

test('valor não informado devolve timestamp nulo (mantém CURRENT_TIMESTAMP)', () => {
    for (const vazio of [undefined, null, '']) {
        assert.deepStrictEqual(resolverDataLancamento(vazio, AGORA), { ok: true, timestamp: null })
    }
})

test('data igual a hoje recebe a hora atual', () => {
    const resultado = resolverDataLancamento('2026-07-28', AGORA)
    assert.deepStrictEqual(resultado, { ok: true, timestamp: '2026-07-28 14:32:07' })
})

test('data no passado recebe meio-dia', () => {
    const resultado = resolverDataLancamento('2026-07-10', AGORA)
    assert.deepStrictEqual(resultado, { ok: true, timestamp: '2026-07-10 12:00:00' })
})

test('data no futuro é rejeitada', () => {
    const resultado = resolverDataLancamento('2026-07-29', AGORA)
    assert.deepStrictEqual(resultado, { ok: false, erro: 'Data não pode ser futura.' })
})

test('formato fora de AAAA-MM-DD é rejeitado', () => {
    for (const invalido of ['28/07/2026', '2026-7-8', '2026-07-28T10:00:00', 'ontem', 20260728]) {
        const resultado = resolverDataLancamento(invalido, AGORA)
        assert.deepStrictEqual(resultado, { ok: false, erro: 'Data inválida. Use o formato AAAA-MM-DD.' })
    }
})

test('dia inexistente no calendário é rejeitado', () => {
    for (const invalido of ['2026-02-31', '2026-13-01', '2026-00-10', '2026-04-31']) {
        const resultado = resolverDataLancamento(invalido, AGORA)
        assert.deepStrictEqual(resultado, { ok: false, erro: 'Data inválida. Use o formato AAAA-MM-DD.' })
    }
})

test('hora e mês de um dígito são preenchidos com zero à esquerda', () => {
    const madrugada = new Date(2026, 0, 5, 3, 4, 9)
    assert.deepStrictEqual(
        resolverDataLancamento('2026-01-05', madrugada),
        { ok: true, timestamp: '2026-01-05 03:04:09' }
    )
})
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

```bash
cd gestor-financeiro-api && NODE_ENV=test node --test test/lib/data-lancamento.test.js
```

Esperado: FAIL — `Cannot find module '../../lib/data-lancamento'`.

- [ ] **Step 3: Implementar o módulo**

Criar `gestor-financeiro-api/lib/data-lancamento.js`:

```js
'use strict'

// Regra da data de lançamento (ver docs do spec 2026-07-28):
// - não informada  -> deixa o INSERT usar CURRENT_TIMESTAMP
// - hoje           -> hora atual, para preservar a ordenação `ORDER BY data DESC` do dia
// - passado        -> meio-dia, para que diferença de fuso entre navegador e servidor
//                     nunca empurre o lançamento para o dia anterior
// - futuro         -> rejeitado; infla o mês seguinte sem dinheiro movimentado

const FORMATO_ISO = /^\d{4}-\d{2}-\d{2}$/
const ERRO_FORMATO = 'Data inválida. Use o formato AAAA-MM-DD.'
const ERRO_FUTURO = 'Data não pode ser futura.'

function doisDigitos(numero) {
    return String(numero).padStart(2, '0')
}

// Dia local de um Date, em AAAA-MM-DD
function diaLocalISO(momento) {
    return `${momento.getFullYear()}-${doisDigitos(momento.getMonth() + 1)}-${doisDigitos(momento.getDate())}`
}

function horaLocal(momento) {
    return `${doisDigitos(momento.getHours())}:${doisDigitos(momento.getMinutes())}:${doisDigitos(momento.getSeconds())}`
}

function resolverDataLancamento(valor, agora = new Date()) {
    if (valor === undefined || valor === null || valor === '') {
        return { ok: true, timestamp: null }
    }

    if (typeof valor !== 'string' || !FORMATO_ISO.test(valor)) {
        return { ok: false, erro: ERRO_FORMATO }
    }

    const [ano, mes, dia] = valor.split('-').map(Number)
    // O Date "conserta" datas inexistentes sozinho (2026-02-31 vira 03/03).
    // Comparar os componentes de volta é o que denuncia esse caso.
    const candidata = new Date(ano, mes - 1, dia)
    if (
        candidata.getFullYear() !== ano ||
        candidata.getMonth() !== mes - 1 ||
        candidata.getDate() !== dia
    ) {
        return { ok: false, erro: ERRO_FORMATO }
    }

    // Comparação lexicográfica de AAAA-MM-DD equivale à cronológica
    const hoje = diaLocalISO(agora)
    if (valor > hoje) {
        return { ok: false, erro: ERRO_FUTURO }
    }

    if (valor === hoje) {
        return { ok: true, timestamp: `${valor} ${horaLocal(agora)}` }
    }

    return { ok: true, timestamp: `${valor} 12:00:00` }
}

module.exports = { resolverDataLancamento }
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

```bash
cd gestor-financeiro-api && NODE_ENV=test node --test test/lib/data-lancamento.test.js
```

Esperado: PASS, 7 testes.

- [ ] **Step 5: Rodar a suíte inteira do backend**

```bash
cd gestor-financeiro-api && npm test
```

Esperado: nenhuma regressão.

- [ ] **Step 6: Commit**

```bash
cd gestor-financeiro-api
git add lib/data-lancamento.js test/lib/data-lancamento.test.js
git commit -m "feat: adiciona resolução da data de lançamento (lib/data-lancamento)"
```

---

### Task 2: Rotas aceitam `data` (backend)

`POST /api/gastos` e `PATCH /api/gastos/:id` passam a ler `data` do body.

Os testes fazem stub em `app.db.query`, então o caminho feliz de INSERT/UPDATE
também é verificável sem MySQL — basta inspecionar o SQL e os parâmetros que a
rota monta.

**Files:**
- Modify: `gestor-financeiro-api/routes/api/gastos/index.js` (POST em `:8-44`, PATCH em `:98-141`)
- Test: `gestor-financeiro-api/test/routes/api/gastos.test.js` (acrescentar ao final)

**Interfaces:**
- Consumes: `resolverDataLancamento(valor, agora)` da Task 1
- Produces: `POST /api/gastos` e `PATCH /api/gastos/:id` aceitam `data` opcional no body, formato `YYYY-MM-DD`. Contrato de resposta inalterado: POST devolve 201 com o registro criado, PATCH devolve `{ sucesso, mensagem }`.

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao final de `gestor-financeiro-api/test/routes/api/gastos.test.js`:

```js
test('POST /api/gastos rejeita data no futuro', async (t) => {
    const app = await build(t)

    const res = await app.inject({
        method: 'POST',
        url: '/api/gastos',
        payload: { telefone: '5511999999999', descricao: 'mercado', valor: 50, data: '2099-01-01' }
    })
    assert.strictEqual(res.statusCode, 400)
    assert.strictEqual(res.json().erro, 'Data não pode ser futura.')
})

test('POST /api/gastos rejeita data com formato inválido', async (t) => {
    const app = await build(t)

    const res = await app.inject({
        method: 'POST',
        url: '/api/gastos',
        payload: { telefone: '5511999999999', descricao: 'mercado', valor: 50, data: '10/07/2026' }
    })
    assert.strictEqual(res.statusCode, 400)
    assert.strictEqual(res.json().erro, 'Data inválida. Use o formato AAAA-MM-DD.')
})

test('POST /api/gastos sem data não inclui a coluna no INSERT', async (t) => {
    const app = await build(t)

    app.db.query = async (sql, params) => {
        if (/INSERT/.test(sql)) {
            assert.doesNotMatch(sql, /\bdata\b/)
            assert.strictEqual(params.length, 5)
            return [{ insertId: 1 }]
        }
        return [[{ id: 1 }]]
    }

    const res = await app.inject({
        method: 'POST',
        url: '/api/gastos',
        payload: { telefone: '5511999999999', descricao: 'mercado', valor: 50 }
    })
    assert.strictEqual(res.statusCode, 201)
})

test('POST /api/gastos com data passada grava meio-dia', async (t) => {
    const app = await build(t)

    app.db.query = async (sql, params) => {
        if (/INSERT/.test(sql)) {
            assert.match(sql, /INSERT INTO gastos \(telefone, descricao, valor, categoria, tipo, data\)/)
            assert.deepStrictEqual(params, ['5511999999999', 'mercado', 50, 'Alimentação', 'despesa', '2020-03-15 12:00:00'])
            return [{ insertId: 9 }]
        }
        return [[{ id: 9, descricao: 'mercado' }]]
    }

    const res = await app.inject({
        method: 'POST',
        url: '/api/gastos',
        payload: { telefone: '5511999999999', descricao: 'mercado', valor: 50, data: '2020-03-15' }
    })
    assert.strictEqual(res.statusCode, 201)
})

test('PATCH /api/gastos/:id rejeita data no futuro', async (t) => {
    const app = await build(t)

    const res = await app.inject({
        method: 'PATCH',
        url: '/api/gastos/1',
        payload: { telefone: '5511999999999', data: '2099-01-01' }
    })
    assert.strictEqual(res.statusCode, 400)
    assert.strictEqual(res.json().erro, 'Data não pode ser futura.')
})

test('PATCH /api/gastos/:id rejeita data com formato inválido', async (t) => {
    const app = await build(t)

    const res = await app.inject({
        method: 'PATCH',
        url: '/api/gastos/1',
        payload: { telefone: '5511999999999', data: '2026-02-31' }
    })
    assert.strictEqual(res.statusCode, 400)
    assert.strictEqual(res.json().erro, 'Data inválida. Use o formato AAAA-MM-DD.')
})

test('PATCH /api/gastos/:id atualiza só a data quando é o único campo enviado', async (t) => {
    const app = await build(t)

    app.db.query = async (sql, params) => {
        assert.match(sql, /UPDATE gastos SET data = \? WHERE id = \? AND telefone = \?/)
        assert.deepStrictEqual(params, ['2020-03-15 12:00:00', '1', '5511999999999'])
        return [{ affectedRows: 1 }]
    }

    const res = await app.inject({
        method: 'PATCH',
        url: '/api/gastos/1',
        payload: { telefone: '5511999999999', data: '2020-03-15' }
    })
    assert.strictEqual(res.statusCode, 200)
    assert.strictEqual(res.json().sucesso, true)
})
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

```bash
cd gestor-financeiro-api && NODE_ENV=test node --test test/routes/api/gastos.test.js
```

Esperado: FAIL. Os testes de rejeição falham com 201/404 em vez de 400 (a rota
ignora `data` hoje); o teste de PATCH só-data falha com 400 `'Nenhum campo para
atualizar.'`

- [ ] **Step 3: Importar o módulo na rota**

Em `gestor-financeiro-api/routes/api/gastos/index.js`, logo abaixo do `require` de `categorizar` (linha 3):

```js
const { resolverDataLancamento } = require('../../../lib/data-lancamento')
```

- [ ] **Step 4: Aceitar `data` no POST**

Trocar a desestruturação do body (linha 9) por:

```js
        const { telefone, descricao, valor, categoria, tipo, data } = request.body || {}
```

Depois da linha que calcula `categoriaFinal`, antes do `try`, inserir:

```js
        const dataResolvida = resolverDataLancamento(data)
        if (!dataResolvida.ok) {
            return reply.status(400).send({ erro: dataResolvida.erro })
        }
```

Substituir o corpo do `try` (o `INSERT` e o `SELECT`) por:

```js
        try {
            // A coluna `data` só entra no INSERT quando o cliente informou uma;
            // ausente, o DEFAULT CURRENT_TIMESTAMP da tabela é quem resolve.
            const colunas = ['telefone', 'descricao', 'valor', 'categoria', 'tipo']
            const valores = [telefone, descricao.trim(), valorNumerico, categoriaFinal, tipoFinal]

            if (dataResolvida.timestamp) {
                colunas.push('data')
                valores.push(dataResolvida.timestamp)
            }

            const [resultado] = await fastify.db.query(
                `INSERT INTO gastos (${colunas.join(', ')}) VALUES (${colunas.map(() => '?').join(', ')})`,
                valores
            )
            const [linhas] = await fastify.db.query('SELECT * FROM gastos WHERE id = ?', [resultado.insertId])
            return reply.status(201).send(linhas[0])
        } catch (erro) {
            fastify.log.error(erro)
            return reply.status(500).send({ erro: 'Falha ao criar o gasto.' })
        }
```

- [ ] **Step 5: Aceitar `data` no PATCH**

Trocar a desestruturação do body (linha 100) por:

```js
        const { telefone, descricao, categoria, valor, tipo, data } = request.body || {}
```

Depois da validação de tamanho da categoria, antes de `const campos = []`, inserir:

```js
        const dataResolvida = resolverDataLancamento(data)
        if (!dataResolvida.ok) {
            return reply.status(400).send({ erro: dataResolvida.erro })
        }
```

Depois da linha que trata `tipo` na montagem dos campos, acrescentar:

```js
        if (dataResolvida.timestamp) { campos.push('data = ?'); valores.push(dataResolvida.timestamp) }
```

- [ ] **Step 6: Rodar os testes e confirmar que passam**

```bash
cd gestor-financeiro-api && NODE_ENV=test node --test test/routes/api/gastos.test.js
```

Esperado: PASS, incluindo os testes antigos de POST que verificam
`params` com 5 posições — eles não enviam `data`, então nada muda para eles.

- [ ] **Step 7: Rodar a suíte inteira do backend**

```bash
cd gestor-financeiro-api && npm test
```

Esperado: nenhuma regressão.

- [ ] **Step 8: Commit**

```bash
cd gestor-financeiro-api
git add routes/api/gastos/index.js test/routes/api/gastos.test.js
git commit -m "feat: POST e PATCH de gastos aceitam data de lançamento"
```

---

### Task 3: Util de data para os inputs (frontend)

Converte nos dois sentidos: o dia local de hoje para o `:max` e o valor inicial
dos inputs, e o `data` devolvido pela API para o formato do `<input type="date">`.

O cuidado central: a API devolve `data` como `Date` do mysql2, serializado em
JSON como ISO UTC (`"2026-07-28T17:32:07.000Z"`). Já uma string `'2026-07-28'`
crua, se passada a `new Date()`, é interpretada como meia-noite **UTC** e vira
27/07 em BRT. Por isso a string curta é devolvida como está, sem passar por `Date`.

**Files:**
- Create: `gestor-financeiro-web/src/utils/dataInput.ts`
- Test: `gestor-financeiro-web/src/utils/dataInput.test.ts`

**Interfaces:**
- Consumes: nada
- Produces: `hojeISO(): string` e `paraInputDate(valor: string | Date): string`, ambos em `../utils/dataInput`

- [ ] **Step 1: Escrever os testes que falham**

Criar `gestor-financeiro-web/src/utils/dataInput.test.ts`:

```ts
import { describe, it, expect, afterEach, vi } from 'vitest'
import { hojeISO, paraInputDate } from './dataInput'

afterEach(() => {
  vi.useRealTimers()
})

describe('hojeISO', () => {
  it('devolve o dia local em AAAA-MM-DD, com zero à esquerda', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 5, 23, 40, 0))

    expect(hojeISO()).toBe('2026-01-05')
  })
})

describe('paraInputDate', () => {
  it('converte um Date para o dia local', () => {
    expect(paraInputDate(new Date(2026, 6, 28, 14, 32, 7))).toBe('2026-07-28')
  })

  it('devolve uma string AAAA-MM-DD inalterada, sem passar por Date', () => {
    // new Date('2026-07-28') seria meia-noite UTC e viraria 27/07 em BRT
    expect(paraInputDate('2026-07-28')).toBe('2026-07-28')
  })

  it('converte o ISO completo que a API devolve para o dia local', () => {
    const iso = new Date(2026, 6, 28, 14, 32, 7).toISOString()

    expect(paraInputDate(iso)).toBe('2026-07-28')
  })

  it('devolve string vazia para valor inválido, em vez de chutar uma data', () => {
    expect(paraInputDate('banana')).toBe('')
    expect(paraInputDate('')).toBe('')
  })
})
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

```bash
cd gestor-financeiro-web && npx vitest run src/utils/dataInput.test.ts
```

Esperado: FAIL — `Failed to resolve import "./dataInput"`.

- [ ] **Step 3: Implementar o util**

Criar `gestor-financeiro-web/src/utils/dataInput.ts`:

```ts
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
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

```bash
cd gestor-financeiro-web && npx vitest run src/utils/dataInput.test.ts
```

Esperado: PASS, 5 testes.

- [ ] **Step 5: Commit**

```bash
cd gestor-financeiro-web
git add src/utils/dataInput.ts src/utils/dataInput.test.ts
git commit -m "feat: adiciona util de conversão de data para inputs"
```

---

### Task 4: Tipos da API e recarga na store (frontend)

`editarGasto` passa a devolver o mês/ano em que o lançamento ficou, em vez de um
booleano, para que a view saiba avisar quando o item saiu do mês em exibição.

Quando `dados.data` vem no payload, a store recarrega a lista em vez de aplicar
`Object.assign` local. Isso cobre dois casos de uma vez: o item some corretamente
quando muda de mês, e o `Object.assign` não grava `'2026-07-10'` cru no item —
string que a exibição passaria por `new Date()` e mostraria como 09/07.

**Files:**
- Modify: `gestor-financeiro-web/src/services/api.ts:20-32`
- Modify: `gestor-financeiro-web/src/stores/gastos.ts:157-170`
- Test: `gestor-financeiro-web/src/stores/gastos.test.ts`

**Interfaces:**
- Consumes: nada das tasks anteriores
- Produces:
  - `DadosNovoGasto` e `DadosEdicaoGasto` ganham `data?: string` (`AAAA-MM-DD`)
  - `editarGasto(id: number | string, dados: DadosEdicaoGasto): Promise<{ mes: number; ano: number } | null>` — `null` em falha; em sucesso, o mês/ano resultante do lançamento

- [ ] **Step 1: Escrever os testes que falham**

Em `gestor-financeiro-web/src/stores/gastos.test.ts`, substituir o bloco `vi.mock`
do topo (linhas 6-8) por:

```ts
vi.mock('../services/api', () => ({
  excluirGasto: vi.fn().mockResolvedValue({ sucesso: true }),
  editarGasto: vi.fn().mockResolvedValue({ sucesso: true }),
  buscarGastos: vi.fn().mockResolvedValue([]),
}))
```

E acrescentar ao final do arquivo:

```ts
describe('useGastosStore — editar com data', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // O describe acima liga fake timers e não os desliga; estes testes esperam
    // promises de verdade, então voltamos ao relógio real.
    vi.useRealTimers()
    vi.mocked(api.editarGasto).mockClear()
    vi.mocked(api.buscarGastos).mockClear()
  })

  it('com data alterada, recarrega a lista e devolve o mês de destino', async () => {
    const store = useGastosStore()
    store.setTelefone('5511999999999')

    const destino = await store.editarGasto(1, { descricao: 'mercado', data: '2026-08-03' })

    expect(api.editarGasto).toHaveBeenCalledWith(1, '5511999999999', {
      descricao: 'mercado',
      data: '2026-08-03',
    })
    expect(api.buscarGastos).toHaveBeenCalled()
    expect(destino).toEqual({ mes: 8, ano: 2026 })
  })

  it('sem data, atualiza o item local e não recarrega a lista', async () => {
    const store = useGastosStore()
    store.setTelefone('5511999999999')
    store.transacoes = [
      { id: 1, telefone: '5511999999999', descricao: 'mercado', categoria: 'Alimentação', valor: 50, data: '2026-07-01', tipo: 'despesa' },
    ]

    const destino = await store.editarGasto(1, { descricao: 'feira' })

    expect(api.buscarGastos).not.toHaveBeenCalled()
    expect(store.transacoes[0].descricao).toBe('feira')
    expect(destino).toEqual({ mes: store.filtroMes, ano: store.filtroAno })
  })

  it('devolve null quando a API falha', async () => {
    vi.mocked(api.editarGasto).mockRejectedValueOnce(new Error('rede'))
    const store = useGastosStore()
    store.setTelefone('5511999999999')

    const destino = await store.editarGasto(1, { data: '2026-08-03' })

    expect(destino).toBeNull()
    expect(store.erroAcao).toBeTruthy()
  })
})
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

```bash
cd gestor-financeiro-web && npx vitest run src/stores/gastos.test.ts
```

Esperado: FAIL — `editarGasto` devolve `true`/`false`, não `{ mes, ano }`, e
nunca chama `buscarGastos`.

- [ ] **Step 3: Acrescentar `data` aos tipos da API**

Em `gestor-financeiro-web/src/services/api.ts`, substituir as duas interfaces (linhas 20-32) por:

```ts
export interface DadosEdicaoGasto {
  descricao?: string
  categoria?: string
  valor?: number
  tipo?: 'despesa' | 'receita'
  /** Dia do lançamento em AAAA-MM-DD. Ausente = não altera a data. */
  data?: string
}

export interface DadosNovoGasto {
  descricao: string
  valor: number
  categoria?: string
  tipo?: 'despesa' | 'receita'
  /** Dia do lançamento em AAAA-MM-DD. Ausente = a API usa o dia atual. */
  data?: string
}
```

`criarGasto` e `editarGasto` em `api.ts` já fazem spread de `dados` no body, então
não precisam de alteração.

- [ ] **Step 4: Reescrever `editarGasto` na store**

Em `gestor-financeiro-web/src/stores/gastos.ts`, substituir a ação `editarGasto` (linhas 157-170) por:

```ts
  // Ação: Edita descrição/categoria/valor/data de um gasto.
  // Devolve o mês/ano em que o lançamento ficou, ou null se falhou.
  const editarGasto = async (
    id: number | string,
    dados: DadosEdicaoGasto,
  ): Promise<{ mes: number; ano: number } | null> => {
    erroAcao.value = null
    try {
      await api.editarGasto(id, telefone.value, dados)

      if (dados.data) {
        // Recarrega em vez de aplicar localmente: a data nova pode tirar o item
        // do mês em exibição, e o AAAA-MM-DD cru não serve para o campo `data`
        // do item, que a tela lê como timestamp.
        const [ano, mes] = dados.data.split('-').map(Number)
        await buscarGastos(filtroMes.value, filtroAno.value)
        return { mes, ano }
      }

      const item = transacoes.value.find((t) => t.id === id)
      if (item) Object.assign(item, dados)
      return { mes: filtroMes.value, ano: filtroAno.value }
    } catch (e) {
      console.error(e)
      erroAcao.value = 'Erro ao editar o gasto. Tente novamente.'
      return null
    }
  }
```

- [ ] **Step 5: Rodar os testes e confirmar que passam**

```bash
cd gestor-financeiro-web && npx vitest run src/stores/gastos.test.ts
```

Esperado: PASS, 6 testes (3 antigos + 3 novos).

- [ ] **Step 6: Commit**

O `type-check` roda na Task 5, junto com a view que consome o novo retorno —
até lá `LancamentosView.vue` ainda trata o retorno como booleano, o que é
válido em TypeScript (objeto e `null` funcionam num `if`) mas ainda não exibe
o aviso de mudança de mês.

```bash
cd gestor-financeiro-web
git add src/services/api.ts src/stores/gastos.ts src/stores/gastos.test.ts
git commit -m "feat: store recarrega lista quando a data do lançamento muda"
```

---

### Task 5: Campo de data na interface (frontend)

Input de data no formulário de novo lançamento e na edição inline. No cadastro
já vem preenchido com hoje: quem não mexe lança no dia, exatamente como antes.

**Files:**
- Modify: `gestor-financeiro-web/src/views/LancamentosView.vue`
- Modify: `gestor-financeiro-web/src/components/GastoItem.vue`

**Interfaces:**
- Consumes: `hojeISO()` e `paraInputDate()` de `../utils/dataInput` (Task 3); `editarGasto` devolvendo `{ mes, ano } | null` (Task 4); `DadosEdicaoGasto.data` e `DadosNovoGasto.data` (Task 4)
- Produces: nada para tasks seguintes

- [ ] **Step 1: Acrescentar o campo ao formulário de novo lançamento**

Em `gestor-financeiro-web/src/views/LancamentosView.vue`, no `<script setup>`:

Acrescentar aos imports:

```ts
import { hojeISO } from '../utils/dataInput'
```

Depois de `const novoTipo = ref<'despesa' | 'receita'>('despesa')`:

```ts
const novaData = ref(hojeISO())
```

Dentro de `abrirNovoGasto`, junto com os outros resets:

```ts
  novaData.value = hojeISO()
```

Em `confirmarNovoGasto`, acrescentar `data` ao objeto passado para `criarGasto`:

```ts
    data: novaData.value || undefined,
```

- [ ] **Step 2: Acrescentar o input ao template do formulário**

No mesmo arquivo, logo depois da `<div class="flex gap-2 sm:gap-3">` que contém
`CategoriaSelect` e o campo Valor (e antes da `<div class="flex justify-end gap-2">`),
inserir:

```html
          <label class="flex items-center gap-3 text-sm">
            <span class="text-slate-500 dark:text-slate-400 font-medium flex-shrink-0">Data</span>
            <input v-model="novaData" type="date" :max="hojeISO()"
              class="flex-1 min-w-0 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-emerald-400" />
          </label>
```

- [ ] **Step 3: Exibir o aviso quando o lançamento muda de mês**

No `<script setup>` de `LancamentosView.vue`, acrescentar acima de `salvarEdicao`:

```ts
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
```

E substituir `salvarEdicao` inteira por:

```ts
const salvarEdicao = async (id: number | string, dados: DadosEdicaoGasto) => {
  salvando.value = true
  const destino = await gastosStore.editarGasto(id, dados)
  salvando.value = false
  if (destino) {
    editandoId.value = null
    const mudouDeMes = destino.mes !== gastosStore.filtroMes || destino.ano !== gastosStore.filtroAno
    mostrarToast(
      mudouDeMes
        ? `Lançamento movido para ${MESES_CURTOS[destino.mes - 1]}/${destino.ano}`
        : 'Gasto atualizado ✓',
    )
  }
}
```

- [ ] **Step 4: Acrescentar o campo à edição inline**

Em `gestor-financeiro-web/src/components/GastoItem.vue`, no `<script setup>`:

Acrescentar aos imports:

```ts
import { hojeISO, paraInputDate } from '../utils/dataInput'
```

Depois de `const formValor = ref('')`:

```ts
const formData = ref('')
// Guarda a data com que o formulário abriu: só mandamos `data` para a API se
// ela realmente mudou, evitando uma recarga de lista desnecessária.
const dataOriginal = ref('')
```

Dentro do `watch` de `props.editando`, no bloco `if (ativo)`:

```ts
      dataOriginal.value = paraInputDate(props.gasto.data)
      formData.value = dataOriginal.value
```

Substituir a função `salvar` por:

```ts
const salvar = () => {
  const dataMudou = formData.value !== '' && formData.value !== dataOriginal.value
  emit('salvar', props.gasto.id, {
    descricao: formDescricao.value.trim(),
    categoria: formCategoria.value,
    valor: Number(formValor.value.replace(',', '.')),
    data: dataMudou ? formData.value : undefined,
  })
}
```

- [ ] **Step 5: Acrescentar o input ao template da edição inline**

No mesmo arquivo, logo depois da `<div class="flex gap-2 sm:gap-3">` que contém
`CategoriaSelect` e o campo Valor (e antes da `<div class="flex justify-end gap-2">`),
inserir:

```html
      <label class="flex items-center gap-3 text-sm">
        <span class="text-slate-500 dark:text-slate-400 font-medium flex-shrink-0">Data</span>
        <input v-model="formData" type="date" :max="hojeISO()"
          class="flex-1 min-w-0 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-400" />
      </label>
```

- [ ] **Step 6: Rodar type-check, lint e a suíte inteira**

```bash
cd gestor-financeiro-web && npm run type-check && npm run lint && npm test
```

Esperado: sem erro de tipo, sem erro de lint, todos os testes passando.

- [ ] **Step 7: Commit**

```bash
cd gestor-financeiro-web
git add src/views/LancamentosView.vue src/components/GastoItem.vue
git commit -m "feat: campo de data no cadastro e na edição de lançamento"
```

---

## Verificação manual final

O caminho feliz de INSERT/UPDATE contra MySQL de verdade não tem cobertura
automatizada (o projeto não sobe banco nos testes). Rodar a API e o front
localmente e conferir:

1. Novo lançamento sem tocar no campo Data → aparece com a data de hoje
2. Novo lançamento com data de um dia passado → aparece com aquela data, e a
   lista o ordena na posição certa
3. Tentar escolher data futura → o `:max` do input impede no navegador; forçar
   via `curl` devolve 400 com `'Data não pode ser futura.'`
4. Editar um lançamento mudando só a descrição → item atualiza sem piscar a lista
5. Editar um lançamento jogando-o para o mês seguinte → item some da lista e o
   toast diz `Lançamento movido para <mês>/<ano>`; navegar para aquele mês e
   confirmar que ele está lá
6. Enviar uma despesa pelo WhatsApp → continua caindo no dia atual
