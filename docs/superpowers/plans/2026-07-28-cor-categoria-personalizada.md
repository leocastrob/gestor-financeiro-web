# Cor Escolhível para Categorias Personalizadas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir escolher a cor de cada categoria personalizada numa paleta de 24, com as cores já em uso sinalizadas no seletor.

**Architecture:** Uma coluna `cor CHAR(7) NULL` guarda a escolha; `NULL` mantém o hash atual, então nada muda para as categorias existentes. A paleta vive num arquivo próprio no frontend, separada da lógica de resolução de cor. O seletor é um componente burro que recebe tudo por prop.

**Tech Stack:** Backend Fastify + mysql2 + `node:test`. Frontend Vue 3 (`<script setup>`) + Pinia + Vitest + Tailwind.

**Spec:** `gestor-financeiro-web/docs/superpowers/specs/2026-07-28-cor-categoria-personalizada-design.md`

## Global Constraints

- Dois repositórios git independentes: `gestor-financeiro-api/` e `gestor-financeiro-web/`. Cada task commita no repo que ela toca.
- **O `ALTER TABLE` é passo manual no servidor, fora do `deploy.sh`** (`PROJETO.md:154`), e precisa rodar **antes** do deploy do código. Sem a coluna, o `POST` de categoria falha.
- `cor` ausente, `null` ou `''` grava `NULL` no banco, que significa "cor automática" (hash do nome).
- Validação de cor no backend é só de formato: `/^#[0-9a-fA-F]{6}$/`. A paleta vive no frontend.
- Mensagem de erro exata: `'Cor inválida. Use o formato #RRGGBB.'`
- Backend: 4 espaços, `'use strict'`, `module.exports`. Frontend: 2 espaços, sem ponto e vírgula, TypeScript.
- Commits em português com prefixo Conventional Commits. **Sem** linha `Co-Authored-By`.

## Paleta (valor exato, usado na Task 3)

```
#e34948  #e66767  #c2410c  #d95926  #a16207  #c98500
#4d7c0f  #65a30d  #008300  #2f9e44  #0f8f63  #199e70
#0d9488  #1a7fa8  #0891b2  #3987e5  #2a78d6  #6d7ff0
#9085e9  #a855f7  #c026d3  #c2185b  #d55181  #db2777
```

---

### Task 1: Coluna `cor` no schema

Só documentação do schema — o `ALTER` em produção é manual e vem no fim do plano.
`schema.sql` neste projeto é um registro histórico do schema real, não um script
executado pelo deploy: cada feature acrescenta seu bloco ao final.

**Files:**
- Modify: `gestor-financeiro-api/schema.sql` (acrescentar ao final)

**Interfaces:**
- Consumes: nada
- Produces: coluna `categorias_personalizadas.cor CHAR(7) NULL`

- [ ] **Step 1: Acrescentar o bloco ao final de `schema.sql`**

```sql

-- ===== Cor escolhível de categoria personalizada (2026-07-28) =====
-- NULL = cor automática (hash do nome, ver theme/categorias.ts no frontend).
-- Aplicado em produção manualmente, fora do deploy.sh:
--   mysql -u root financas -e "ALTER TABLE categorias_personalizadas ADD COLUMN cor CHAR(7) NULL AFTER icone;"
ALTER TABLE categorias_personalizadas ADD COLUMN cor CHAR(7) NULL AFTER icone;
```

- [ ] **Step 2: Commit**

```bash
cd gestor-financeiro-api
git add schema.sql
git commit -m "docs: registra coluna cor em categorias_personalizadas"
```

---

### Task 2: Rotas aceitam `cor` (backend)

`POST /api/categorias` e `PATCH /api/categorias/:id` passam a ler `cor`.

O `PATCH` precisa distinguir três casos: campo ausente (não mexe), `null`
explícito (volta para automática) e hex (grava). `undefined` e `null` não são
diferenciáveis depois da desestruturação, então a checagem usa
`hasOwnProperty` no body.

