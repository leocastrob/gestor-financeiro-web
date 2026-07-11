# Reforma Frontend Fintech — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar do zero a identidade visual do front-end (`gestor-financeiro-web`) para um patamar "fintech premium" (tabs Dashboard/Lançamentos, tokens visuais novos) e entregar 4 funcionalidades novas aprovadas em brainstorming: metas por categoria, histórico multi-mês, exportar CSV/PDF, desfazer exclusão — com uma extensão mínima em `gestor-financeiro-api` para sustentar metas.

**Architecture:** Vue 3 (Composition API, `<script setup>`) + Vite + Pinia + Tailwind, mantidos. Introduz um layout compartilhado (`AppShell.vue`) para as duas abas autenticadas, decompõe a antiga `GastosView.vue` em `DashboardView.vue` + `LancamentosView.vue`, extrai 3 componentes hoje inline (gráfico de categorias, seletor de categoria, item de lançamento) e adiciona 5 componentes/serviços novos. Back-end ganha 1 tabela e 1 conjunto de rotas seguindo exatamente o padrão já usado em `routes/api/gastos`.

**Tech Stack:** Vue 3.5 · Vite 8 · Pinia 3 · Tailwind 3 · Chart.js 4 / vue-chartjs 5 · Fastify 5 · MariaDB (via `mysql2`) · **Novo:** Vitest (testes do front-end), `@vueuse/motion` (motion), `reka-ui` (Tabs/Select/DropdownMenu headless), `jspdf` + `jspdf-autotable` (export PDF), `@fontsource-variable/geist` + `@fontsource-variable/geist-mono` (tipografia self-hosted).

## Global Constraints

- Spec de origem: `docs/superpowers/specs/2026-07-11-reforma-frontend-fintech-design.md` (aprovada). Toda tarefa abaixo implementa uma seção dela.
- O build do front-end **precisa continuar rodando na máquina de desenvolvimento**, nunca no servidor (Termux/Bionic quebra binários nativos do Vite como `esbuild`/`rollup`). Nenhuma dependência nova introduzida aqui usa binário nativo — todas são puro JavaScript/CSS.
- Cor primária (verde-esmeralda) e cores por categoria (`theme/categorias.ts`) **não mudam** — já validadas contra daltonismo (CVD) pela skill de dataviz.
- Convenção do projeto: nomes de variáveis, funções e mensagens de erro em português — mantida em todo código novo.
- Não existe ferramenta de migration no projeto (`gestor-financeiro-api`); qualquer mudança de schema é aplicada manualmente via SSH no MariaDB de produção, como já é feito hoje (ver `MELHORIAS.md`, item 2.1.1).
- Dependências novas do front-end estão fechadas nesta lista — não adicionar outras sem atualizar a spec: `@vueuse/motion`, `reka-ui`, `jspdf`, `jspdf-autotable`, `@fontsource-variable/geist`, `@fontsource-variable/geist-mono`, `vitest` (dev).
- `npm test` precisa continuar 100% verde em `gestor-financeiro-api` e `gestor-financeiro-web` a qualquer momento em que uma tarefa for considerada concluída.
- O front-end hoje **não tem testes de componente Vue** (só validação visual manual via Playwright ad-hoc, nunca commitado como dependência do projeto). Este plano mantém essa convenção: testes automatizados cobrem lógica pura (utils, services, stores), não os templates `.vue`; a validação visual dos componentes é feita manualmente na Tarefa 14.

---

## Mapa de arquivos

**Novos (`gestor-financeiro-web`):**
- `src/constants/meses.ts` — nomes dos meses em português, única fonte usada por `AppShell.vue`, `DashboardView.vue` e `services/exportar.ts`
- `src/layouts/AppShell.vue` — header + tabs + seletor de mês compartilhados entre Dashboard e Lançamentos
- `src/views/DashboardView.vue`, `src/views/LancamentosView.vue` — substituem `GastosView.vue`
- `src/components/GraficoCategorias.vue` — extraído do doughnut hoje inline
- `src/components/CategoriaSelect.vue` — substitui os 2 `<select>` nativos duplicados
- `src/components/GastoItem.vue` — extraído do item de lista hoje inline
- `src/components/GraficoHistorico.vue` — gráfico de linha, últimos 6 meses
- `src/components/MetaProgressBar.vue` — barra de progresso de meta por categoria
- `src/components/ExportarMenu.vue` — menu CSV/PDF
- `src/services/exportar.ts` (+ `exportar.test.ts`) — geração de CSV/PDF, lógica pura separada de efeitos de DOM
- `src/stores/metas.ts` — estado das metas por categoria
- `src/utils/formatarMoeda.test.ts` — primeiro teste do projeto, valida a infraestrutura Vitest

**Modificados:** `package.json`, `vite.config.ts`, `tailwind.config.js`, `src/style.css`, `src/main.ts`, `src/App.vue`, `src/router/index.ts`, `src/stores/gastos.ts`, `src/services/api.ts`, `src/views/LoginView.vue`

**Removidos:** `src/views/GastosView.vue`

**Novos (`gestor-financeiro-api`):** `routes/api/metas/index.js`, `test/routes/api/metas.test.js`; **modificados:** `schema.sql`

---

### Task 1: Instalar dependências novas e configurar Vitest

**Files:**
- Modify: `gestor-financeiro-web/package.json`
- Modify: `gestor-financeiro-web/vite.config.ts`
- Create: `gestor-financeiro-web/src/utils/formatarMoeda.test.ts`

**Interfaces:**
- Consumes: `formatarMoeda` de `src/utils/formatarMoeda.ts` (já existe, assinatura `(valor: number | string) => string`)
- Produces: script `npm test` funcional em `gestor-financeiro-web`, usado por todas as tarefas seguintes que adicionam testes

- [ ] **Step 1: Instalar as dependências de produção**

```bash
cd gestor-financeiro-web
npm install @vueuse/motion reka-ui jspdf jspdf-autotable @fontsource-variable/geist @fontsource-variable/geist-mono
```

- [ ] **Step 2: Instalar o Vitest como dependência de desenvolvimento**

```bash
npm install -D vitest
```

- [ ] **Step 3: Adicionar o script de teste ao `package.json`**

Em `gestor-financeiro-web/package.json`, dentro de `"scripts"`, adicione a linha `"test"` (pode ficar logo após `"preview"`):

```json
    "preview": "vite preview",
    "test": "vitest run",
    "build-only": "vite build",
```

- [ ] **Step 4: Configurar o ambiente de teste no Vite**

Edite `gestor-financeiro-web/vite.config.ts` adicionando o bloco `test`:

```ts
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 5: Escrever o primeiro teste, validando a infraestrutura**

Crie `gestor-financeiro-web/src/utils/formatarMoeda.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { formatarMoeda } from './formatarMoeda'

describe('formatarMoeda', () => {
  it('formata valor inteiro como moeda BRL', () => {
    expect(formatarMoeda(1500)).toBe('R$ 1.500,00')
  })

  it('formata valor decimal como moeda BRL', () => {
    expect(formatarMoeda(42.5)).toBe('R$ 42,50')
  })

  it('aceita valor em string (vindo da API)', () => {
    expect(formatarMoeda('99.90')).toBe('R$ 99,90')
  })
})
```

- [ ] **Step 6: Rodar os testes e o build para confirmar que nada quebrou**

```bash
npm test
npm run build
```

Expected: os 3 testes passam, e `npm run build` termina sem erro (gera `dist/`).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/utils/formatarMoeda.test.ts
git commit -m "chore: adiciona vitest e dependências da reforma de front-end (motion, reka-ui, jspdf, geist)"
```

---

### Task 2: Tokens de design (cores, tipografia, motion)

**Files:**
- Modify: `gestor-financeiro-web/tailwind.config.js`
- Modify: `gestor-financeiro-web/src/style.css`
- Modify: `gestor-financeiro-web/src/App.vue`

**Interfaces:**
- Produces: classes Tailwind `font-sans`/`font-mono` (agora Geist), `bg-ink-950` (fundo escuro premium), disponíveis para todas as tarefas seguintes

- [ ] **Step 1: Estender o Tailwind com a cor `ink` e as fontes Geist**

Edite `gestor-financeiro-web/tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f7f8f9',
          900: '#12141a',
          950: '#0a0b0f',
        },
      },
      fontFamily: {
        sans: ['"Geist Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono Variable"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 2: Importar as fontes self-hosted no CSS global**

Edite `gestor-financeiro-web/src/style.css`, adicionando os imports antes das diretivas do Tailwind:

```css
@import '@fontsource-variable/geist';
@import '@fontsource-variable/geist-mono';

@tailwind base;
@tailwind components;
@tailwind utilities;

/* Chevron visível em <select> com appearance-none (Tailwind não adiciona um sozinho) */
.select-chevron {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1rem;
  padding-right: 2.25rem;
}
```

(A regra `.select-chevron` será removida na Tarefa 5, quando o `<select>` nativo de categoria for substituído. Por ora ela continua em uso pelo seletor de país do Login.)

- [ ] **Step 3: Trocar o fundo escuro do app para o tom "ink" premium**

Em `gestor-financeiro-web/src/App.vue`, troque a classe do fundo (linha 6):

```diff
-  <div class="min-h-screen relative bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
+  <div class="min-h-screen relative bg-slate-50 dark:bg-ink-950 transition-colors duration-300">
```

- [ ] **Step 4: Rodar o build e conferir visualmente**

```bash
npm run build
npm run dev
```

Abra `http://localhost:5173` no navegador, confira que o texto usa a fonte Geist (mais estreita/geométrica que a stack padrão) e que o fundo escuro está mais próximo de preto do que do azulado `slate-900` de antes.

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.js src/style.css src/App.vue
git commit -m "feat: aplica tokens visuais novos (fundo ink, tipografia Geist self-hosted)"
```

---

### Task 3: Mover o seletor de mês para o store (`gastos.ts`)

Hoje `filtroMes`/`filtroAno` vivem como `ref` local dentro de `GastosView.vue`. Como a Tarefa 7 vai dividir essa tela em duas abas (Dashboard e Lançamentos) que precisam concordar sobre qual mês está sendo visto, esse estado precisa ser compartilhado — o lugar natural é o store Pinia, não uma prop passada entre abas que nem são componentes-pai/filho.

**Files:**
- Modify: `gestor-financeiro-web/src/stores/gastos.ts`
- Modify: `gestor-financeiro-web/src/views/GastosView.vue`

**Interfaces:**
- Produces: `useGastosStore().filtroMes: Ref<number>`, `filtroAno: Ref<number>`, `mesAnterior(): void`, `proximoMes(): void` — consumidos pela Tarefa 7 (`AppShell.vue`, `DashboardView.vue`)

- [ ] **Step 1: Adicionar o estado de filtro e a navegação de mês ao store**

Em `gestor-financeiro-web/src/stores/gastos.ts`, adicione perto do topo (após a declaração de `telefone`) e exponha no `return`:

```ts
  // Mês/ano em exibição — compartilhado entre as abas Dashboard e Lançamentos
  const hoje = new Date()
  const filtroMes = ref(hoje.getMonth() + 1)
  const filtroAno = ref(hoje.getFullYear())

  const mesAnterior = () => {
    if (filtroMes.value === 1) {
      filtroMes.value = 12
      filtroAno.value -= 1
    } else {
      filtroMes.value -= 1
    }
  }

  const proximoMes = () => {
    if (filtroMes.value === 12) {
      filtroMes.value = 1
      filtroAno.value += 1
    } else {
      filtroMes.value += 1
    }
  }

  // Refaz a busca sempre que o mês ou ano em exibição mudar
  watch([filtroMes, filtroAno], () => {
    buscarGastos(filtroMes.value, filtroAno.value)
  })
