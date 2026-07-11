# Reforma completa do front-end — identidade "fintech premium" + novas funcionalidades

> Spec de design, resultado de sessão de brainstorming em 2026-07-11. Cobre `gestor-financeiro-web` (redesenho total) e uma extensão pequena e pontual em `gestor-financeiro-api` (endpoint de metas). Próximo passo após aprovação: `writing-plans` gera o plano de implementação.

## Contexto e objetivo

O front-end já passou por uma reforma visual completa em 2026-07-08 (ver `MELHORIAS.md`, item 4.2 do repositório `gestor-financeiro-web`): tema claro/escuro, cores fixas por categoria, skeleton loader, toast, OTP em caixas. Este novo pedido não é continuação daquele polimento — é um **redesenho do zero** da identidade visual, buscando um patamar mais "premium" (referência: Mercury, Linear, Revolut), acompanhado de um conjunto pontual de funcionalidades novas decidido junto com o usuário durante o brainstorming.

Objetivo: elevar a percepção de qualidade do produto (hoje 3 telas simples) para algo com cara de produto financeiro sério, sem abrir mão da simplicidade de manutenção que o projeto sempre teve — é um projeto pessoal, hospedado num celular Android via Termux, sem CI/CD, com deploy manual.

## Escopo

**Dentro do escopo:**
- Redesenho visual completo das 3 telas/fluxos existentes (Login por PIN, painel de gastos, 404), com nova arquitetura de informação em abas.
- 4 funcionalidades novas, decididas explicitamente com o usuário: metas de gasto por categoria, comparativo histórico multi-mês, exportar período (CSV/PDF), desfazer exclusão.
- Extensão mínima do back-end (`gestor-financeiro-api`) para sustentar metas (1 tabela nova + 1 conjunto de rotas).

**Fora do escopo (backlog para conversa futura, não implementar agora):**
- Busca/filtro por descrição na lista de lançamentos.
- Multiusuário/família, PWA instalável, notificações push, classificação por IA — nenhum desses foi pedido nesta rodada; ver `MELHORIAS.md` para itens já registrados como "reavaliar se o projeto crescer".
- JWT substituindo telefone em `localStorage` (item 1.4 etapa 2 do `MELHORIAS.md`) — segue como pendência separada, não é parte de UI/UX.

## Arquitetura e navegação

Hoje: 3 rotas soltas (`/`, `/gastos`, `/:pathMatch(.*)*`), cada view com seu próprio cabeçalho duplicado.

Nova estrutura:
- `layouts/AppShell.vue` (novo): cabeçalho compartilhado (logo, telefone formatado, toggle de tema, botão sair) + tab bar de navegação (`Dashboard` / `Lançamentos`). Elimina a duplicação de cabeçalho entre telas.
- Rotas:
  - `/` → `LoginView.vue` (mantida, mesma lógica de PIN via WhatsApp)
  - `/painel` → `DashboardView.vue` (novo destino pós-login, antes era `/gastos`)
  - `/lancamentos` → `LancamentosView.vue`
  - `/:pathMatch(.*)*` → `NotFoundView.vue` (mantida)
- `GastosView.vue` atual é decomposta em `DashboardView.vue` + `LancamentosView.vue`, cada uma com responsabilidade única.

### Dependências novas

Todas puramente JavaScript — sem binários nativos, sem risco para o fluxo de build local (lembrando: o build roda na máquina de desenvolvimento porque o Termux/Bionic quebra binários nativos do Vite como `esbuild`/`rollup` — isso não muda aqui).

| Lib | Uso | Por quê |
|---|---|---|
| `@vueuse/motion` | Microinterações e transições declarativas | Unifica a "motion language" hoje espalhada em `<Transition>` ad-hoc por componente |
| `reka-ui` (headless, ex-Radix Vue) | Tabs acessível (nav Dashboard/Lançamentos), Listbox (troca `<select>` nativo de categoria) | Componentes acessíveis prontos, sem reinventar teclado/ARIA |
| `jspdf` + `jspdf-autotable` | Exportar PDF | Geração de tabela formatada no cliente, sem back-end |