**Files:**
- Modify: `gestor-financeiro-api/routes/api/categorias/index.js`
- Test: `gestor-financeiro-api/test/routes/api/categorias.test.js` (acrescentar ao final)

**Interfaces:**
- Consumes: nada
- Produces: `POST /api/categorias` e `PATCH /api/categorias/:id` aceitam `cor` (`string | null`)

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao final de `gestor-financeiro-api/test/routes/api/categorias.test.js`:

```js
test('POST /api/categorias rejeita cor com formato inválido', async (t) => {
    const app = await build(t)

    const res = await app.inject({
        method: 'POST',
        url: '/api/categorias',
        payload: { telefone: '5511999999999', nome: 'Faculdade', cor: 'vermelho' }
    })
    assert.strictEqual(res.statusCode, 400)
    assert.strictEqual(res.json().erro, 'Cor inválida. Use o formato #RRGGBB.')
})

test('POST /api/categorias grava a cor informada', async (t) => {
    const app = await build(t)

    app.db.query = async (sql, params) => {
        if (/INSERT/.test(sql)) {
            assert.deepStrictEqual(params, ['5511999999999', 'Faculdade', '🏷️', 'despesa', '#db2777'])
            return [{ insertId: 5 }]
        }
        return [[{ id: 5, nome: 'Faculdade', cor: '#db2777' }]]
    }

    const res = await app.inject({
        method: 'POST',
        url: '/api/categorias',
        payload: { telefone: '5511999999999', nome: 'Faculdade', cor: '#db2777' }
    })
    assert.strictEqual(res.statusCode, 201)
})

test('POST /api/categorias sem cor grava NULL', async (t) => {
    const app = await build(t)

    app.db.query = async (sql, params) => {
        if (/INSERT/.test(sql)) {
            assert.deepStrictEqual(params, ['5511999999999', 'Faculdade', '🏷️', 'despesa', null])
            return [{ insertId: 6 }]
        }
        return [[{ id: 6, nome: 'Faculdade', cor: null }]]
    }

    const res = await app.inject({
        method: 'POST',
        url: '/api/categorias',
        payload: { telefone: '5511999999999', nome: 'Faculdade' }
    })
    assert.strictEqual(res.statusCode, 201)
})

test('PATCH /api/categorias/:id rejeita cor com formato inválido', async (t) => {
    const app = await build(t)

    app.db.query = async () => [[{ id: 1 }]]

    const res = await app.inject({
        method: 'PATCH',
        url: '/api/categorias/1',
        payload: { telefone: '5511999999999', cor: '#ZZZ' }
    })
    assert.strictEqual(res.statusCode, 400)
    assert.strictEqual(res.json().erro, 'Cor inválida. Use o formato #RRGGBB.')
})

test('PATCH /api/categorias/:id atualiza a cor', async (t) => {
    const app = await build(t)

    let chamada = 0
    app.db.query = async (sql, params) => {
        chamada++
        if (chamada === 1) return [[{ id: 1 }]]
        if (/UPDATE/.test(sql)) {
            assert.match(sql, /SET cor = \? WHERE id = \? AND telefone = \?/)
            assert.deepStrictEqual(params, ['#0d9488', '1', '5511999999999'])
            return [{ affectedRows: 1 }]
        }
        return [[{ id: 1, cor: '#0d9488' }]]
    }

    const res = await app.inject({
        method: 'PATCH',
        url: '/api/categorias/1',
        payload: { telefone: '5511999999999', cor: '#0d9488' }
    })
    assert.strictEqual(res.statusCode, 200)
    assert.strictEqual(res.json().cor, '#0d9488')
})

test('PATCH /api/categorias/:id com cor null volta para automática', async (t) => {
    const app = await build(t)

    let chamada = 0
    app.db.query = async (sql, params) => {
        chamada++
        if (chamada === 1) return [[{ id: 1 }]]
        if (/UPDATE/.test(sql)) {
            assert.deepStrictEqual(params, [null, '1', '5511999999999'])
            return [{ affectedRows: 1 }]
        }
        return [[{ id: 1, cor: null }]]
    }

    const res = await app.inject({
        method: 'PATCH',
        url: '/api/categorias/1',
        payload: { telefone: '5511999999999', cor: null }
    })
    assert.strictEqual(res.statusCode, 200)
})
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

```bash
cd gestor-financeiro-api && NODE_ENV=test node --test test/routes/api/categorias.test.js
```

Esperado: FAIL. As rotas ignoram `cor` hoje, então os INSERTs têm 4 parâmetros
em vez de 5, e o PATCH só-cor responde 400 `'Nenhum campo para atualizar.'`

- [ ] **Step 3: Acrescentar o validador de cor no topo do módulo**

Em `gestor-financeiro-api/routes/api/categorias/index.js`, logo abaixo do
`'use strict'` e antes do `module.exports`:

```js
// Só o formato é validado aqui; a paleta de 24 cores vive no frontend, que é
// quem restringe a escolha. Uma cor fora da paleta ainda seria renderizável.
const FORMATO_COR = /^#[0-9a-fA-F]{6}$/