```

E no objeto retornado pelo store, adicione `filtroMes, filtroAno, mesAnterior, proximoMes,` (por exemplo logo após `telefone,`).

- [ ] **Step 2: Atualizar `GastosView.vue` para consumir o filtro do store em vez do `ref` local**

Em `gestor-financeiro-web/src/views/GastosView.vue`, remova as linhas locais de filtro e navegação de mês (linhas 23–45 do arquivo atual: `mesAtual`, `anoAtual`, `filtroMes`, `filtroAno`, `mesAnterior`, `proximoMes`) e o `watch([filtroMes, filtroAno], ...)` (linhas 202–205), já que o store agora cuida disso sozinho.

No `<script setup>`, troque todas as referências `filtroMes.value`/`filtroAno.value` por `gastosStore.filtroMes`/`gastosStore.filtroAno` nas funções que restaram (`buscarTotalMesAnterior`, `confirmarNovoGasto`), e no `<template>`, troque `filtroMes`/`filtroAno`/`mesAnterior`/`proximoMes` por `gastosStore.filtroMes`/`gastosStore.filtroAno`/`gastosStore.mesAnterior`/`gastosStore.proximoMes` no bloco do seletor de mês (linhas 247–261).

O `onMounted` final fica só com as referências atualizadas (o `watch` do store não dispara sozinho no mount — só reage a **mudanças** — então a chamada inicial de `buscarGastos` continua explícita aqui):

```ts
onMounted(() => {
  gastosStore.buscarGastos(gastosStore.filtroMes, gastosStore.filtroAno)
  buscarTotalMesAnterior()
})
```

- [ ] **Step 3: Rodar o app e conferir manualmente**

```bash
npm run dev
```

Faça login, confira que trocar de mês no seletor (‹ / ›) continua atualizando a lista, o total e o gráfico exatamente como antes.

- [ ] **Step 4: Rodar os testes**

```bash
npm test
```

Expected: os 3 testes da Tarefa 1 continuam passando (nenhum deles toca este código, é só uma verificação de sanidade).

- [ ] **Step 5: Commit**

```bash
git add src/stores/gastos.ts src/views/GastosView.vue
git commit -m "refactor: move o filtro de mês/ano para o store, preparando a divisão em abas"
```

---

### Task 4: Extrair `GraficoCategorias.vue`

**Files:**
- Create: `gestor-financeiro-web/src/components/GraficoCategorias.vue`
- Modify: `gestor-financeiro-web/src/views/GastosView.vue`

**Interfaces:**
- Consumes: `Transacao` de `../stores/gastos`, `corDaCategoria` de `../theme/categorias`, `useTema` de `../composables/useTema`
- Produces: componente `GraficoCategorias` com prop `transacoes: Transacao[]`, usado pela Tarefa 7 em `DashboardView.vue`

- [ ] **Step 1: Criar o componente**

Crie `gestor-financeiro-web/src/components/GraficoCategorias.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Doughnut } from 'vue-chartjs'
import { useTema } from '../composables/useTema'
import { corDaCategoria } from '../theme/categorias'
import type { Transacao } from '../stores/gastos'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps<{ transacoes: Transacao[] }>()
const { tema } = useTema()

const dadosGrafico = computed(() => {
  const contagem: Record<string, number> = {}

  props.transacoes.forEach((g) => {
    const cat = g.categoria || 'Outros'
    if (!contagem[cat]) contagem[cat] = 0
    contagem[cat] += Number(g.valor)
  })

  const categorias = Object.keys(contagem)
  const corGap = tema.value === 'dark' ? '#0a0b0f' : '#ffffff'

  return {
    labels: categorias,
    datasets: [
      {
        backgroundColor: categorias.map(corDaCategoria),
        data: Object.values(contagem),
        borderColor: corGap,
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  }
})

const opcoesGrafico = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right' as const,
      labels: {
        color: tema.value === 'dark' ? '#cbd5e1' : '#475569',
        padding: 14,
      },
    },
  },
}))
</script>

<template>
  <div class="bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 mb-4 h-64">
    <Doughnut :data="dadosGrafico" :options="opcoesGrafico" />
  </div>
</template>
```

Note: `mb-4` preserva o espaçamento que o bloco tinha inline em `GastosView.vue` (o card de gráfico precisa de uma folga um pouco maior antes do próximo bloco do que o `space-y-3` do container já dá).

Note: a cor `corGap` mudou de `#1e293b` para `#0a0b0f` para casar com o novo fundo escuro `ink-950` aplicado na Tarefa 2.

- [ ] **Step 2: Usar o componente em `GastosView.vue`**

Em `gestor-financeiro-web/src/views/GastosView.vue`:
1. Remova do `<script setup>`: o import de `Chart as ChartJS, ArcElement, Tooltip, Legend` e `Doughnut`, a linha `ChartJS.register(...)`, e os `computed` `dadosGrafico`/`opcoesGrafico`.
2. Adicione o import: `import GraficoCategorias from '../components/GraficoCategorias.vue'`.
3. No `<template>`, troque o bloco do gráfico (o `<div>` com `<Doughnut :data="dadosGrafico" ...>`) por:

```vue
<GraficoCategorias v-if="gastosStore.transacoes.length > 0" :transacoes="gastosStore.transacoes" />
```

- [ ] **Step 3: Rodar o app e conferir visualmente**

```bash
npm run dev
```

O gráfico de rosca deve continuar aparecendo exatamente como antes, com as mesmas cores por categoria.

- [ ] **Step 4: Rodar os testes**

```bash
npm test
```

- [ ] **Step 5: Commit**

```bash
git add src/components/GraficoCategorias.vue src/views/GastosView.vue
git commit -m "refactor: extrai GraficoCategorias.vue do bloco inline em GastosView"
```

---

### Task 5: Criar `CategoriaSelect.vue` (substitui o `<select>` nativo duplicado)

**Files:**
- Create: `gestor-financeiro-web/src/components/CategoriaSelect.vue`
- Modify: `gestor-financeiro-web/src/views/GastosView.vue`
- Modify: `gestor-financeiro-web/src/style.css`

**Interfaces:**
- Consumes: `CATEGORIAS`, `iconeDaCategoria` de `../theme/categorias`; `SelectRoot/SelectTrigger/SelectValue/SelectIcon/SelectPortal/SelectContent/SelectViewport/SelectItem/SelectItemText/SelectItemIndicator` de `reka-ui`
- Produces: componente `CategoriaSelect` com `v-model` (string) e prop opcional `incluirAutomatica: boolean`, usado pela Tarefa 6 (`GastoItem.vue`) e Tarefa 7 (`LancamentosView.vue`)

- [ ] **Step 1: Criar o componente**

Crie `gestor-financeiro-web/src/components/CategoriaSelect.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import {
  SelectRoot, SelectTrigger, SelectValue, SelectIcon,
  SelectPortal, SelectContent, SelectViewport,
  SelectItem, SelectItemText, SelectItemIndicator,
} from 'reka-ui'
import { CATEGORIAS, iconeDaCategoria } from '../theme/categorias'

// reka-ui 2.10.1 lança erro em runtime se um <SelectItem> tiver value="" —
// usamos um sentinel interno pra representar "Automática" e traduzimos de/para
// string vazia só na borda pública do v-model (quem consome este componente
// nunca vê o sentinel; v-model continua sendo '' para "Automática").
const AUTOMATICA = '__automatica__'

const modelValue = defineModel<string>({ required: true })

withDefaults(defineProps<{ incluirAutomatica?: boolean }>(), {
  incluirAutomatica: false,
})

const valorSelect = computed({
  get: () => (modelValue.value === '' ? AUTOMATICA : modelValue.value),
  set: (v: string) => { modelValue.value = v === AUTOMATICA ? '' : v },
})
</script>

<template>
  <SelectRoot v-model="valorSelect">
    <SelectTrigger
      class="min-w-0 flex-1 flex items-center justify-between gap-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-emerald-400 data-[placeholder]:text-slate-400"
    >
      <SelectValue placeholder="🤖 Automática" />
      <SelectIcon as-child>
        <svg class="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </SelectIcon>
    </SelectTrigger>
    <SelectPortal>
      <SelectContent
        class="z-50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl shadow-slate-900/10 dark:shadow-black/40 overflow-hidden"
        position="popper"
        :side-offset="6"
      >
        <SelectViewport class="p-1 max-h-72 overflow-y-auto">
          <SelectItem
            v-if="incluirAutomatica"
            :value="AUTOMATICA"
            class="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-slate-600 dark:text-slate-300 outline-none cursor-pointer data-[highlighted]:bg-slate-900/5 dark:data-[highlighted]:bg-white/5 data-[state=checked]:bg-emerald-500/15 data-[state=checked]:text-emerald-700 dark:data-[state=checked]:text-emerald-300"
          >
            <SelectItemText>🤖 Automática</SelectItemText>
          </SelectItem>
          <SelectItem
            v-for="cat in CATEGORIAS" :key="cat" :value="cat"
            class="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-slate-600 dark:text-slate-300 outline-none cursor-pointer data-[highlighted]:bg-slate-900/5 dark:data-[highlighted]:bg-white/5 data-[state=checked]:bg-emerald-500/15 data-[state=checked]:text-emerald-700 dark:data-[state=checked]:text-emerald-300"
          >
            <SelectItemText>{{ iconeDaCategoria(cat) }} {{ cat }}</SelectItemText>
            <SelectItemIndicator class="ml-auto text-emerald-500">✓</SelectItemIndicator>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
```

- [ ] **Step 2: Substituir os dois `<select>` nativos em `GastosView.vue`**

Em `gestor-financeiro-web/src/views/GastosView.vue`, adicione o import `import CategoriaSelect from '../components/CategoriaSelect.vue'`.

Troque o bloco do formulário de novo gasto (o `<select v-model="novaCategoria" class="select-chevron ...">` com as `<option>`) por:

```vue
<CategoriaSelect v-model="novaCategoria" incluir-automatica />
```

Troque o bloco do formulário de edição inline (o `<select v-model="formCategoria" class="select-chevron ...">`) por:

```vue
<CategoriaSelect v-model="formCategoria" />
```

- [ ] **Step 3: Remover a regra CSS que ficou sem uso**

O seletor de país do Login usa um dropdown próprio (não é um `<select>` nativo), então, após esta troca, `.select-chevron` não é mais referenciada em lugar nenhum do código. Remova o bloco de `gestor-financeiro-web/src/style.css`:

```diff
-/* Chevron visível em <select> com appearance-none (Tailwind não adiciona um sozinho) */
-.select-chevron {
-  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3E%3C/svg%3E");
-  background-repeat: no-repeat;
-  background-position: right 0.75rem center;
-  background-size: 1rem;
-  padding-right: 2.25rem;
-}
```

Confirme antes de remover: `grep -rn "select-chevron" src/` deve retornar vazio.

- [ ] **Step 4: Rodar o app e conferir manualmente**

```bash
npm run dev
```

Teste: abrir "+ Novo gasto", trocar a categoria pelo novo dropdown (teclado: setas + Enter também devem funcionar, é um dos ganhos do `reka-ui`); editar um gasto existente e trocar a categoria pelo mesmo componente.

- [ ] **Step 5: Rodar os testes**

```bash
npm test
```

- [ ] **Step 6: Commit**

```bash
git add src/components/CategoriaSelect.vue src/views/GastosView.vue src/style.css
git commit -m "feat: substitui os selects nativos de categoria por CategoriaSelect (reka-ui)"
```

---

### Task 6: Extrair `GastoItem.vue`

**Files:**
- Create: `gestor-financeiro-web/src/components/GastoItem.vue`
- Modify: `gestor-financeiro-web/src/views/GastosView.vue`

**Interfaces:**
- Consumes: `Transacao` de `../stores/gastos`, `DadosEdicaoGasto` de `../services/api`, `corDaCategoria`/`iconeDaCategoria` de `../theme/categorias`, `formatarMoeda`, `CategoriaSelect.vue` (Tarefa 5)
- Produces: componente `GastoItem` com props `gasto: Transacao`, `editando: boolean`, `salvando: boolean` e eventos `iniciar-edicao`, `cancelar-edicao`, `salvar`, `excluir` — usado pela Tarefa 7 (`LancamentosView.vue`)

- [ ] **Step 1: Criar o componente**

Crie `gestor-financeiro-web/src/components/GastoItem.vue`:

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Transacao } from '../stores/gastos'
import type { DadosEdicaoGasto } from '../services/api'
import { corDaCategoria, iconeDaCategoria } from '../theme/categorias'
import { formatarMoeda } from '../utils/formatarMoeda'
import CategoriaSelect from './CategoriaSelect.vue'