CSV não precisa de lib (Blob + join de string). Chart.js/`vue-chartjs` são mantidos; só é preciso registrar `LineElement`/`PointElement`/mais escalas para o gráfico de histórico novo.

Trade-off aceito: ~3 dependências novas leves e bem mantidas, aumento de bundle estimado em dezenas de KB (gzip) — considerado razoável frente ao ganho de UX e sem custo de manutenção desproporcional.

## Identidade visual (design tokens)

- **Cor primária**: mantém verde-esmeralda (já validado contra daltonismo — CVD — pela skill de dataviz, e já carrega associação semântica com dinheiro). Não há motivo para trocar só por trocar.
- **Fundo escuro**: troca de `slate-900` (`#0f172a`) para um quase-preto próprio (~`#0a0b0f`), buscando mais contraste e profundidade — visual mais próximo de Mercury/Linear do que o "navy" padrão do Tailwind. Tema claro continua branco/off-white, com mais espaço em branco.
- **Tipografia**: self-host de Geist Sans (títulos e UI) e Geist Mono (valores monetários e telefone — números tabulares alinhados é um detalhe clássico de interface financeira). Troca a stack padrão do Tailwind; é a alavanca de maior impacto percebido em "parecer premium". Self-hosted (sem CDN externo) — sem novo ponto de falha de rede.
- **Cores por categoria**: sem alteração — já validadas cientificamente e não fazem parte do problema que este redesenho ataca.
- **Elevação**: cards ganham sombra sutil em camada, além da borda que já existe hoje (hoje é borda flat só). Uso de glass/blur (já usado no card de login) se estende com intenção ao card de metas em destaque.
- **Motion**: uma curva de easing única via `@vueuse/motion`, substituindo as transições ad-hoc. `prefers-reduced-motion` continua respeitado (já existe o padrão em `App.vue`, mantém).

## Telas e componentes

### Login (`LoginView.vue`)
Zero mudança funcional (telefone → PIN via WhatsApp, seletor de país, `OtpInput.vue` mantidos). Só recebe os tokens visuais novos e a motion unificada no lugar das transições manuais.

### Dashboard (`DashboardView.vue`, rota `/painel`)
- Stat tile de total + comparativo percentual vs. mês anterior (migrado sem mudança de lógica).
- Gráfico de categorias (doughnut) — extraído para `components/GraficoCategorias.vue` (hoje inline na view).
- **Novo** — histórico multi-mês (`components/GraficoHistorico.vue`, gráfico de linha): busca todos os gastos do telefone sem filtro de mês/ano (endpoint já existente, `GET /api/gastos/:telefone` sem query params) e agrega no cliente por mês, cobrindo os últimos 6 meses. Com o volume atual (18 registros em produção), não há problema de performance; se o volume crescer muito, valeria revisar para um endpoint agregado no futuro — não é necessário agora.
- **Novo** — metas por categoria (`components/MetaProgressBar.vue`): barra de progresso (gasto do mês / teto definido), cor verde/âmbar/vermelho conforme percentual atingido. Categoria sem meta definida mostra CTA "Definir meta". Clique abre edição inline do valor do teto.

### Lançamentos (`LancamentosView.vue`, rota `/lancamentos`)
- Seletor de mês e botão "+ Novo gasto" (mantidos, mesma lógica).
- **Novo** — menu de exportar (`components/ExportarMenu.vue`): CSV ou PDF do período filtrado atual, usando `services/exportar.ts` (lógica pura de montagem do CSV/PDF a partir das transações já carregadas — sem chamada nova à API, sem dependência do DOM, testável isoladamente).
- Lista de lançamentos extraída para `components/GastoItem.vue` (hoje inline no `v-for`), mantendo edição inline.
- **Novo** — exclusão com desfazer: ao clicar excluir, o item some da lista imediatamente (otimista) e aparece um toast "Excluído · Desfazer" por ~5 segundos. Se o usuário clicar em "Desfazer", o item volta pra lista sem nenhuma chamada à API ter sido feita. Se o tempo expirar sem ação, aí sim dispara o `DELETE` de verdade. Precisa de uma fila de exclusões pendentes no store (`gastos.ts`), com um temporizador por id.