// Devolve { ok: true, cor } ou { ok: false }. Ausente/null/'' viram NULL.
function resolverCor(valor) {
    if (valor === undefined || valor === null || valor === '') return { ok: true, cor: null }
    if (typeof valor !== 'string' || !FORMATO_COR.test(valor)) return { ok: false }
    return { ok: true, cor: valor }
}
```

- [ ] **Step 4: Aceitar `cor` no POST**

Trocar a desestruturação do body por:

```js
        const { telefone, nome, icone, tipo, cor } = request.body || {}
```

Depois da linha que calcula `tipoFinal`, antes do `try`:

```js
        const corResolvida = resolverCor(cor)
        if (!corResolvida.ok) {
            return reply.status(400).send({ erro: 'Cor inválida. Use o formato #RRGGBB.' })
        }
```

E trocar o INSERT por:

```js
            const [resultado] = await fastify.db.query(
                'INSERT INTO categorias_personalizadas (telefone, nome, icone, tipo, cor) VALUES (?, ?, ?, ?, ?)',
                [telefone, nome.trim(), iconeFinal, tipoFinal, corResolvida.cor]
            )
```

- [ ] **Step 5: Aceitar `cor` no PATCH**

Trocar a desestruturação do body por:

```js
        const { telefone, nome, icone, cor } = request.body || {}
```

Depois da validação de `nome`, antes do `try`:

```js
        // hasOwnProperty distingue "campo ausente" (não mexe) de "cor: null"
        // (volta para automática) — depois da desestruturação ambos são undefined.
        const corInformada = Object.prototype.hasOwnProperty.call(request.body || {}, 'cor')
        const corResolvida = resolverCor(cor)
        if (corInformada && !corResolvida.ok) {
            return reply.status(400).send({ erro: 'Cor inválida. Use o formato #RRGGBB.' })
        }
```

E na montagem dos campos, depois da linha do `icone`:

```js
            if (corInformada) { campos.push('cor = ?'); valores.push(corResolvida.cor) }
```

- [ ] **Step 6: Rodar os testes e confirmar que passam**

```bash
cd gestor-financeiro-api && NODE_ENV=test node --test test/routes/api/categorias.test.js
```

Esperado: PASS.

- [ ] **Step 7: Rodar a suíte inteira**

```bash
cd gestor-financeiro-api && npm test
```

Esperado: nenhuma regressão.

- [ ] **Step 8: Commit**

```bash
cd gestor-financeiro-api
git add routes/api/categorias/index.js test/routes/api/categorias.test.js
git commit -m "feat: rotas de categorias aceitam cor personalizada"
```

---

### Task 3: Paleta e resolução de cor (frontend)

A paleta num arquivo próprio, para que dado de UI não se misture com a lógica
de resolução. `corDaCategoria` passa a preferir a cor gravada.

**Files:**
- Create: `gestor-financeiro-web/src/theme/paletaCategorias.ts`
- Create: `gestor-financeiro-web/src/theme/paletaCategorias.test.ts`
- Create: `gestor-financeiro-web/src/theme/categorias.test.ts`
- Modify: `gestor-financeiro-web/src/theme/categorias.ts:38-49`
- Modify: `gestor-financeiro-web/src/services/api.ts:310-328`

**Interfaces:**
- Consumes: nada
- Produces:
  - `PALETA_CORES: readonly string[]` em `../theme/paletaCategorias` — 24 hex
  - `CategoriaPersonalizada.cor: string | null`
  - `DadosNovaCategoria.cor?: string | null` e `DadosEdicaoCategoria.cor?: string | null`
  - `corDaCategoria(categoria: string): string` — assinatura inalterada, passa a preferir a cor gravada

- [ ] **Step 1: Escrever os testes que falham**

Criar `gestor-financeiro-web/src/theme/paletaCategorias.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { PALETA_CORES } from './paletaCategorias'