const props = defineProps<{
  gasto: Transacao
  editando: boolean
  salvando: boolean
}>()

const emit = defineEmits<{
  'iniciar-edicao': [gasto: Transacao]
  'cancelar-edicao': []
  salvar: [id: number | string, dados: DadosEdicaoGasto]
  excluir: [id: number | string]
}>()

const formDescricao = ref('')
const formCategoria = ref('')
const formValor = ref('')

// Recarrega o formulário sempre que este item entra em modo de edição
watch(
  () => props.editando,
  (ativo) => {
    if (ativo) {
      formDescricao.value = props.gasto.descricao
      formCategoria.value = props.gasto.categoria || 'Outros'
      formValor.value = String(props.gasto.valor)
    }
  },
)

const salvar = () => {
  emit('salvar', props.gasto.id, {
    descricao: formDescricao.value.trim(),
    categoria: formCategoria.value,
    valor: Number(formValor.value.replace(',', '.')),
  })
}
</script>

<template>
  <div class="p-4 bg-white/70 dark:bg-white/5 backdrop-blur-sm rounded-2xl border border-slate-200/70 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 hover:bg-white/90 dark:hover:bg-white/[0.07] transition-all duration-200">

    <!-- Modo edição -->
    <div v-if="editando" class="space-y-3">
      <input v-model="formDescricao" type="text" placeholder="Descrição"
        class="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-400" />
      <div class="flex gap-2 sm:gap-3">
        <CategoriaSelect v-model="formCategoria" />
        <input v-model="formValor" type="text" inputmode="decimal" placeholder="Valor"
          class="w-24 sm:w-28 flex-shrink-0 min-w-0 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-400" />
      </div>
      <div class="flex justify-end gap-2">
        <button @click="emit('cancelar-edicao')" :disabled="salvando"
          class="px-4 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 rounded-lg">
          Cancelar
        </button>
        <button @click="salvar" :disabled="salvando"
          class="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60">
          {{ salvando ? 'Salvando...' : 'Salvar' }}
        </button>
      </div>
    </div>

    <!-- Modo visualização -->
    <div v-else class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div class="flex items-start gap-3 min-w-0">
        <span class="text-xl leading-none mt-0.5 flex-shrink-0">{{ iconeDaCategoria(gasto.categoria) }}</span>
        <div class="flex flex-col min-w-0">
          <span class="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 truncate">{{ gasto.descricao }}</span>
          <div class="flex items-center gap-2 mt-1 flex-wrap">
            <span class="text-xs px-2 py-0.5 rounded-md font-medium"
              :style="{ backgroundColor: corDaCategoria(gasto.categoria) + '26', color: corDaCategoria(gasto.categoria) }">
              {{ gasto.categoria || 'Outros' }}
            </span>
            <span class="text-xs text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">
              {{ new Date(gasto.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) }}
            </span>
          </div>
        </div>
      </div>
      <div class="flex items-center justify-between sm:justify-end gap-2 pl-8 sm:pl-0">
        <div class="text-lg sm:text-xl font-black text-slate-700 dark:text-slate-200 font-mono">
          {{ formatarMoeda(gasto.valor) }}
        </div>
        <div class="flex items-center gap-1 flex-shrink-0">
          <button @click="emit('iniciar-edicao', gasto)"
            class="p-2 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
            title="Editar gasto">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button @click="emit('excluir', gasto.id)"
            class="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
            title="Excluir gasto">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
```

Note: o valor formatado ganhou a classe `font-mono` (Geist Mono, da Tarefa 2) — números tabulares alinhados é o detalhe de fintech mencionado na spec.

- [ ] **Step 2: Usar o componente em `GastosView.vue`**

Em `gestor-financeiro-web/src/views/GastosView.vue`:
1. Adicione o import `import GastoItem from '../components/GastoItem.vue'`.
2. Remova do `<script setup>` os refs `formDescricao`, `formCategoria`, `formValor` e a função `iniciarEdicao`/`salvarEdicao` **não** devem ser removidas inteiramente — `iniciarEdicao`/`cancelarEdicao` continuam existindo (controlam qual item está em edição), mas `salvarEdicao` passa a receber os dados prontos do evento em vez de ler dos refs locais. Ajuste:

```ts
const salvarEdicao = async (id: number | string, dados: DadosEdicaoGasto) => {
  salvando.value = true
  const sucesso = await gastosStore.editarGasto(id, dados)
  salvando.value = false
  if (sucesso) {
    editandoId.value = null
    mostrarToast('Gasto atualizado ✓')
  }
}
```

(importe `DadosEdicaoGasto` de `'../services/api'` se ainda não estiver importado.)

3. No `<template>`, troque todo o `<div v-for="gasto in gastosStore.transacoes" ...>` (o card completo, com os dois modos visualização/edição) por:

```vue
<GastoItem
  v-for="gasto in gastosStore.transacoes" :key="gasto.id"
  :gasto="gasto"
  :editando="editandoId === gasto.id"
  :salvando="salvando"
  @iniciar-edicao="iniciarEdicao"
  @cancelar-edicao="cancelarEdicao"
  @salvar="salvarEdicao"
  @excluir="excluir"
/>
```

- [ ] **Step 3: Rodar o app e conferir manualmente**

```bash
npm run dev
```

Teste: editar um gasto (só um por vez continua editável), cancelar edição, excluir um gasto.

- [ ] **Step 4: Rodar os testes**

```bash
npm test
```

- [ ] **Step 5: Commit**

```bash
git add src/components/GastoItem.vue src/views/GastosView.vue
git commit -m "refactor: extrai GastoItem.vue do v-for inline em GastosView"
```

---

### Task 7: Dividir em abas — `AppShell.vue`, `DashboardView.vue`, `LancamentosView.vue`

Esta é a tarefa "de corte atômico": ela cria o layout compartilhado e as duas telas novas, atualiza o router e remove `GastosView.vue` — tudo em um único commit, porque não é seguro deixar duas rotas fazendo a mesma coisa em paralelo por várias tarefas (ver observação de sequenciamento no início deste plano). `GastosView.vue` já está enxuta desde as Tarefas 4–6 (gráfico, select e item de lista já extraídos), então esta tarefa é essencialmente "recortar o que sobrou em 2 arquivos + trocar a rota".

**Files:**
- Create: `gestor-financeiro-web/src/constants/meses.ts`
- Create: `gestor-financeiro-web/src/layouts/AppShell.vue`
- Create: `gestor-financeiro-web/src/views/DashboardView.vue`
- Create: `gestor-financeiro-web/src/views/LancamentosView.vue`
- Modify: `gestor-financeiro-web/src/router/index.ts`
- Modify: `gestor-financeiro-web/src/main.ts`
- Delete: `gestor-financeiro-web/src/views/GastosView.vue`

**Interfaces:**
- Consumes: `useGastosStore()` (incluindo `filtroMes`/`filtroAno`/`mesAnterior`/`proximoMes` da Tarefa 3), `GraficoCategorias` (Tarefa 4), `CategoriaSelect` (Tarefa 5), `GastoItem` (Tarefa 6)
- Produces: `MESES: string[]` (constante compartilhada); rotas nomeadas `painel` (`/painel`) e `lancamentos` (`/lancamentos`); componente `AppShell` usado como wrapper (slot) por ambas as views

- [ ] **Step 1: Extrair a constante de nomes de mês**

O nome dos meses (hoje um array `const meses = [...]` só dentro de `GastosView.vue`) vai ser usado tanto em `AppShell.vue` (seletor de mês) quanto em `DashboardView.vue` (rótulo "vs. mês anterior") — dois arquivos novos, então declarar o mesmo array literal duas vezes seria duplicação introduzida por esta própria tarefa. Extraia para uma constante compartilhada.

Crie `gestor-financeiro-web/src/constants/meses.ts`:

```ts
export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const
```

- [ ] **Step 2: Registrar o plugin de motion**

Em `gestor-financeiro-web/src/main.ts`:

```diff
 import './style.css'

 import { createApp } from 'vue'
 import { createPinia } from 'pinia'
+import { MotionPlugin } from '@vueuse/motion'

 import App from './App.vue'
 import router from './router'

 // Aplica o tema salvo antes do primeiro paint, para não piscar o tema errado
 document.documentElement.classList.toggle('dark', (localStorage.getItem('gestor_tema') || 'dark') === 'dark')

 const app = createApp(App)

 app.use(createPinia())
 app.use(router)
+app.use(MotionPlugin)

 app.mount('#app')
```

- [ ] **Step 3: Criar o `AppShell.vue`**

Crie `gestor-financeiro-web/src/layouts/AppShell.vue`:

```vue
<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TabsRoot, TabsList, TabsTrigger } from 'reka-ui'
import { useGastosStore } from '../stores/gastos'
import { MESES } from '../constants/meses'

const route = useRoute()
const router = useRouter()
const gastosStore = useGastosStore()

// AppShell é remontado a cada troca de aba (Dashboard <-> Lançamentos são rotas
// diferentes, cada uma com sua própria instância de AppShell) — por isso é o
// lugar certo para a busca inicial da lista do mês em exibição: cobre as duas
// abas sem duplicar a chamada em cada view. O `watch` dentro do store (Task 3)
// só reage a *mudanças* de filtroMes/filtroAno, não à montagem inicial.
onMounted(() => {
  gastosStore.buscarGastos(gastosStore.filtroMes, gastosStore.filtroAno)
})

const ABAS = [
  { valor: 'painel', rota: '/painel', rotulo: 'Dashboard' },
  { valor: 'lancamentos', rota: '/lancamentos', rotulo: 'Lançamentos' },
] as const

const abaAtiva = computed(() => ABAS.find((a) => a.rota === route.path)?.valor ?? 'painel')

const irParaAba = (valor: string | number) => {
  const aba = ABAS.find((a) => a.valor === valor)
  if (aba) router.push(aba.rota)
}

const telefoneFormatado = computed(() => {
  const n = gastosStore.telefone || ''
  if (n.length <= 2) return `+${n}`
  if (n.length <= 4) return `+${n.slice(0, 2)} ${n.slice(2)}`
  if (n.length <= 9) return `+${n.slice(0, 2)} ${n.slice(2, 4)} ${n.slice(4)}`
  return `+${n.slice(0, 2)} ${n.slice(2, 4)} ${n.slice(4, 9)}-${n.slice(9)}`
})

const sair = () => {
  gastosStore.logout()
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen p-4 sm:p-8 font-sans">
    <div class="max-w-2xl mx-auto">

      <!-- Cabeçalho -->
      <div class="flex items-start justify-between gap-3 mb-6">
        <div class="min-w-0">
          <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
            💸 Gestor Financeiro
          </h1>
          <p class="text-emerald-600 dark:text-emerald-400 text-sm font-mono mt-1">
            📱 {{ telefoneFormatado }}
          </p>
        </div>
        <button id="btn-sair" @click="sair"
          class="flex-shrink-0 bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/20 text-sm font-semibold px-3 sm:px-4 py-2 rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60">
          ← Trocar
        </button>
      </div>

      <!-- Tabs de navegação -->
      <TabsRoot :model-value="abaAtiva" @update:model-value="irParaAba">
        <TabsList
          class="flex gap-1 mb-6 bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-1"
          aria-label="Navegação principal"
        >
          <TabsTrigger
            v-for="aba in ABAS" :key="aba.valor" :value="aba.valor"
            class="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-200 text-slate-500 dark:text-slate-400 data-[state=active]:bg-emerald-500 data-[state=active]:text-white hover:text-slate-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
          >
            {{ aba.rotulo }}
          </TabsTrigger>
        </TabsList>
      </TabsRoot>

      <!-- Seletor de mês -->
      <div class="flex items-center justify-between gap-2 mb-6 bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-2 py-2">
        <button @click="gastosStore.mesAnterior" aria-label="Mês anterior"
          class="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-900/5 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60">
          ‹
        </button>
        <span class="font-semibold text-slate-800 dark:text-slate-100 text-sm sm:text-base">
          {{ MESES[gastosStore.filtroMes - 1] }} de {{ gastosStore.filtroAno }}
        </span>
        <button @click="gastosStore.proximoMes" aria-label="Próximo mês"
          class="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-900/5 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60">
          ›
        </button>
      </div>

      <slot />
    </div>
  </div>
</template>
```

Note: `ThemeToggle` continua renderizado globalmente por `App.vue` (não precisou ser movido pra cá — já era compartilhado por todas as telas antes desta reforma).

- [ ] **Step 4: Criar o `DashboardView.vue`**

Crie `gestor-financeiro-web/src/views/DashboardView.vue` (a Tarefa 10 vai adicionar `GraficoHistorico` e a Tarefa 12 vai adicionar as metas; por ora, ele reproduz o card de total + comparativo + gráfico de categorias que já existiam em `GastosView.vue`):

```vue
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useGastosStore } from '../stores/gastos'
import { formatarMoeda } from '../utils/formatarMoeda'
import { MESES } from '../constants/meses'
import AppShell from '../layouts/AppShell.vue'
import GraficoCategorias from '../components/GraficoCategorias.vue'
import * as api from '../services/api'
import type { Transacao } from '../stores/gastos'

