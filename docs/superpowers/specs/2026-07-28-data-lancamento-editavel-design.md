# Data de lançamento editável

**Data:** 2026-07-28
**Repos afetados:** `gestor-financeiro-api`, `gestor-financeiro-web`

## Problema

A coluna `gastos.data` é preenchida exclusivamente por `CURRENT_TIMESTAMP`. Nem o
`POST /api/gastos` nem o `PATCH /api/gastos/:id` aceitam data. Quem esquece de
registrar uma despesa no dia não consegue lançá-la com a data correta, e um
lançamento com data errada não tem como ser corrigido pelo portal.

## Objetivo

Permitir escolher a data no cadastro e alterá-la depois, pelo portal. Sem
informar nada, o lançamento continua caindo no dia atual, como hoje.

## Escopo

Dentro:

- `POST /api/gastos` e `PATCH /api/gastos/:id` aceitam `data` opcional
- Formulário de novo lançamento (`LancamentosView.vue`)
- Edição inline (`GastoItem.vue`)

Fora:

- Bot WhatsApp (exigiria parser de data em linguagem natural — feature separada)
- Importação de extrato (o arquivo já traz data própria)

## Regra de negócio

O campo aceita apenas o dia (`YYYY-MM-DD`); a hora é derivada.

| Situação | Gravado em `gastos.data` |
| --- | --- |
| Campo não enviado (bot, importação, clientes antigos) | `CURRENT_TIMESTAMP` — SQL atual, intocado |
| Data igual a hoje | data + hora atual |
| Data no passado | data + `12:00:00` |
| Data no futuro | HTTP 400, nada gravado |
| Formato inválido ou dia inexistente (`2026-02-31`) | HTTP 400 |

Datas futuras são rejeitadas: um lançamento futuro infla o mês seguinte no
dashboard sem corresponder a dinheiro movimentado.

Meio-dia para datas passadas evita que diferença de fuso entre navegador e
servidor jogue o lançamento para o dia anterior. Para o dia atual usa-se a hora
corrente, preservando a ordenação `ORDER BY data DESC` entre lançamentos do
mesmo dia — com `00:00:00` fixo, um lançamento novo poderia não aparecer no topo
da lista.

No formulário de novo lançamento o campo já vem pré-preenchido com hoje. O
usuário que não mexe lança no dia, e o resultado é idêntico ao comportamento
atual. O backend continua aceitando a ausência do campo, então bot e importação
seguem inalterados.

## Backend — `gestor-financeiro-api`

### Novo módulo `lib/data-lancamento.js`

Módulo isolado, sem dependência de Fastify nem de banco, testável em unidade.

```js
// resolverDataLancamento(valor) ->
//   { ok: true,  timestamp: null }                    // não informado
//   { ok: true,  timestamp: '2026-07-10 12:00:00' }
//   { ok: false, erro: 'Data não pode ser futura.' }
```

Contrato:

- `undefined`, `null` e `''` são todos tratados como "não informado" e devolvem
  `{ ok: true, timestamp: null }`
- Valor não-string, ou string que não bate `/^\d{4}-\d{2}-\d{2}$/`, devolve
  `{ ok: false, erro: 'Data inválida. Use o formato AAAA-MM-DD.' }`
- Data sintaticamente válida mas inexistente no calendário (`2026-02-31`)
  devolve o mesmo erro de data inválida
- Data posterior ao dia corrente do servidor devolve
  `{ ok: false, erro: 'Data não pode ser futura.' }`
- Caso válido devolve a string `'YYYY-MM-DD HH:MM:SS'` conforme a tabela acima

O timestamp é sempre uma **string**, nunca um objeto `Date`. Um `Date` seria
serializado em UTC pelo mysql2 e divergiria do `CURRENT_TIMESTAMP`, que o MySQL
avalia na timezone da sessão. `plugins/db.js` não fixa `timezone` no pool, então
manter a string é o que preserva o comportamento atual.