describe('PALETA_CORES', () => {
  it('tem 24 cores', () => {
    expect(PALETA_CORES).toHaveLength(24)
  })

  it('todas em #rrggbb minúsculo', () => {
    for (const cor of PALETA_CORES) {
      expect(cor).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('não repete nenhuma cor', () => {
    expect(new Set(PALETA_CORES).size).toBe(PALETA_CORES.length)
  })
})
```

Criar `gestor-financeiro-web/src/theme/categorias.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { corDaCategoria } from './categorias'
import { useCategoriasStore } from '../stores/categorias'
import type { CategoriaPersonalizada } from '../services/api'

function categoria(nome: string, cor: string | null): CategoriaPersonalizada {
  return { id: 1, telefone: '5511999999999', nome, icone: '🏷️', cor, tipo: 'despesa', criado_em: '' }
}

describe('corDaCategoria', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('devolve a cor fixa das categorias do sistema', () => {
    expect(corDaCategoria('Alimentação')).toBe('#199e70')
  })

  it('devolve a cor gravada de uma categoria personalizada', () => {
    const store = useCategoriasStore()
    store.categorias = [categoria('Faculdade', '#db2777')]

    expect(corDaCategoria('Faculdade')).toBe('#db2777')
  })

  it('cai na cor automática quando a personalizada tem cor nula', () => {
    const store = useCategoriasStore()
    store.categorias = [categoria('Faculdade', null)]

    // Hash do nome — estável, não depende de ordem na lista
    expect(corDaCategoria('Faculdade')).toMatch(/^#[0-9a-f]{6}$/)
    expect(corDaCategoria('Faculdade')).not.toBe('#64748b')
  })

  it('devolve a cor padrão para categoria desconhecida', () => {
    expect(corDaCategoria('Inexistente')).toBe('#64748b')
  })
})
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

```bash
cd gestor-financeiro-web && npx vitest run src/theme/
```

Esperado: FAIL — `Cannot find module './paletaCategorias'`, e o teste da cor
gravada falha porque `CategoriaPersonalizada` ainda não tem `cor`.

- [ ] **Step 3: Criar o arquivo da paleta**

Criar `gestor-financeiro-web/src/theme/paletaCategorias.ts`:

```ts
// Paleta escolhível para categorias personalizadas.
//
// As 24 cores foram validadas com o validador da skill `dataviz` em
// --mode light e --mode dark: todas passam banda de luminância, piso de croma
// e contraste nos dois temas. Dois avisos marginais de contraste (#c98500 em
// 2,99 e #c2185b em 2,97, limiar 3,0) são aceitos porque a cor nunca aparece
// sozinha na interface — sempre ao lado do nome e do ícone da categoria.
//
// Nenhuma paleta desse tamanho é mutuamente distinguível: acima de ~3 cores
// coexistindo, a separação depende do rótulo, não do tom. Por isso o seletor
// marca as cores já em uso, em vez de fingir que 24 tons se distinguem.
//
// Ordem por matiz, exibida em grade de 6 colunas por 4 linhas.
export const PALETA_CORES = [
  '#e34948', '#e66767', '#c2410c', '#d95926', '#a16207', '#c98500',
  '#4d7c0f', '#65a30d', '#008300', '#2f9e44', '#0f8f63', '#199e70',
  '#0d9488', '#1a7fa8', '#0891b2', '#3987e5', '#2a78d6', '#6d7ff0',
  '#9085e9', '#a855f7', '#c026d3', '#c2185b', '#d55181', '#db2777',
] as const
```

- [ ] **Step 4: Acrescentar `cor` aos tipos da API**

Em `gestor-financeiro-web/src/services/api.ts`, substituir as três interfaces
de categoria por:

```ts
export interface CategoriaPersonalizada {
  id: number
  telefone: string
  nome: string
  icone: string
  /** Cor escolhida em #rrggbb, ou null para cor automática (hash do nome). */
  cor: string | null
  tipo: 'despesa' | 'receita'
  criado_em: string
}

export interface DadosNovaCategoria {
  nome: string
  icone?: string
  tipo?: 'despesa' | 'receita'
  cor?: string | null
}

export interface DadosEdicaoCategoria {
  nome?: string
  icone?: string
  cor?: string | null
}
```

- [ ] **Step 5: Fazer `corDaCategoria` preferir a cor gravada**

Em `gestor-financeiro-web/src/theme/categorias.ts`, substituir `corDaCategoria` por:

```ts
export function corDaCategoria(categoria: string): string {
  if (CATEGORIAS_INFO[categoria]) return CATEGORIAS_INFO[categoria].cor

  try {
    const store = useCategoriasStore()
    const custom = store.categorias.find(c => c.nome === categoria)
    // Cor escolhida pelo usuário vence; sem escolha, cai no hash do nome.
    if (custom) return custom.cor || corPersonalizada(categoria)
  } catch {
    // Caso seja chamado fora de contexto Vue/Pinia ativo
  }

  return COR_PADRAO
}
```

- [ ] **Step 6: Rodar os testes e confirmar que passam**

```bash
cd gestor-financeiro-web && npx vitest run src/theme/
```

Esperado: PASS, 7 testes.

- [ ] **Step 7: Commit**

```bash
cd gestor-financeiro-web
git add src/theme/paletaCategorias.ts src/theme/paletaCategorias.test.ts src/theme/categorias.ts src/theme/categorias.test.ts src/services/api.ts
git commit -m "feat: adiciona paleta de cores e resolução por cor gravada"
```

---

### Task 4: Componente seletor de cor (frontend)

Componente burro: recebe a lista de cores ocupadas por prop e não lê store.

**Files:**
- Create: `gestor-financeiro-web/src/components/CorSelect.vue`

**Interfaces:**
- Consumes: `PALETA_CORES` de `../theme/paletaCategorias` (Task 3)
- Produces: componente `CorSelect` com
  - `v-model` de tipo `string | null`
  - prop `emUso: { cor: string; nome: string; icone: string }[]` (padrão `[]`)

- [ ] **Step 1: Criar o componente**

Criar `gestor-financeiro-web/src/components/CorSelect.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { PALETA_CORES } from '../theme/paletaCategorias'

export interface CorEmUso {
  cor: string
  nome: string
  icone: string
}

const props = withDefaults(
  defineProps<{
    emUso?: CorEmUso[]
  }>(),
  { emUso: () => [] },
)

// null = cor automática (hash do nome)
const modelo = defineModel<string | null>({ default: null })

// Índice por cor para não varrer a lista a cada swatch renderizado
const ocupadas = computed(() => {
  const mapa = new Map<string, CorEmUso>()
  for (const item of props.emUso) mapa.set(item.cor, item)
  return mapa
})
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Cor</span>
      <button type="button" @click="modelo = null"
        class="text-xs font-semibold px-2 py-1 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
        :class="modelo === null
          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
          : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'">
        Automática
      </button>
    </div>

    <div class="grid grid-cols-6 gap-2">
      <button v-for="cor in PALETA_CORES" :key="cor" type="button"
        @click="modelo = cor"
        :title="ocupadas.get(cor) ? `Já usada por ${ocupadas.get(cor)!.nome}` : cor"
        :aria-label="ocupadas.get(cor) ? `Cor ${cor}, já usada por ${ocupadas.get(cor)!.nome}` : `Cor ${cor}`"
        :aria-pressed="modelo === cor"
        class="relative aspect-square rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-slate-400 dark:focus-visible:ring-offset-slate-900"
        :class="[
          modelo === cor ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white dark:ring-offset-slate-900 scale-105' : 'hover:scale-105',
          ocupadas.get(cor) && modelo !== cor ? 'opacity-40' : '',
        ]"
        :style="{ backgroundColor: cor }">
        <span v-if="ocupadas.get(cor)" class="absolute inset-0 flex items-center justify-center text-[10px] leading-none">
          {{ ocupadas.get(cor)!.icone }}
        </span>
      </button>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Verificar que o projeto compila com o componente novo**

```bash
cd gestor-financeiro-web && npm run type-check
```

Esperado: sem erros. (`defineModel` exige Vue 3.4+ — confirmar em
`package.json` antes; se a versão for menor, trocar por
`defineProps<{ modelValue: string | null }>()` mais
`defineEmits<{ 'update:modelValue': [string | null] }>()`.)

- [ ] **Step 3: Commit**

```bash
cd gestor-financeiro-web
git add src/components/CorSelect.vue
git commit -m "feat: adiciona seletor de cor com paleta e marcação de cores em uso"
```

---

### Task 5: Seletor nas telas de criar e editar (frontend)

**Files:**
- Modify: `gestor-financeiro-web/src/views/CategoriasView.vue`
- Modify: `gestor-financeiro-web/src/components/CategoriaPersonalizadaItem.vue`

**Interfaces:**
- Consumes: `CorSelect` e `CorEmUso` de `../components/CorSelect.vue` (Task 4); `DadosNovaCategoria.cor` e `DadosEdicaoCategoria.cor` (Task 3)
- Produces: nada para tasks seguintes

- [ ] **Step 1: Acrescentar o seletor ao formulário de nova categoria**

Em `gestor-financeiro-web/src/views/CategoriasView.vue`, no `<script setup>`,
acrescentar aos imports:

```ts
import CorSelect, { type CorEmUso } from '../components/CorSelect.vue'
```

Depois de `const novoIcone = ref('🏷️')`:

```ts
const novaCor = ref<string | null>(null)
```

Dentro de `abrirNovaCategoria`, junto com os outros resets:

```ts
  novaCor.value = null
```

Em `confirmarNovaCategoria`, acrescentar ao objeto passado para `adicionarCategoria`:

```ts
    cor: novaCor.value,
```

Acrescentar o computed que monta a lista de cores ocupadas, antes de
`iniciarEdicao`. `idIgnorado` existe para que a categoria em edição não veja a
própria cor como ocupada por ela mesma:

```ts
const coresEmUso = (idIgnorado?: number): CorEmUso[] =>
  categoriasStore.categorias
    .filter((c) => c.cor !== null && c.id !== idIgnorado)
    .map((c) => ({ cor: c.cor!, nome: c.nome, icone: c.icone }))
```

- [ ] **Step 2: Acrescentar o seletor ao template do formulário**

No mesmo arquivo, logo depois da `<div class="flex gap-2 sm:gap-3">` que contém
os inputs de ícone e nome, e antes da `<div class="flex justify-end gap-2">`:

```html
        <CorSelect v-model="novaCor" :em-uso="coresEmUso()" />
```

- [ ] **Step 3: Passar a lista de cores ocupadas para o item**

No mesmo arquivo, no `<CategoriaPersonalizadaItem>`, acrescentar a prop:

```html
          :cores-em-uso="coresEmUso(categoria.id)"
```

- [ ] **Step 4: Acrescentar o seletor à edição inline**

Em `gestor-financeiro-web/src/components/CategoriaPersonalizadaItem.vue`, no
`<script setup>`, acrescentar aos imports:

```ts
import CorSelect, { type CorEmUso } from './CorSelect.vue'
```

Substituir o bloco `defineProps` por:

```ts
const props = withDefaults(
  defineProps<{
    categoria: CategoriaPersonalizada
    editando: boolean
    salvando: boolean
    coresEmUso?: CorEmUso[]
  }>(),
  { coresEmUso: () => [] },
)
```

Depois de `const formIcone = ref('')`:

```ts
const formCor = ref<string | null>(null)
```

Dentro de `iniciarEdicao`, junto com os outros campos:

```ts
  formCor.value = props.categoria.cor
```

E em `salvar`, acrescentar ao objeto emitido:

```ts
    cor: formCor.value,
```

- [ ] **Step 5: Acrescentar o seletor ao template da edição inline**

No mesmo arquivo, trocar o bloco de edição inteiro (a `<div v-if="editando">`)
por uma versão empilhada, porque o seletor não cabe na linha horizontal atual:

```html
    <!-- Modo edição -->
    <div v-if="editando" class="space-y-3">
      <div class="flex gap-2 sm:gap-3 items-start">
        <input v-model="formIcone" type="text" maxlength="10" placeholder="🏷️"
          class="w-16 flex-shrink-0 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-lg text-center rounded-xl px-2 py-2 outline-none focus:border-emerald-400" />
        <input v-model="formNome" type="text" maxlength="50" placeholder="Nome da categoria"
          class="flex-1 min-w-0 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-400" />
      </div>
      <CorSelect v-model="formCor" :em-uso="coresEmUso" />
      <div class="flex justify-end gap-2">
        <button @click="emit('cancelar-edicao')" :disabled="salvando"
          class="px-3 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 rounded-lg">
          Cancelar
        </button>
        <button @click="salvar" :disabled="salvando || !formNome.trim()"
          class="px-3 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60">
          {{ salvando ? 'Salvando...' : 'Salvar' }}
        </button>
      </div>
    </div>
```

Nota: o restante do componente usa `props.categoria` via desestruturação
implícita do `defineProps` antigo. Com `withDefaults` o objeto passa a se
chamar `props`, mas o template continua acessando `categoria`, `editando`,
`salvando` e `coresEmUso` diretamente — Vue expõe todas as props no template
independentemente de como foram declaradas. Só o `<script>` precisa usar
`props.`, o que já fazia.

- [ ] **Step 6: Rodar type-check, lint e a suíte inteira**

```bash
cd gestor-financeiro-web && npm run type-check && npm run lint && npm test
```

Esperado: sem erro de tipo, sem erro de lint, todos os testes passando.

- [ ] **Step 7: Commit**

```bash
cd gestor-financeiro-web
git add src/views/CategoriasView.vue src/components/CategoriaPersonalizadaItem.vue
git commit -m "feat: escolha de cor no cadastro e na edição de categoria"
```

---

## Deploy

**O `ALTER TABLE` precisa rodar ANTES do deploy do código.** Sem a coluna, o
`POST /api/categorias` falha com erro de coluna inexistente.

- [ ] **Passo 1: Aplicar o ALTER no MySQL do servidor**

```bash
ssh -p 8022 192.168.1.189 'mysql -u root financas -e "ALTER TABLE categorias_personalizadas ADD COLUMN cor CHAR(7) NULL AFTER icone;"'
```

Confirmar que a coluna existe:

```bash
ssh -p 8022 192.168.1.189 'mysql -u root financas -e "SHOW COLUMNS FROM categorias_personalizadas LIKE \"cor\";"'
```

- [ ] **Passo 2: Rodar o deploy**

```bash
cd gestor-financeiro-api && ./deploy.sh
```

- [ ] **Passo 3: Verificação manual**

1. Criar categoria escolhendo uma cor → a bolinha na lista mostra essa cor
2. Criar segunda categoria → a cor da primeira aparece esmaecida com o ícone dela
3. Editar uma categoria e clicar "Automática" → volta para a cor de hash
4. Abrir o gráfico de categorias e conferir que as cores escolhidas aparecem lá
5. Alternar tema claro/escuro e conferir que as cores continuam legíveis