const gastosStore = useGastosStore()

const totalMesAnterior = ref<number | null>(null)

const buscarTotalMesAnterior = async () => {
  let mes = gastosStore.filtroMes - 1
  let ano = gastosStore.filtroAno
  if (mes === 0) {
    mes = 12
    ano -= 1
  }
  try {
    const dados = await api.buscarGastos(gastosStore.telefone, mes, ano)
    totalMesAnterior.value = dados.reduce((acc: number, g: Transacao) => acc + Number(g.valor), 0)
  } catch {
    totalMesAnterior.value = null
  }
}

const variacaoPercentual = computed(() => {
  if (totalMesAnterior.value === null || totalMesAnterior.value === 0) return null
  return ((gastosStore.totalGastosNumerico - totalMesAnterior.value) / totalMesAnterior.value) * 100
})

watch([() => gastosStore.filtroMes, () => gastosStore.filtroAno], buscarTotalMesAnterior)

// A busca da lista principal (gastosStore.transacoes) já é disparada pelo
// AppShell (que envolve esta view) — aqui só falta o total do mês anterior,
// que é uma preocupação específica do Dashboard. Fica em bloco (e não como
// referência direta `onMounted(buscarTotalMesAnterior)`) porque a Task 12
// adiciona uma segunda chamada aqui dentro.
onMounted(() => {
  buscarTotalMesAnterior()
})
</script>

<template>
  <AppShell>
    <div v-if="gastosStore.carregando" class="space-y-3 animate-pulse">
      <div class="h-24 rounded-2xl bg-slate-200/70 dark:bg-white/5"></div>
      <div class="h-64 rounded-2xl bg-slate-200/70 dark:bg-white/5"></div>
    </div>

    <div v-else-if="gastosStore.erro" class="min-h-[40vh] flex items-center justify-center">
      <div class="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl">
        <p class="text-red-500 dark:text-red-400 font-semibold">{{ gastosStore.erro }}</p>
      </div>
    </div>

    <div v-else class="space-y-4">
      <div v-if="gastosStore.transacoes.length > 0"
        v-motion :initial="{ opacity: 0, y: 12 }" :enter="{ opacity: 1, y: 0, transition: { duration: 300 } }"
        class="bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 border border-emerald-500/20 rounded-2xl p-5 flex justify-between items-center">
        <div>
          <p class="text-emerald-700/80 dark:text-emerald-400/70 text-xs font-semibold uppercase tracking-wider">Total gasto</p>
          <p class="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {{ formatarMoeda(gastosStore.totalGastosNumerico) }}
          </p>
          <p v-if="variacaoPercentual !== null" class="text-xs font-semibold mt-1.5"
            :class="variacaoPercentual > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'">
            {{ variacaoPercentual > 0 ? '↑' : variacaoPercentual < 0 ? '↓' : '→' }}
            {{ Math.abs(variacaoPercentual).toFixed(0) }}% vs. {{ MESES[(gastosStore.filtroMes - 2 + 12) % 12] }}
          </p>
        </div>
        <div class="text-right">
          <p class="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">Registros</p>
          <p class="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1 font-mono">{{ gastosStore.transacoes.length }}</p>
        </div>
      </div>

      <GraficoCategorias v-if="gastosStore.transacoes.length > 0" :transacoes="gastosStore.transacoes" />

      <div v-if="gastosStore.transacoes.length === 0" class="min-h-[30vh] flex flex-col items-center justify-center text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900/5 dark:bg-white/5 mb-4">
          <span class="text-3xl">📭</span>
        </div>
        <p class="text-slate-500 dark:text-slate-400 text-lg font-semibold">Nenhum gasto neste mês.</p>
      </div>
    </div>
  </AppShell>
</template>
```

- [ ] **Step 5: Criar o `LancamentosView.vue`**

Crie `gestor-financeiro-web/src/views/LancamentosView.vue`:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGastosStore } from '../stores/gastos'
import type { Transacao } from '../stores/gastos'
import type { DadosEdicaoGasto } from '../services/api'
import AppShell from '../layouts/AppShell.vue'
import GastoItem from '../components/GastoItem.vue'
import CategoriaSelect from '../components/CategoriaSelect.vue'

const gastosStore = useGastosStore()

// --- Novo gasto ---
const adicionandoAberto = ref(false)
const novaDescricao = ref('')
const novaCategoria = ref('')
const novoValor = ref('')
const criando = ref(false)

const novoGastoValido = computed(() => {
  const valor = Number(novoValor.value.replace(',', '.'))
  return novaDescricao.value.trim().length > 0 && valor > 0
})

const abrirNovoGasto = () => {
  adicionandoAberto.value = true
  novaDescricao.value = ''
  novaCategoria.value = ''
  novoValor.value = ''
}

const cancelarNovoGasto = () => {
  adicionandoAberto.value = false
}

const confirmarNovoGasto = async () => {
  if (!novoGastoValido.value) return
  criando.value = true
  const criado = await gastosStore.criarGasto({
    descricao: novaDescricao.value.trim(),
    valor: Number(novoValor.value.replace(',', '.')),
    categoria: novaCategoria.value || undefined,
  })
  criando.value = false
  if (criado) {
    adicionandoAberto.value = false
    mostrarToast(`Gasto adicionado (${criado.categoria}) ✓`)
    // gastosStore.criarGasto() só retorna o registro criado — não o insere em
    // transacoes.value (diferente de excluirGasto/editarGasto, que já
    // atualizam o estado local). Sem este refetch o novo gasto fica invisível
    // na lista até a próxima remontagem do AppShell ou troca de mês.
    await gastosStore.buscarGastos(gastosStore.filtroMes, gastosStore.filtroAno)
  }
}

// --- Edição inline ---
const editandoId = ref<number | string | null>(null)
const salvando = ref(false)

const iniciarEdicao = (gasto: Transacao) => {
  editandoId.value = gasto.id
}

const cancelarEdicao = () => {
  editandoId.value = null
}

const salvarEdicao = async (id: number | string, dados: DadosEdicaoGasto) => {
  salvando.value = true
  const sucesso = await gastosStore.editarGasto(id, dados)
  salvando.value = false
  if (sucesso) {
    editandoId.value = null
    mostrarToast('Gasto atualizado ✓')
  }
}

// --- Excluir ---
const excluir = async (id: number | string) => {
  await gastosStore.excluirGasto(id)
  if (!gastosStore.erroAcao) mostrarToast('Gasto excluído ✓')
}

// --- Toast de confirmação ---
const toast = ref<string | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

const mostrarToast = (mensagem: string) => {
  toast.value = mensagem
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = null
  }, 2200)
}
</script>

<template>
  <AppShell>
    <div class="space-y-3">

      <!-- Adicionar gasto pelo portal -->
      <div v-if="!adicionandoAberto" class="mb-2">
        <button id="btn-novo-gasto" @click="abrirNovoGasto"
          class="w-full py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60">
          + Novo gasto
        </button>
      </div>

      <div v-else class="mb-2 bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-lg shadow-slate-900/5 dark:shadow-none">
        <p class="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">💸 Novo gasto</p>
        <div class="space-y-3">
          <input v-model="novaDescricao" type="text" placeholder="Descrição (ex: mercado, uber, netflix)" autofocus
            class="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-emerald-400" />
          <div class="flex gap-2 sm:gap-3">
            <CategoriaSelect v-model="novaCategoria" incluir-automatica />
            <input v-model="novoValor" type="text" inputmode="decimal" placeholder="Valor"
              class="w-24 sm:w-28 flex-shrink-0 min-w-0 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-emerald-400" />
          </div>
          <div class="flex justify-end gap-2">
            <button @click="cancelarNovoGasto" :disabled="criando"
              class="px-4 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 rounded-lg">
              Cancelar
            </button>
            <button @click="confirmarNovoGasto" :disabled="!novoGastoValido || criando"
              class="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60">
              {{ criando ? 'Adicionando...' : 'Adicionar' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="gastosStore.carregando" class="space-y-3 animate-pulse">
        <div class="h-20 rounded-2xl bg-slate-200/70 dark:bg-white/5"></div>
        <div class="h-20 rounded-2xl bg-slate-200/70 dark:bg-white/5"></div>
        <div class="h-20 rounded-2xl bg-slate-200/70 dark:bg-white/5"></div>
      </div>

      <div v-else-if="gastosStore.erro" class="min-h-[40vh] flex items-center justify-center">
        <div class="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl">
          <p class="text-red-500 dark:text-red-400 font-semibold">{{ gastosStore.erro }}</p>
        </div>
      </div>

      <div v-else class="space-y-3">
        <div v-if="gastosStore.erroAcao" class="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex justify-between items-center gap-3">
          <p class="text-red-500 dark:text-red-400 text-sm font-semibold">{{ gastosStore.erroAcao }}</p>
          <button @click="gastosStore.erroAcao = null"
            class="text-red-500/70 dark:text-red-400/70 hover:text-red-600 dark:hover:text-red-300 text-lg leading-none">
            ✕
          </button>
        </div>

        <GastoItem
          v-for="gasto in gastosStore.transacoes" :key="gasto.id"
          :gasto="gasto"
          :editando="editandoId === gasto.id"
          :salvando="salvando"
          @iniciar-edicao="iniciarEdicao"
          @cancelar-edicao="cancelarEdicao"
          @salvar="salvarEdicao"
          @excluir="excluir"
        />

        <div v-if="gastosStore.transacoes.length === 0" class="min-h-[40vh] flex flex-col items-center justify-center text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900/5 dark:bg-white/5 mb-4">
            <span class="text-3xl">📭</span>
          </div>
          <p class="text-slate-500 dark:text-slate-400 text-lg font-semibold">Nenhum gasto registrado.</p>
          <p class="text-slate-400 dark:text-slate-600 text-sm mt-2">Mande uma mensagem pelo WhatsApp ou toque em "+ Novo gasto" para começar!</p>
        </div>
      </div>
    </div>

    <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="toast"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl z-50">
        {{ toast }}
      </div>
    </Transition>
  </AppShell>
</template>
```

(A Tarefa 9 vai trocar o bloco "Excluir" acima pelo fluxo de desfazer; a Tarefa 13 vai adicionar o botão de exportar.)

- [ ] **Step 6: Atualizar o router**

Substitua todo o conteúdo de `gestor-financeiro-web/src/router/index.ts`:

```ts
import { createRouter, createWebHistory } from 'vue-router'
import { useGastosStore } from '../stores/gastos'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/painel',
      name: 'painel',
      component: () => import('../views/DashboardView.vue'),
    },
    {
      path: '/lancamentos',
      name: 'lancamentos',
      component: () => import('../views/LancamentosView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFoundView.vue'),
    },
  ],
})

const ROTAS_AUTENTICADAS = ['painel', 'lancamentos']

// Guard: se não tem telefone na store, volta pro login
router.beforeEach((to) => {
  if (typeof to.name === 'string' && ROTAS_AUTENTICADAS.includes(to.name)) {
    const store = useGastosStore()
    if (!store.telefone) {
      return { name: 'login' }
    }
  }
})

export default router
```

- [ ] **Step 7: Atualizar o redirecionamento pós-login**