### Novos arquivos (resumo)
`layouts/AppShell.vue`, `views/DashboardView.vue`, `views/LancamentosView.vue`, `components/GraficoCategorias.vue`, `components/GraficoHistorico.vue`, `components/MetaProgressBar.vue`, `components/GastoItem.vue`, `components/ExportarMenu.vue`, `stores/metas.ts`, `services/exportar.ts`.

## Back-end: metas de gasto (`gestor-financeiro-api`)

### Schema novo
Tabela `metas` em `schema.sql`:
```sql
CREATE TABLE IF NOT EXISTS metas (
  telefone   VARCHAR(30)   NOT NULL,
  categoria  VARCHAR(50)   NOT NULL,
  valor_teto DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (telefone, categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
```
Aplicada em produção manualmente via SSH (mesmo padrão já usado para os índices do item 2.1.1 do `MELHORIAS.md`) — o projeto não tem ferramenta de migration, e não é este o momento de introduzir uma só por causa de 1 tabela.

### Rotas novas (`routes/api/metas/index.js`)
Seguem o mesmo padrão de validação já usado em `routes/api/gastos/index.js` (telefone obrigatório, categoria validada contra `CATEGORIAS_VALIDAS` de `lib/categorizar.js`):
- `GET /api/metas/:telefone` — lista as metas do telefone.
- `PUT /api/metas` — upsert (`INSERT ... ON DUPLICATE KEY UPDATE`) de `{ telefone, categoria, valor_teto }`.
- `DELETE /api/metas/:telefone/:categoria` — remove a meta (categoria volta a não ter teto definido).

### Front-end consumindo
`services/api.ts` ganha `buscarMetas`, `salvarMeta`, `removerMeta`. `stores/metas.ts` é um store Pinia novo, no mesmo formato de `stores/gastos.ts` (estado + `erro`/`erroAcao` para banners de erro pontual, mesmo padrão já estabelecido).

## Testes e validação

Segue a mesma prática já estabelecida nos itens 4.1/4.2 do `MELHORIAS.md`:
- `gestor-financeiro-api`: `test/routes/api/metas.test.js`, mockando `fastify.db`, mesmo padrão de `test/routes/api/gastos.test.js`.
- `gestor-financeiro-web`: teste unitário de `services/exportar.ts` (lógica pura, sem DOM).
- Validação visual via Playwright (headless, API mockada): Login, Dashboard (com e sem metas definidas, com e sem histórico), Lançamentos (vazio/carregando/erro/populado, incluindo o fluxo de exportar e o de desfazer exclusão), 404 — cruzando mobile (390px) e desktop (1440px) × tema claro e escuro. Matriz maior que a da reforma anterior por causa das duas abas novas, mas o método é o mesmo.
- `npm test` deve continuar 100% verde nos dois repositórios antes de considerar o trabalho concluído.

## Deploy

Fluxo não muda: `deploy.sh` builda o front-end localmente, copia para `public/` da API, faz commit + `git push` para o remote `prod` (bare repo no celular), o hook `post-receive` atualiza os arquivos e reinicia o `gestor-bot` via PM2. Dois pontos de atenção específicos desta reforma:
1. A rota nova de metas na API também precisa do deploy de código de sempre (não é automático só por estar no repositório).
2. A tabela `metas` precisa ser criada manualmente no MariaDB de produção (via SSH) **antes** do primeiro uso da funcionalidade — se esquecido, as chamadas a `/api/metas` vão falhar com erro de tabela inexistente.

## Riscos e trade-offs assumidos

- 3 dependências novas (`@vueuse/motion`, `reka-ui`, `jspdf`+`jspdf-autotable`) aumentam levemente o bundle e a superfície de manutenção — aceito porque são bem mantidas, puramente JS (sem risco de build no ambiente Termux) e cada uma resolve um problema real de UX que não seria razoável reimplementar do zero.
- Histórico multi-mês busca todos os gastos do telefone sem filtro — aceitável no volume atual (~18 registros); se o volume crescer muito, revisar para agregação no servidor (não é necessário agora).
- Nenhuma mudança nesta reforma toca autenticação (PIN em memória, sem cluster), backup do banco, ou a infraestrutura do celular — todos fora de escopo, tratados em outras seções do `MELHORIAS.md`.