"Futura" é comparado contra o dia corrente do servidor. Se o servidor rodar em
UTC e o usuário em BRT, o dia do servidor nunca fica atrás do dia do usuário,
logo não há rejeição indevida.

### `routes/api/gastos/index.js`

`POST /`:

- Lê `data` do body e chama `resolverDataLancamento`
- `ok: false` → `reply.status(400).send({ erro })`
- `timestamp === null` → INSERT atual, sem a coluna `data`
- `timestamp` preenchido → acrescenta `data` à lista de colunas do INSERT

`PATCH /:id`:

- Mesma validação
- `data` ausente ou vazia significa "campo não alterado", coerente com o
  tratamento dos demais campos
- `timestamp` preenchido → `campos.push('data = ?')`

O contrato de resposta de ambas as rotas permanece inalterado.

## Frontend — `gestor-financeiro-web`

### `services/api.ts`

`data?: string` (formato `YYYY-MM-DD`) em `DadosNovoGasto` e `DadosEdicaoGasto`.

### Novo `utils/dataInput.ts`

- `hojeISO(): string` — dia corrente local em `YYYY-MM-DD`, usado no `:max` dos
  inputs e como valor inicial do formulário
- `paraInputDate(valor: string | Date): string` — converte o `data` devolvido
  pela API (o mysql2 entrega um `Date`, serializado em JSON como ISO UTC) para
  `YYYY-MM-DD` na timezone local, mesma base que a exibição já usa

### `LancamentosView.vue`

`<input type="date" :max="hojeISO()">` ao lado do campo Valor.
`abrirNovoGasto()` reseta o campo para `hojeISO()`.

### `GastoItem.vue`

O mesmo input no bloco de edição. O `watch` de `editando` carrega
`paraInputDate(props.gasto.data)` junto com os demais campos do formulário.

### `stores/gastos.ts` — `editarGasto`

Quando `dados.data` está presente no payload, a store recarrega a lista
(`buscarGastos(filtroMes, filtroAno)`) em vez de aplicar `Object.assign` no item
local.

Isso resolve dois problemas de uma vez:

1. Se a nova data cair em outro mês, o item sai corretamente da lista filtrada
2. Evita que o `Object.assign` grave `'2026-07-10'` cru no item — string que
   `new Date()` interpreta como meia-noite UTC e que a tela exibiria como 09/07

`editarGasto` passa a devolver o mês/ano resultante para a view. Quando difere
do filtro em exibição, o toast vira `Lançamento movido para ago/2026`; caso
contrário, segue `Gasto atualizado ✓`, para que o desaparecimento do item nunca
pareça uma exclusão acidental.

**Alternativa considerada e descartada:** fazer o PATCH devolver o registro
atualizado, como o POST já faz, e a store aplicar a resposta. Elimina o GET
extra e é mais limpo, mas muda o contrato da rota e quebra testes existentes.
Para sistema em produção, recarregar é o caminho de menor risco.

## Testes

`gestor-financeiro-api/test/lib/data-lancamento.test.js` (novo, unitário puro):

- não informado (`undefined`, `null`, `''`) → `timestamp: null`
- hoje → data + hora atual
- passado → data + `12:00:00`
- futuro → erro
- formato inválido → erro
- dia inexistente (`2026-02-31`) → erro

`gestor-financeiro-api/test/routes/api/gastos.test.js`:

- `POST` com data futura → 400
- `POST` com data malformada → 400
- `PATCH` com data futura → 400
- `PATCH` com data malformada → 400

Todos retornam antes de tocar o banco, então rodam no setup atual, que não sobe
MySQL.

`gestor-financeiro-web/src/stores/gastos.test.ts`:

- `editarGasto` com `data` dispara recarga e devolve o mês resultante
- `editarGasto` sem `data` mantém o `Object.assign` local

Fora de cobertura automatizada: o caminho feliz de INSERT/UPDATE com data
depende de banco, e o projeto não tem esse setup. Verificação manual.