Em `gestor-financeiro-web/src/views/LoginView.vue`, troque as duas ocorrências de `router.push('/gastos')` (uma no `onMounted`, outra em `confirmarCodigo`) por `router.push('/painel')`.

- [ ] **Step 8: Remover a tela antiga**

```bash
git rm gestor-financeiro-web/src/views/GastosView.vue
```

- [ ] **Step 9: Rodar o app e conferir manualmente o fluxo completo**

```bash
npm run dev
```

Login → deve cair em `/painel` (Dashboard: total, comparativo, gráfico). Trocar para a aba "Lançamentos" → deve mostrar a lista, permitir adicionar/editar/excluir. Trocar de mês em qualquer uma das abas e navegar pra outra → o mês selecionado deve estar sincronizado. Recarregar a página em `/lancamentos` sem estar logado → deve redirecionar pro login.

- [ ] **Step 10: Rodar os testes**

```bash
npm test
npm run build
```

- [ ] **Step 11: Commit**

```bash
git add src/constants/meses.ts src/layouts/AppShell.vue src/views/DashboardView.vue src/views/LancamentosView.vue src/router/index.ts src/views/LoginView.vue src/main.ts
git commit -m "feat: divide o painel em abas Dashboard/Lançamentos com AppShell compartilhado"
```

---

### Task 8: Redesenhar `LoginView.vue`

**Files:**
- Modify: `gestor-financeiro-web/src/views/LoginView.vue`

**Interfaces:**
- Nenhuma mudança de lógica ou de interface pública — só tokens visuais e uma transição nova entre as etapas telefone/PIN.

- [ ] **Step 1: Adicionar a animação de entrada do card e a transição entre etapas**

Em `gestor-financeiro-web/src/views/LoginView.vue`, envolva o card de login (o `<div v-if="etapa === 'telefone'">` / `<div v-else>` que hoje trocam via `v-if`/`v-else` sem transição) em um `<Transition>` e adicione `v-motion` na entrada geral do card:

```diff
       <!-- Card: etapa 1, telefone -->
-      <div v-if="etapa === 'telefone'"
-        class="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-3xl p-8 shadow-xl shadow-slate-900/5 dark:shadow-2xl">
+      <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 translate-x-3"
+        enter-to-class="opacity-100 translate-x-0" leave-active-class="transition duration-150 ease-in absolute inset-x-0"
+        leave-from-class="opacity-100 translate-x-0" leave-to-class="opacity-0 -translate-x-3" mode="out-in">
+      <div v-if="etapa === 'telefone'" key="telefone"
+        v-motion :initial="{ opacity: 0, y: 12 }" :enter="{ opacity: 1, y: 0, transition: { duration: 300 } }"
+        class="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-3xl p-8 shadow-xl shadow-slate-900/5 dark:shadow-2xl">
```

E, mais abaixo, feche a `<Transition>` e marque a segunda etapa com `key="pin"`:

```diff
       <!-- Card: etapa 2, confirmação do PIN -->
-      <div v-else
+      <div v-else key="pin"
         class="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-3xl p-8 shadow-xl shadow-slate-900/5 dark:shadow-2xl">
```

... (todo o conteúdo interno do card de PIN continua igual) ...

```diff
       </div>

+      </Transition>
+
       <!-- Rodapé -->
```

- [ ] **Step 2: Rodar o app e conferir manualmente**

```bash
npm run dev
```

Digite um telefone, envie o código: a troca de card (telefone → PIN) deve deslizar suavemente em vez de trocar abruptamente. Confira também que o fundo/tipografia herdaram os tokens da Tarefa 2 automaticamente (nenhuma mudança extra necessária aqui).

- [ ] **Step 3: Rodar os testes**

```bash
npm test
```

- [ ] **Step 4: Commit**

```bash
git add src/views/LoginView.vue
git commit -m "feat: adiciona motion à troca de etapas do login"
```

---

### Task 9: Excluir com desfazer (undo)

**Files:**
- Modify: `gestor-financeiro-web/src/stores/gastos.ts`
- Modify: `gestor-financeiro-web/src/views/LancamentosView.vue`
- Modify: `gestor-financeiro-web/src/views/DashboardView.vue`

**Interfaces:**
- Produces: `useGastosStore().transacoesVisiveis: ComputedRef<Transacao[]>`, `marcarParaExcluir(id): void`, `desfazerExclusao(id): void` — substituem `excluirGasto(id)` (removida). `totalGastosNumerico`/`totalGastos` passam a derivar de `transacoesVisiveis` (não mais de `transacoes` diretamente), para que o total do Dashboard já reflita uma exclusão otimista em andamento.
- Consumes (teste): `../services/api` mockado com `vi.mock`

- [ ] **Step 1: Escrever o teste do fluxo de exclusão com desfazer**

Crie `gestor-financeiro-web/src/stores/gastos.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGastosStore } from './gastos'
import * as api from '../services/api'

vi.mock('../services/api', () => ({
  excluirGasto: vi.fn().mockResolvedValue({ sucesso: true }),
}))

// O ambiente de teste roda em Node puro (sem jsdom — ver Task 1), e o store lê/escreve
// em localStorage ao ser instanciado. Node não tem localStorage global por padrão
// (confirmado: `node -e "console.log(typeof localStorage)"` retorna "undefined" mesmo
// no Node 24), então stubamos um substituto mínimo em memória.
function criarLocalStorageFalso() {
  const armazenamento = new Map<string, string>()
  return {
    getItem: (chave: string) => armazenamento.get(chave) ?? null,
    setItem: (chave: string, valor: string) => { armazenamento.set(chave, valor) },
    removeItem: (chave: string) => { armazenamento.delete(chave) },
    clear: () => armazenamento.clear(),
  }
}

vi.stubGlobal('localStorage', criarLocalStorageFalso())

describe('useGastosStore — excluir com desfazer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.mocked(api.excluirGasto).mockClear()
  })

  it('some da lista visível imediatamente, mas não chama a API antes do tempo de graça', () => {
    const store = useGastosStore()
    store.transacoes = [
      { id: 1, telefone: '5511999999999', descricao: 'mercado', categoria: 'Alimentação', valor: 50, data: '2026-07-01' },
    ]

    store.marcarParaExcluir(1)

    expect(store.transacoesVisiveis).toHaveLength(0)
    expect(api.excluirGasto).not.toHaveBeenCalled()
  })

  it('desfazer restaura o item e nunca chama a API', () => {
    const store = useGastosStore()
    store.transacoes = [
      { id: 1, telefone: '5511999999999', descricao: 'mercado', categoria: 'Alimentação', valor: 50, data: '2026-07-01' },
    ]

    store.marcarParaExcluir(1)
    store.desfazerExclusao(1)

    expect(store.transacoesVisiveis).toHaveLength(1)

    vi.advanceTimersByTime(6000)
    expect(api.excluirGasto).not.toHaveBeenCalled()
  })

  it('sem desfazer, chama a API de verdade após o tempo de graça e remove definitivamente', async () => {
    const store = useGastosStore()
    store.transacoes = [
      { id: 1, telefone: '5511999999999', descricao: 'mercado', categoria: 'Alimentação', valor: 50, data: '2026-07-01' },
    ]

    store.marcarParaExcluir(1)
    await vi.advanceTimersByTimeAsync(5000)

    expect(api.excluirGasto).toHaveBeenCalledWith(1, '')
    expect(store.transacoes).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

```bash
npm test -- gastos.test
```

Expected: FAIL — `store.marcarParaExcluir is not a function` (ainda não existe).

- [ ] **Step 3: Implementar no store**

Em `gestor-financeiro-web/src/stores/gastos.ts`, remova a action `excluirGasto` existente e adicione no lugar (mantendo `erroAcao` como já existe):

```ts
  // Exclusão com desfazer: o item some da lista visível na hora, mas só é
  // excluído de verdade na API depois de um tempo de graça sem "Desfazer".
  const idsExcluindo = ref<(number | string)[]>([])
  const timersExclusao = new Map<number | string, ReturnType<typeof setTimeout>>()
  const TEMPO_DE_GRACA_MS = 5000

  const transacoesVisiveis = computed(() =>
    transacoes.value.filter((t) => !idsExcluindo.value.includes(t.id)),
  )

  const excluirDeVerdade = async (id: number | string) => {
    timersExclusao.delete(id)
    erroAcao.value = null
    try {
      await api.excluirGasto(id, telefone.value)
      transacoes.value = transacoes.value.filter((t) => t.id !== id)
      idsExcluindo.value = idsExcluindo.value.filter((i) => i !== id)
    } catch (e) {
      console.error(e)
      idsExcluindo.value = idsExcluindo.value.filter((i) => i !== id)
      erroAcao.value = 'Erro ao excluir o gasto. Tente novamente.'
    }
  }

  const marcarParaExcluir = (id: number | string) => {
    idsExcluindo.value = [...idsExcluindo.value, id]
    const timer = setTimeout(() => excluirDeVerdade(id), TEMPO_DE_GRACA_MS)
    timersExclusao.set(id, timer)
  }

  const desfazerExclusao = (id: number | string) => {
    const timer = timersExclusao.get(id)
    if (timer) {
      clearTimeout(timer)
      timersExclusao.delete(id)
    }
    idsExcluindo.value = idsExcluindo.value.filter((i) => i !== id)
  }
```

E no `return` do store, troque `excluirGasto,` por `transacoesVisiveis, marcarParaExcluir, desfazerExclusao,`.

Além disso, troque a definição de `totalGastosNumerico` (hoje baseada em `transacoes.value`) para basear-se em `transacoesVisiveis`, para que o total exibido no Dashboard já desconte um item que está no tempo de graça de exclusão:

```diff
-  const totalGastosNumerico = computed(() => transacoes.value.reduce((acc, t) => acc + Number(t.valor), 0))
+  const totalGastosNumerico = computed(() => transacoesVisiveis.value.reduce((acc, t) => acc + Number(t.valor), 0))
```

(Isso é seguro mesmo `transacoesVisiveis` sendo declarada mais abaixo no arquivo: `computed()` só avalia a função na primeira leitura de `.value`, que só acontece depois que a store termina de montar todas as suas declarações — o mesmo padrão de closure já usado pelo `watch` da Task 3 referenciando `buscarGastos`.)

- [ ] **Step 4: Rodar o teste e confirmar que passa**

```bash
npm test -- gastos.test
```

Expected: PASS nos 3 testes.

- [ ] **Step 5: Atualizar `LancamentosView.vue` para usar o novo fluxo**

Em `gestor-financeiro-web/src/views/LancamentosView.vue`:

1. Troque a função `excluir` por:

```ts
const excluir = (id: number | string) => {
  gastosStore.marcarParaExcluir(id)
  mostrarToast('Gasto excluído', () => gastosStore.desfazerExclusao(id))
}
```

2. Atualize `mostrarToast` para aceitar uma ação opcional de desfazer, com um tempo de exibição mais longo quando há ação:

```ts
const acaoToast = ref<(() => void) | null>(null)

const mostrarToast = (mensagem: string, acao?: () => void) => {
  toast.value = mensagem
  acaoToast.value = acao ?? null
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = null
    acaoToast.value = null
  }, acao ? 5000 : 2200)
}

const executarAcaoToast = () => {
  acaoToast.value?.()
  toast.value = null
  acaoToast.value = null
  if (toastTimer) clearTimeout(toastTimer)
}
```

3. No `<template>`, troque `v-for="gasto in gastosStore.transacoes"` por `v-for="gasto in gastosStore.transacoesVisiveis"` (e a condição do estado vazio de `gastosStore.transacoes.length === 0` para `gastosStore.transacoesVisiveis.length === 0`).

4. No toast, adicione o botão de desfazer:

```diff
       <div v-if="toast"
         class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl z-50">
-        {{ toast }}
+        <span>{{ toast }}</span>
+        <button v-if="acaoToast" @click="executarAcaoToast" class="ml-3 font-bold text-emerald-400 dark:text-emerald-600 underline underline-offset-2">
+          Desfazer
+        </button>
       </div>
```

- [ ] **Step 6: Atualizar `DashboardView.vue` para usar a lista visível**

O card de total já reflete a exclusão otimista automaticamente (via `totalGastosNumerico`, corrigido no Step 3), mas o Dashboard tem outros três lugares que ainda leem `gastosStore.transacoes` diretamente — atualize-os para `gastosStore.transacoesVisiveis`, para que um item no tempo de graça de exclusão também suma do gráfico e da contagem ao visitar o Dashboard:

```diff
-      <div v-if="gastosStore.transacoes.length > 0"
+      <div v-if="gastosStore.transacoesVisiveis.length > 0"
         v-motion :initial="{ opacity: 0, y: 12 }" :enter="{ opacity: 1, y: 0, transition: { duration: 300 } }"
         class="bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 border border-emerald-500/20 rounded-2xl p-5 flex justify-between items-center">
```

```diff
           <p class="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">Registros</p>
-          <p class="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1 font-mono">{{ gastosStore.transacoes.length }}</p>
+          <p class="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1 font-mono">{{ gastosStore.transacoesVisiveis.length }}</p>
```

```diff
-      <GraficoCategorias v-if="gastosStore.transacoes.length > 0" :transacoes="gastosStore.transacoes" />
+      <GraficoCategorias v-if="gastosStore.transacoesVisiveis.length > 0" :transacoes="gastosStore.transacoesVisiveis" />
```

```diff
-      <div v-if="gastosStore.transacoes.length === 0" class="min-h-[30vh] flex flex-col items-center justify-center text-center">
+      <div v-if="gastosStore.transacoesVisiveis.length === 0" class="min-h-[30vh] flex flex-col items-center justify-center text-center">
```

- [ ] **Step 7: Rodar o app e conferir manualmente**

```bash
npm run dev
```

Exclua um gasto na aba Lançamentos: ele deve sumir da lista na hora e mostrar "Gasto excluído · Desfazer" por 5 segundos. Clique em Desfazer dentro desse tempo → o item deve voltar. Exclua outro e espere passar os 5 segundos sem clicar → confirme (recarregando a página) que ele não volta mais. Troque para a aba Dashboard durante o tempo de graça de uma exclusão → o total e o gráfico já devem estar sem aquele item.

- [ ] **Step 8: Rodar todos os testes**

```bash
npm test
```

- [ ] **Step 9: Commit**

```bash
git add src/stores/gastos.ts src/stores/gastos.test.ts src/views/LancamentosView.vue src/views/DashboardView.vue
git commit -m "feat: exclusão de gasto com desfazer (5s de graça antes de persistir)"
```

---

### Task 10: Histórico multi-mês (`GraficoHistorico.vue`)

**Files:**
- Create: `gestor-financeiro-web/src/components/GraficoHistorico.vue`
- Modify: `gestor-financeiro-web/src/views/DashboardView.vue`

**Interfaces:**
- Consumes: `api.buscarGastos(telefone)` sem filtro de mês/ano (já suportado por `services/api.ts`), `useTema`
- Produces: componente `GraficoHistorico` com prop `telefone: string`

- [ ] **Step 1: Criar o componente**

Crie `gestor-financeiro-web/src/components/GraficoHistorico.vue`:

```vue
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import * as api from '../services/api'
import { useTema } from '../composables/useTema'
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler } from 'chart.js'
import { Line } from 'vue-chartjs'
import type { Transacao } from '../stores/gastos'

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler)

const props = defineProps<{ telefone: string }>()
const { tema } = useTema()

const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const QUANTIDADE_MESES = 6

const carregando = ref(false)
const totaisPorMes = ref<{ rotulo: string; total: number }[]>([])

function agregarUltimosMeses(transacoes: Transacao[], quantidade: number) {
  const hoje = new Date()
  const buckets: { chave: string; rotulo: string; total: number }[] = []

  for (let i = quantidade - 1; i >= 0; i--) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    buckets.push({ chave: `${data.getFullYear()}-${data.getMonth()}`, rotulo: MESES_ABREV[data.getMonth()]!, total: 0 })
  }

  const porChave = new Map(buckets.map((b) => [b.chave, b]))

  transacoes.forEach((t) => {
    const data = new Date(t.data)
    const bucket = porChave.get(`${data.getFullYear()}-${data.getMonth()}`)
    if (bucket) bucket.total += Number(t.valor)
  })

  return buckets
}

const carregar = async () => {
  if (!props.telefone) return
  carregando.value = true
  try {
    const todasTransacoes = await api.buscarGastos(props.telefone)
    totaisPorMes.value = agregarUltimosMeses(todasTransacoes, QUANTIDADE_MESES)
  } catch (e) {
    console.error(e)
    totaisPorMes.value = []
  } finally {
    carregando.value = false
  }
}

onMounted(carregar)
watch(() => props.telefone, carregar)

const dadosGrafico = computed(() => ({
  labels: totaisPorMes.value.map((b) => b.rotulo),
  datasets: [
    {
      data: totaisPorMes.value.map((b) => b.total),
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      fill: true,
      tension: 0.35,
      pointRadius: 3,
      pointBackgroundColor: '#10b981',
    },
  ],
}))

const opcoesGrafico = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { color: tema.value === 'dark' ? '#94a3b8' : '#64748b' } },
    y: {
      grid: { color: tema.value === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)' },
      ticks: { color: tema.value === 'dark' ? '#94a3b8' : '#64748b' },
    },
  },
}))
</script>

<template>
  <div class="bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 h-56">
    <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Últimos 6 meses</p>
    <div v-if="carregando" class="h-32 animate-pulse bg-slate-200/50 dark:bg-white/5 rounded-xl"></div>
    <Line v-else :data="dadosGrafico" :options="opcoesGrafico" class="!h-32" />
  </div>
</template>
```

- [ ] **Step 2: Usar no `DashboardView.vue`**

Em `gestor-financeiro-web/src/views/DashboardView.vue`, adicione o import `import GraficoHistorico from '../components/GraficoHistorico.vue'` e, logo após o `<GraficoCategorias ... />`, adicione:

```vue
<GraficoHistorico :telefone="gastosStore.telefone" />
```

- [ ] **Step 3: Rodar o app e conferir manualmente**

```bash
npm run dev
```

Abra o Dashboard: o gráfico de linha deve aparecer com os últimos 6 meses (mesmo os meses sem nenhum gasto devem aparecer no eixo X, com total zero).

- [ ] **Step 4: Rodar os testes**

```bash
npm test
```

- [ ] **Step 5: Commit**

```bash
git add src/components/GraficoHistorico.vue src/views/DashboardView.vue
git commit -m "feat: adiciona gráfico de histórico dos últimos 6 meses ao Dashboard"
```

---

### Task 11: Back-end de metas (`gestor-financeiro-api`)

**Files:**
- Modify: `gestor-financeiro-api/schema.sql`
- Create: `gestor-financeiro-api/routes/api/metas/index.js`
- Create: `gestor-financeiro-api/test/routes/api/metas.test.js`

**Interfaces:**
- Consumes: `CATEGORIAS_VALIDAS` de `lib/categorizar.js` (já existe), `fastify.db.query` (decorator já existente)
- Produces: `GET /api/metas/:telefone`, `PUT /api/metas`, `DELETE /api/metas/:telefone/:categoria`

- [ ] **Step 1: Adicionar a tabela ao schema**

Em `gestor-financeiro-api/schema.sql`, adicione ao final:

```sql

-- Tabela de metas (teto de gasto mensal por categoria), adicionada em 2026-07-11
-- para a reforma de front-end. Upsert por (telefone, categoria) — ver
-- routes/api/metas/index.js.
CREATE TABLE IF NOT EXISTS metas (
  telefone   VARCHAR(30)   NOT NULL,
  categoria  VARCHAR(50)   NOT NULL,
  valor_teto DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (telefone, categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
```

- [ ] **Step 2: Escrever os testes das rotas (falhando, pois as rotas ainda não existem)**

Crie `gestor-financeiro-api/test/routes/api/metas.test.js`:

```js
'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { build } = require('../../helper')

test('GET /api/metas/:telefone retorna as metas daquele telefone', async (t) => {
    const app = await build(t)

    app.db.query = async (sql, params) => {
        assert.match(sql, /SELECT \* FROM metas WHERE telefone = \?/)
        assert.deepStrictEqual(params, ['5511999999999'])
        return [[{ telefone: '5511999999999', categoria: 'Alimentação', valor_teto: '800.00' }]]
    }

    const res = await app.inject({ method: 'GET', url: '/api/metas/5511999999999' })
    assert.strictEqual(res.statusCode, 200)
    assert.strictEqual(res.json().length, 1)
})

test('PUT /api/metas exige telefone', async (t) => {
    const app = await build(t)

    const res = await app.inject({
        method: 'PUT',
        url: '/api/metas',
        payload: { categoria: 'Alimentação', valor_teto: 800 }
    })
    assert.strictEqual(res.statusCode, 400)
})

test('PUT /api/metas rejeita categoria inválida', async (t) => {
    const app = await build(t)

    const res = await app.inject({
        method: 'PUT',
        url: '/api/metas',
        payload: { telefone: '5511999999999', categoria: 'Categoria Inventada', valor_teto: 800 }
    })
    assert.strictEqual(res.statusCode, 400)
})

test('PUT /api/metas exige valor_teto maior que zero', async (t) => {
    const app = await build(t)

    const res = await app.inject({
        method: 'PUT',
        url: '/api/metas',
        payload: { telefone: '5511999999999', categoria: 'Alimentação', valor_teto: 0 }
    })
    assert.strictEqual(res.statusCode, 400)
})

test('PUT /api/metas faz upsert com sucesso', async (t) => {
    const app = await build(t)

    app.db.query = async (sql, params) => {
        assert.match(sql, /INSERT INTO metas .* ON DUPLICATE KEY UPDATE/s)
        assert.deepStrictEqual(params, ['5511999999999', 'Alimentação', 800, 800])
        return [{ affectedRows: 1 }]
    }

    const res = await app.inject({
        method: 'PUT',
        url: '/api/metas',
        payload: { telefone: '5511999999999', categoria: 'Alimentação', valor_teto: 800 }
    })
    assert.strictEqual(res.statusCode, 200)
    assert.strictEqual(res.json().valor_teto, 800)
})

test('DELETE /api/metas/:telefone/:categoria retorna 404 quando não encontra', async (t) => {
    const app = await build(t)

    app.db.query = async () => [{ affectedRows: 0 }]

    const res = await app.inject({ method: 'DELETE', url: '/api/metas/5511999999999/Alimentação' })
    assert.strictEqual(res.statusCode, 404)
})

test('DELETE /api/metas/:telefone/:categoria remove com sucesso', async (t) => {
    const app = await build(t)

    app.db.query = async () => [{ affectedRows: 1 }]

    const res = await app.inject({ method: 'DELETE', url: '/api/metas/5511999999999/Alimentação' })
    assert.strictEqual(res.statusCode, 200)
    assert.strictEqual(res.json().sucesso, true)
})
```

- [ ] **Step 3: Rodar os testes e confirmar que falham**

```bash
cd gestor-financeiro-api
npm test
```

Expected: FAIL nos 7 testes novos — `@fastify/autoload` ainda não encontrou uma rota em `/api/metas` (404 em vez dos códigos esperados).

- [ ] **Step 4: Implementar as rotas**

Crie `gestor-financeiro-api/routes/api/metas/index.js`:

```js
'use strict'

const { CATEGORIAS_VALIDAS } = require('../../../lib/categorizar')

module.exports = async function (fastify, opts) {
    // Lista as metas (tetos por categoria) de um telefone
    fastify.get('/:telefone', async function (request, reply) {
        const { telefone } = request.params

        try {
            const [linhas] = await fastify.db.query('SELECT * FROM metas WHERE telefone = ?', [telefone])
            return linhas
        } catch (erro) {
            fastify.log.error(erro)
            return reply.status(500).send({ erro: 'Falha ao buscar metas.' })
        }
    })

    // Cria ou atualiza o teto de uma categoria (upsert por telefone + categoria)
    fastify.put('/', async function (request, reply) {
        const { telefone, categoria, valor_teto: valorTeto } = request.body || {}

        if (!telefone) {
            return reply.status(400).send({ erro: 'Telefone é obrigatório.' })
        }

        if (!categoria || !CATEGORIAS_VALIDAS.includes(categoria)) {
            return reply.status(400).send({ erro: `Categoria inválida. Use uma de: ${CATEGORIAS_VALIDAS.join(', ')}.` })
        }

        const valorNumerico = Number(valorTeto)
        if (!valorTeto || Number.isNaN(valorNumerico) || valorNumerico <= 0) {
            return reply.status(400).send({ erro: 'valor_teto precisa ser um número maior que zero.' })
        }

        try {
            await fastify.db.query(
                'INSERT INTO metas (telefone, categoria, valor_teto) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE valor_teto = ?',
                [telefone, categoria, valorNumerico, valorNumerico]
            )
            return reply.status(200).send({ telefone, categoria, valor_teto: valorNumerico })
        } catch (erro) {
            fastify.log.error(erro)
            return reply.status(500).send({ erro: 'Falha ao salvar a meta.' })
        }
    })

    // Remove o teto de uma categoria
    fastify.delete('/:telefone/:categoria', async function (request, reply) {
        const { telefone, categoria } = request.params

        try {
            const [resultado] = await fastify.db.query(
                'DELETE FROM metas WHERE telefone = ? AND categoria = ?',
                [telefone, categoria]
            )

            if (resultado.affectedRows === 0) {
                return reply.status(404).send({ erro: 'Meta não encontrada para esta categoria.' })
            }

            return { sucesso: true, mensagem: 'Meta removida com sucesso.' }
        } catch (erro) {
            fastify.log.error(erro)
            return reply.status(500).send({ erro: 'Falha ao remover a meta.' })
        }
    })
}
```

- [ ] **Step 5: Rodar os testes e confirmar que passam**

```bash
npm test
```

Expected: todos os testes passam, incluindo os 7 novos de `metas.test.js`.

- [ ] **Step 6: Commit**

```bash
cd gestor-financeiro-api
git add schema.sql routes/api/metas/index.js test/routes/api/metas.test.js
git commit -m "feat: adiciona tabela e rotas de metas por categoria (GET/PUT/DELETE)"
```

- [ ] **Step 7: Aplicar a tabela nova em produção (manual, via SSH)**

Antes de fazer o deploy do código que consome estas rotas (Tarefa 12), conecte via SSH no servidor e rode o `CREATE TABLE` acima direto no MariaDB de produção (mesmo procedimento já usado para os índices do item 2.1.1 do `MELHORIAS.md`). Sem este passo, `PUT /api/metas` vai falhar com erro de tabela inexistente assim que o front-end começar a chamá-lo.

---

### Task 12: Front-end de metas (`stores/metas.ts`, `MetaProgressBar.vue`)

**Files:**
- Modify: `gestor-financeiro-web/src/services/api.ts`
- Create: `gestor-financeiro-web/src/stores/metas.ts`
- Create: `gestor-financeiro-web/src/components/MetaProgressBar.vue`
- Modify: `gestor-financeiro-web/src/views/DashboardView.vue`

**Interfaces:**
- Produces: `api.buscarMetas(telefone)`, `api.salvarMeta(telefone, dados)`, `api.removerMeta(telefone, categoria)`; `useMetasStore()` com `metas`, `carregando`, `erro`, `erroAcao`, `buscarMetas`, `salvarMeta`, `removerMeta`, `metaDaCategoria`; componente `MetaProgressBar` com props `categoria`, `gastoAtual`, `valorTeto?` e eventos `salvar`, `remover`

- [ ] **Step 1: Adicionar as chamadas de API**

Em `gestor-financeiro-web/src/services/api.ts`, adicione ao final:

```ts
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
```

- [ ] **Step 2: Criar o store de metas**

Crie `gestor-financeiro-web/src/stores/metas.ts`:

```ts
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

  return { metas, carregando, erro, erroAcao, buscarMetas, salvarMeta, removerMeta, metaDaCategoria }
})
```

- [ ] **Step 3: Criar `MetaProgressBar.vue`**

Crie `gestor-financeiro-web/src/components/MetaProgressBar.vue`:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { iconeDaCategoria } from '../theme/categorias'
import { formatarMoeda } from '../utils/formatarMoeda'

const props = defineProps<{
  categoria: string
  gastoAtual: number
  valorTeto?: number
}>()

const emit = defineEmits<{
  salvar: [categoria: string, valorTeto: number]
  remover: [categoria: string]
}>()

const editando = ref(false)
const valorInput = ref('')

const percentual = computed(() => {
  if (!props.valorTeto || props.valorTeto <= 0) return 0
  return (props.gastoAtual / props.valorTeto) * 100
})

const corBarra = computed(() => {
  if (percentual.value >= 100) return 'bg-red-500'
  if (percentual.value >= 80) return 'bg-amber-500'
  return 'bg-emerald-500'
})

const abrirEdicao = () => {
  valorInput.value = props.valorTeto ? String(props.valorTeto) : ''
  editando.value = true
}

const confirmar = () => {
  const valor = Number(valorInput.value.replace(',', '.'))
  if (valor > 0) {
    emit('salvar', props.categoria, valor)
    editando.value = false
  }
}

const cancelar = () => {
  editando.value = false
}

const remover = () => {
  emit('remover', props.categoria)
  editando.value = false
}
</script>

<template>
  <div class="p-3 rounded-xl bg-white/70 dark:bg-white/5 border border-slate-200/70 dark:border-white/5">
    <div class="flex items-center justify-between gap-2 mb-2">
      <span class="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
        <span>{{ iconeDaCategoria(categoria) }}</span> {{ categoria }}
      </span>
      <button v-if="!editando" @click="abrirEdicao"
        class="text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 rounded">
        {{ valorTeto ? 'Editar' : '+ Definir meta' }}
      </button>
    </div>

    <div v-if="editando" class="flex items-center gap-2 flex-wrap">
      <input v-model="valorInput" type="text" inputmode="decimal" placeholder="Teto mensal"
        class="w-28 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm rounded-lg px-2 py-1.5 outline-none focus:border-emerald-400" />
      <button @click="confirmar" class="text-xs font-bold text-emerald-600 dark:text-emerald-400 px-2 py-1.5">Salvar</button>
      <button @click="cancelar" class="text-xs font-semibold text-slate-400 px-2 py-1.5">Cancelar</button>
      <button v-if="valorTeto" @click="remover" class="text-xs font-semibold text-red-500/80 px-2 py-1.5">Remover</button>
    </div>

    <template v-else-if="valorTeto">
      <div class="h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
        <div class="h-full rounded-full transition-all duration-500" :class="corBarra" :style="{ width: Math.min(percentual, 100) + '%' }"></div>
      </div>
      <p class="text-xs text-slate-400 dark:text-slate-500 mt-1.5 font-mono">
        {{ formatarMoeda(gastoAtual) }} de {{ formatarMoeda(valorTeto) }} ({{ percentual.toFixed(0) }}%)
      </p>
    </template>

    <p v-else class="text-xs text-slate-400 dark:text-slate-600">Sem teto definido para esta categoria.</p>
  </div>
</template>
```

- [ ] **Step 4: Integrar no `DashboardView.vue`**

Em `gestor-financeiro-web/src/views/DashboardView.vue`:

1. Adicione os imports:

```ts
import { useMetasStore } from '../stores/metas'
import MetaProgressBar from '../components/MetaProgressBar.vue'
```

2. Adicione, junto às outras declarações no `<script setup>`:

```ts
const metasStore = useMetasStore()

const totalPorCategoria = computed(() => {
  const contagem: Record<string, number> = {}
  gastosStore.transacoesVisiveis.forEach((g) => {
    const cat = g.categoria || 'Outros'
    contagem[cat] = (contagem[cat] || 0) + Number(g.valor)
  })
  return contagem
})

const salvarMeta = (categoria: string, valorTeto: number) => {
  metasStore.salvarMeta(gastosStore.telefone, categoria, valorTeto)
}

const removerMeta = (categoria: string) => {
  metasStore.removerMeta(gastosStore.telefone, categoria)
}
```

3. No `onMounted` já existente, adicione a busca de metas:

```diff
 onMounted(() => {
   buscarTotalMesAnterior()
+  metasStore.buscarMetas(gastosStore.telefone)
 })
```

4. No `<template>`, logo após o `<GraficoHistorico ... />`, adicione:

```vue
<div class="space-y-2">
  <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Metas por categoria</p>
  <MetaProgressBar
    v-for="cat in Object.keys(totalPorCategoria)" :key="cat"
    :categoria="cat"
    :gasto-atual="totalPorCategoria[cat]!"
    :valor-teto="metasStore.metaDaCategoria(cat)?.valor_teto ? Number(metasStore.metaDaCategoria(cat)!.valor_teto) : undefined"
    @salvar="salvarMeta"
    @remover="removerMeta"
  />
</div>
```

- [ ] **Step 5: Rodar o app e conferir manualmente**

```bash
npm run dev
```

No Dashboard, defina uma meta para uma categoria com gastos no mês (ex: Alimentação, R$ 50), confirme que a barra aparece colorida de acordo com o percentual (verde <80%, âmbar 80–100%, vermelho ≥100%). Recarregue a página e confirme que a meta persiste (veio da API). Remova a meta e confirme que volta a mostrar "+ Definir meta".

- [ ] **Step 6: Rodar os testes**

```bash
npm test
```

- [ ] **Step 7: Commit**

```bash
git add src/services/api.ts src/stores/metas.ts src/components/MetaProgressBar.vue src/views/DashboardView.vue
git commit -m "feat: consome as rotas de metas e exibe progresso por categoria no Dashboard"
```

---

### Task 13: Exportar CSV/PDF (`services/exportar.ts`, `ExportarMenu.vue`)

**Files:**
- Create: `gestor-financeiro-web/src/services/exportar.ts`
- Create: `gestor-financeiro-web/src/services/exportar.test.ts`
- Create: `gestor-financeiro-web/src/components/ExportarMenu.vue`
- Modify: `gestor-financeiro-web/src/views/LancamentosView.vue`

**Interfaces:**
- Consumes: `MESES` de `../constants/meses` (Tarefa 7)
- Produces: `gerarCsv(transacoes): string` (pura, testada), `exportarCsv(transacoes, mes, ano): void`, `exportarPdf(transacoes, mes, ano): void` (efeitos de DOM, não testados — ver Global Constraints); componente `ExportarMenu` com props `transacoes`, `mes`, `ano`

- [ ] **Step 1: Escrever o teste da função pura de geração de CSV**

Crie `gestor-financeiro-web/src/services/exportar.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { gerarCsv } from './exportar'
import type { Transacao } from '../stores/gastos'

const transacaoExemplo = (sobrescritas: Partial<Transacao> = {}): Transacao => ({
  id: 1,
  telefone: '5511999999999',
  descricao: 'mercado',
  categoria: 'Alimentação',
  valor: 50,
  data: '2026-07-05T12:00:00.000Z',
  ...sobrescritas,
})

describe('gerarCsv', () => {
  it('inclui cabeçalho e uma linha por transação', () => {
    const csv = gerarCsv([transacaoExemplo()])
    const linhas = csv.split('\r\n')
    expect(linhas).toHaveLength(2)
    expect(linhas[0]).toBe('"Data";"Descrição";"Categoria";"Valor"')
  })

  it('formata o valor com vírgula decimal', () => {
    const csv = gerarCsv([transacaoExemplo({ valor: 1234.5 })])
    expect(csv).toContain('"1234,50"')
  })

  it('escapa aspas duplas na descrição', () => {
    const csv = gerarCsv([transacaoExemplo({ descricao: 'presente "surpresa"' })])
    expect(csv).toContain('"presente ""surpresa"""')
  })

  it('usa "Outros" quando a categoria vem vazia', () => {
    const csv = gerarCsv([transacaoExemplo({ categoria: '' })])
    expect(csv).toContain('"Outros"')
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

```bash
npm test -- exportar.test
```

Expected: FAIL — `Cannot find module './exportar'`.

- [ ] **Step 3: Implementar `services/exportar.ts`**

Crie `gestor-financeiro-web/src/services/exportar.ts`:

```ts
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Transacao } from '../stores/gastos'
import { formatarMoeda } from '../utils/formatarMoeda'
import { MESES } from '../constants/meses'

function nomeArquivo(mes: number, ano: number, extensao: string): string {
  return `gastos-${ano}-${String(mes).padStart(2, '0')}.${extensao}`
}

function baixarBlob(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  link.click()
  URL.revokeObjectURL(url)
}

// Função pura: monta o texto CSV a partir das transações, sem tocar em DOM.
// Separador ";" (não ",") porque o Excel em pt-BR usa vírgula como separador
// decimal e trataria uma vírgula de coluna como parte do número.
export function gerarCsv(transacoes: Transacao[]): string {
  const cabecalho = ['Data', 'Descrição', 'Categoria', 'Valor']
  const linhas = transacoes.map((t) => [
    new Date(t.data).toLocaleDateString('pt-BR'),
    t.descricao,
    t.categoria || 'Outros',
    Number(t.valor).toFixed(2).replace('.', ','),
  ])
  const escapar = (campo: string) => `"${campo.replace(/"/g, '""')}"`
  return [cabecalho, ...linhas].map((linha) => linha.map(escapar).join(';')).join('\r\n')
}

export function exportarCsv(transacoes: Transacao[], mes: number, ano: number) {
  const csv = gerarCsv(transacoes)
  // BOM (﻿) para o Excel reconhecer UTF-8 e não corromper acentos
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  baixarBlob(blob, nomeArquivo(mes, ano, 'csv'))
}

export function exportarPdf(transacoes: Transacao[], mes: number, ano: number) {
  const doc = new jsPDF()
  const total = transacoes.reduce((acc, t) => acc + Number(t.valor), 0)

  doc.setFontSize(14)
  doc.text(`Gestor Financeiro — ${MESES[mes - 1]} de ${ano}`, 14, 16)
  doc.setFontSize(10)
  doc.text(`Total: ${formatarMoeda(total)} · ${transacoes.length} lançamento(s)`, 14, 23)

  autoTable(doc, {
    startY: 28,
    head: [['Data', 'Descrição', 'Categoria', 'Valor']],
    body: transacoes.map((t) => [
      new Date(t.data).toLocaleDateString('pt-BR'),
      t.descricao,
      t.categoria || 'Outros',
      formatarMoeda(t.valor),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [16, 185, 129] },
  })

  doc.save(nomeArquivo(mes, ano, 'pdf'))
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

```bash
npm test -- exportar.test
```

Expected: PASS nos 4 testes.

- [ ] **Step 5: Criar `ExportarMenu.vue`**

Crie `gestor-financeiro-web/src/components/ExportarMenu.vue`:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { DropdownMenuRoot, DropdownMenuTrigger, DropdownMenuPortal, DropdownMenuContent, DropdownMenuItem } from 'reka-ui'
import { exportarCsv, exportarPdf } from '../services/exportar'
import type { Transacao } from '../stores/gastos'

const props = defineProps<{
  transacoes: Transacao[]
  mes: number
  ano: number
}>()

const aberto = ref(false)

const exportar = (formato: 'csv' | 'pdf') => {
  if (formato === 'csv') exportarCsv(props.transacoes, props.mes, props.ano)
  else exportarPdf(props.transacoes, props.mes, props.ano)
  aberto.value = false
}
</script>

<template>
  <DropdownMenuRoot v-model:open="aberto">
    <DropdownMenuTrigger
      :disabled="transacoes.length === 0"
      class="flex-shrink-0 px-4 py-2.5 rounded-2xl font-semibold text-sm text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
    >
      ⬇ Exportar
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        class="z-50 min-w-40 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl shadow-slate-900/10 dark:shadow-black/40 p-1"
        :side-offset="6"
        align="end"
      >
        <DropdownMenuItem
          class="px-3 py-2.5 rounded-xl text-sm text-slate-600 dark:text-slate-300 outline-none cursor-pointer data-[highlighted]:bg-slate-900/5 dark:data-[highlighted]:bg-white/5"
          @select="exportar('csv')"
        >
          📄 CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          class="px-3 py-2.5 rounded-xl text-sm text-slate-600 dark:text-slate-300 outline-none cursor-pointer data-[highlighted]:bg-slate-900/5 dark:data-[highlighted]:bg-white/5"
          @select="exportar('pdf')"
        >
          📕 PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
```

- [ ] **Step 6: Integrar no `LancamentosView.vue`**

Em `gestor-financeiro-web/src/views/LancamentosView.vue`, adicione o import `import ExportarMenu from '../components/ExportarMenu.vue'` e troque o bloco do botão "+ Novo gasto" (quando `!adicionandoAberto`) para ficar lado a lado com o menu de exportar:

```diff
-      <!-- Adicionar gasto pelo portal -->
-      <div v-if="!adicionandoAberto" class="mb-2">
-        <button id="btn-novo-gasto" @click="abrirNovoGasto"
-          class="w-full py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60">
-          + Novo gasto
-        </button>
-      </div>
+      <!-- Adicionar gasto pelo portal + exportar -->
+      <div v-if="!adicionandoAberto" class="flex gap-2 mb-2">
+        <button id="btn-novo-gasto" @click="abrirNovoGasto"
+          class="flex-1 py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60">
+          + Novo gasto
+        </button>
+        <ExportarMenu :transacoes="gastosStore.transacoesVisiveis" :mes="gastosStore.filtroMes" :ano="gastosStore.filtroAno" />
+      </div>
```

- [ ] **Step 7: Rodar o app e conferir manualmente**

```bash
npm run dev
```

Com gastos no mês filtrado, clique em "Exportar" → CSV: confirme que baixa um arquivo `gastos-AAAA-MM.csv` que abre corretamente no Excel/Sheets (acentos preservados, valores com vírgula). Exportar → PDF: confirme que baixa um PDF com a tabela formatada e o total no topo. Sem nenhum gasto no mês, o botão "Exportar" deve ficar desabilitado.

- [ ] **Step 8: Rodar todos os testes**

```bash
npm test
npm run build
```

- [ ] **Step 9: Commit**

```bash
git add src/services/exportar.ts src/services/exportar.test.ts src/components/ExportarMenu.vue src/views/LancamentosView.vue
git commit -m "feat: exportar lançamentos do período em CSV ou PDF"
```

---

### Task 14: Validação final (visual + testes completos)

**Files:** nenhum arquivo de produto — só um script temporário de apoio, não commitado.

**Interfaces:** nenhuma nova; esta tarefa verifica o comportamento de todas as anteriores em conjunto.

- [ ] **Step 1: Rodar a suíte de testes completa dos dois repositórios**

```bash
cd gestor-financeiro-web && npm test && npm run build
cd ../gestor-financeiro-api && npm test
```

Expected: 100% verde nos dois. Se algo falhar, volte à tarefa correspondente antes de continuar.

- [ ] **Step 2: Criar o script temporário de validação visual**

Crie `gestor-financeiro-web/scripts-tmp-qa.mjs` (fora do controle de versão — não faça `git add` deste arquivo; delete-o ao final desta tarefa):

```js
// Script temporário de validação visual. NÃO commitar.
// Requer: npx playwright install chromium (uma vez) e o `npm run dev` rodando
// em outro terminal, com a API real acessível via VITE_API_URL ou mockada.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE_URL = process.env.QA_BASE_URL || 'http://localhost:5173'
const PASTA = 'qa-screenshots'
mkdirSync(PASTA, { recursive: true })

const cenarios = [
  { rota: '/', nome: 'login' },
]

const viewports = [
  { nome: 'mobile', width: 390, height: 844 },
  { nome: 'desktop', width: 1440, height: 900 },
]

const temas = ['dark', 'light']

const erros = []

const browser = await chromium.launch()

for (const tema of temas) {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    page.on('console', (msg) => {
      if (msg.type() === 'error') erros.push(`[${tema}/${viewport.nome}] console error: ${msg.text()}`)
    })
    page.on('pageerror', (err) => erros.push(`[${tema}/${viewport.nome}] page error: ${err.message}`))

    await page.goto(BASE_URL)
    await page.evaluate((t) => localStorage.setItem('gestor_tema', t), tema)
    await page.reload()

    for (const cenario of cenarios) {
      await page.goto(`${BASE_URL}${cenario.rota}`)
      await page.waitForTimeout(300)
      await page.screenshot({ path: `${PASTA}/${cenario.nome}-${tema}-${viewport.nome}.png` })
    }

    await context.close()
  }
}

await browser.close()

if (erros.length > 0) {
  console.error('Erros de console encontrados:')
  erros.forEach((e) => console.error(' -', e))
  process.exit(1)
}

console.log(`OK — screenshots salvas em ${PASTA}/`)
```

- [ ] **Step 3: Rodar o script contra o fluxo autenticado manualmente**

O script acima cobre só a tela de Login (não autenticada) de forma automática, porque autenticar exige receber um PIN de verdade por WhatsApp. Para as telas autenticadas (Dashboard e Lançamentos), faça manualmente com o DevTools do navegador aberto (Console sem erros vermelhos) nas 8 combinações: {Dashboard, Lançamentos} × {claro, escuro} × {mobile 390px, desktop 1440px}. Para cada uma, confira:
- Dashboard: total, comparativo, gráfico de categorias, gráfico de histórico, metas (com e sem teto definido) aparecem corretamente.
- Lançamentos: lista, edição inline, "+ Novo gasto", exportar (CSV e PDF), exclusão com desfazer.
- 404: acessar uma rota inexistente continua caindo em `NotFoundView.vue`.

```bash
cd gestor-financeiro-web
npx --yes playwright install chromium
npm run dev &
node scripts-tmp-qa.mjs
```

Expected: script termina com `OK` e sem nenhum erro de console listado; inspeção manual das 8 combinações não encontra nada quebrado.

- [ ] **Step 4: Remover o script temporário**

```bash
rm gestor-financeiro-web/scripts-tmp-qa.mjs
rm -rf gestor-financeiro-web/qa-screenshots
```

- [ ] **Step 5: Conferir que não sobrou nada para commitar indevidamente**

```bash
git status --short
```

Expected: nenhum resquício do script/screenshots de QA aparece (ambos já deletados no Step 4).

Nenhum commit nesta tarefa — ela é só verificação. Se algo falhar, volte à tarefa correspondente, corrija, e rode esta validação de novo.

---

## Self-Review

**Cobertura da spec:** arquitetura/navegação (Tarefas 3, 7), tokens visuais (Tarefa 2), libs novas (Tarefa 1), telas Login/Dashboard/Lançamentos (Tarefas 7, 8), metas (Tarefas 11, 12), histórico (Tarefa 10), exportar (Tarefa 13), desfazer exclusão (Tarefa 9), testes/validação (todas as tarefas + Tarefa 14), deploy (nota na Tarefa 11, Step 7 — nenhuma mudança de processo, só o lembrete da tabela manual). Todas as seções da spec aprovada têm tarefa correspondente.

**Placeholders:** nenhum "TBD"/"implementar depois" — toda tarefa tem código completo e comandos exatos.

**Consistência de tipos:** `Transacao` (de `stores/gastos.ts`) é o único tipo de transação usado em todas as tarefas (`GraficoCategorias`, `GastoItem`, `GraficoHistorico`, `services/exportar.ts`). `Meta` (de `stores/metas.ts`) usa `valor_teto` (snake_case) espelhando a coluna do banco e o corpo JSON da API, sem camada de conversão — mesma convenção que `Transacao` já usa para `descricao`/`categoria`/`valor`. `DadosEdicaoGasto` (de `services/api.ts`) é reusado sem alteração entre `GastoItem.vue`, `LancamentosView.vue` e o store. `gastosStore.transacoesVisiveis` (Tarefa 9) é a única fonte usada onde exclusão otimista importa — `DashboardView.vue` (total, registros, gráfico, metas) e `ExportarMenu` já leem dela, não de `transacoes` bruta.

**Duplicação evitada no pré-flight:** o array `MESES` (nomes de mês em português) apareceria 3 vezes se cada tarefa declarasse o seu — extraído para `src/constants/meses.ts` na Tarefa 7 (primeiro consumidor) e reusado por `DashboardView.vue` (mesma tarefa) e `services/exportar.ts` (Tarefa 13).
