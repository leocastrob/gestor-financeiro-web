# Revisão de UX/UI e features novas — `gestor-financeiro-web` (2026-07-12)

> **Status (2026-07-12, mesmo dia):** todos os achados foram implementados nesta sessão, exceto o #2 (mantido como está, por decisão explícita do usuário). Ver seção "Status de implementação" ao final.

> Revisão de código (Fase A do plano) cobrindo as 7 views e os 10 componentes reutilizáveis. Não inclui verificação visual manual no navegador (Fase B) — nenhuma ferramenta de screenshot/browser estava disponível nesta sessão; os itens marcados como "confirmar visualmente" precisam de um `npm run dev` + inspeção manual (claro/escuro × mobile/desktop) antes de virarem tarefa de implementação.

## Resumo executivo

7 achados de severidade Alta (2 deles seriam Bloqueador se fosse produto para terceiros — aqui tratados como Alto por ser projeto pessoal, mas envolvem perda de controle sobre dado financeiro), 4 Médios, 2 Baixos. O padrão mais claro: **as features implementadas fora do processo formal (Dívidas, Contas Fixas, Categorias Personalizadas — conforme o próprio `PROJETO.md` já registra) são consistentemente as que ficaram para trás em feedback (toast/desfazer), motion e completude de CRUD**, enquanto Lançamentos/Dashboard/Importar (que passaram pela reforma com spec formal) estão sólidos.

Nenhum destes itens foi corrigido — é relatório de revisão, conforme escopo combinado. Prioridade sugerida de implementação: #1, #2 e #4 primeiro (risco real de o usuário perder controle sobre dado ou agir sobre uma tela que não faz o que parece fazer), depois #3 e #6.

---

## Achados — Alto impacto

### 1. Excluir dívida ou conta fixa é imediato e permanente, sem confirmação nem desfazer
**Onde:** `src/components/DividaItem.vue:103`, `src/components/ContaFixaItem.vue:106`, `src/views/DividasView.vue:86-88`, `src/views/ContasFixasView.vue:88-90`

O botão 🗑️ dispara `emit('excluir', id)` direto para o store, que chama a API na hora. Não há `window.confirm`, modal de confirmação nem grace period — diferente de `LancamentosView.vue`, que tem toast "Excluído · Desfazer" por 5s (`stores/gastos.ts:142-155`). Cancelar uma dívida parcelada em andamento ou uma conta fixa recorrente é uma ação de maior consequência financeira que apagar um gasto avulso, mas tem *menos* proteção.

**Sugestão:** aplicar o mesmo padrão de `marcarParaExcluir`/`desfazerExclusao` já existente em `stores/gastos.ts` aos stores `dividas.ts` e `contasFixas.ts` — a lógica já está pronta e testada, é replicar o padrão, não inventar um novo.

### 2. Meta de categoria sem gasto no mês some da tela — sem forma de editar ou remover
**Onde:** `src/views/DashboardView.vue:150-157` (itera `Object.keys(totalPorCategoria)`), `src/stores/metas.ts` (mantém a lista completa de metas, independente de haver gasto no mês)

`MetaProgressBar` só é renderizado para categorias que têm ao menos uma despesa lançada **no mês em exibição**. `metasStore.metas` guarda todas as metas do usuário, mas a view nunca itera sobre essa lista — só sobre as categorias com gasto. Resultado: o usuário define um teto para "Lazer", não gasta nada em Lazer naquele mês (o que é o comportamento desejável!), e a meta simplesmente desaparece da tela — sem barra, sem "0%", sem botão de editar/remover. Só volta a aparecer se ele gastar algo na categoria de novo.

**Sugestão:** unir as duas fontes — iterar sobre `Set([...Object.keys(totalPorCategoria), ...metasStore.metas.map(m => m.categoria)])`, passando `gastoAtual: 0` para categorias sem lançamento no mês.

### 3. Erro de criar categoria personalizada usa `alert()` nativo do navegador
**Onde:** `src/components/CategoriaSelect.vue:62`

```ts
alert(categoriasStore.erro || 'Erro ao criar categoria.')
```

Todo o resto do app usa banners estilizados (`bg-red-500/10 border-red-500/20 ...`) para erro de ação — esse é o único ponto que usa o dialog nativo do SO, que trava a interação e destoa completamente da identidade visual "fintech premium" da reforma.

**Sugestão:** reaproveitar o padrão de banner de erro já usado em `LancamentosView`/`DashboardView`/`DividasView`/`ContasFixasView` (`erroAcao` renderizado como banner dispensável) dentro do próprio modal do `CategoriaSelect`.

### 4. Seletor de mês do `AppShell` aparece (e funciona) em telas que não são filtradas por mês
**Onde:** `src/layouts/AppShell.vue:100-113`

O bloco do seletor `‹ Mês de Ano ›` é renderizado incondicionalmente para todas as 5 abas. Mas `DividasView`, `ContasFixasView` e `ImportarExtratoView` não usam `filtroMes`/`filtroAno` em nenhum lugar — `buscarDividas`/`buscarContas` recebem só o telefone. Ainda assim, clicar em ‹ / › nessas telas altera `gastosStore.filtroMes` (estado compartilhado), o que dispara `watch([filtroMes, filtroAno], buscarGastos)` em segundo plano — uma busca de gastos inteira, sem efeito visível na tela em que o usuário está. Além do trabalho desperdiçado, é confuso: o cabeçalho sugere que dívidas/contas fixas/importação são "do mês", o que não é verdade.

**Sugestão:** mover o seletor de mês para dentro de `DashboardView`/`LancamentosView` (via slot nomeado ou prop `mostrarSeletorMes` no `AppShell`), em vez de renderizar globalmente para as 5 abas.

---

## Achados — Médio impacto

### 5. Toast de "Desfazer" é global — exclusões simultâneas perdem a opção de reverter
**Onde:** `src/views/LancamentosView.vue:85-104`

`toast`/`acaoToast` são um único par de refs por view. Excluir o lançamento A e, dentro de 5s, excluir o lançamento B: o toast de B substitui o de A silenciosamente — A continua com seu próprio timer rodando e será excluído de verdade sem que o usuário tenha mais como desfazê-lo pela UI (o `clearTimeout` só é acionado pelo clique em "Desfazer", que agora aponta só para B).

**Sugestão:** fila de toasts (mesmo que empilhados, um por exclusão pendente) em vez de um único slot; ou, mais simples, listar as exclusões pendentes por id com botão de desfazer individual.

### 6. Categorias personalizadas: feature incompleta confirmada
**Onde:** `src/stores/categorias.ts`, grep por `removerCategoria`/`useCategoriasStore` em `.vue`

`removerCategoria` existe no store mas não é chamada por nenhum componente do projeto (confirmado). Não existe função de editar sequer no store (teria que ser criada do zero, incluindo endpoint novo na API se não existir `PATCH /api/categorias/:id`). Categorias personalizadas aparecem sempre cinza nos gráficos (`GraficoCategorias.vue`/`theme/categorias.ts` não têm entrada de cor para elas). Não há aba ou rota dedicada — é a única feature "embutida" dentro do fluxo de outra tela. Confirma o que o `PROJETO.md` já registrava.

### 7. `ImportarExtratoView`: transição para "preview" sem estado de carregamento
**Onde:** `src/views/ImportarExtratoView.vue:70-89`

`enviarPreview()` seta `etapa.value = 'preview'` **antes** do `await api.previewExtrato(...)`. O template already mudou de bloco (etapa 'upload' → 'preview') e o card de estatísticas fica exibindo campos vazios (via optional chaining) até a resposta chegar — sem skeleton nem spinner, diferente do padrão usado no resto do fluxo (etapa "importando" tem spinner dedicado).

**Sugestão:** só trocar `etapa.value` depois que os dados chegarem (dentro do `try`, após `preview.value = ...`), ou manter etapa 'upload' com um overlay de carregamento até a resposta.

### 8. Consistência de motion e cor entre features novas
**Onde:** comparar `DashboardView.vue`/`ImportarExtratoView.vue` (usam `v-motion`) com `DividasView.vue`/`ContasFixasView.vue` (nenhuma transição de entrada)

Reforça o padrão do achado #1/#6: as duas telas implementadas fora do processo formal da reforma não receberam a mesma atenção de motion language unificada que a spec de design pedia. Separadamente, o esquema de cor por feature (emerald = Dashboard/Lançamentos, violet = Dívidas/Importar, amber = Contas Fixas) parece intencional e funciona bem como categorização visual, mas não está registrado como decisão em nenhum documento — vale formalizar (mesmo que só em `MELHORIAS.md`/`PROJETO.md`) para não virar escolha arbitrária na próxima feature.

---

## Achados — Baixo impacto

### 9. Botões só-ícone dependem só de `title`, sem `aria-label`
**Onde:** `DividaItem.vue` (⏩✏️🗑️), `ContaFixaItem.vue` (✅✏️🗑️), `GastoItem.vue` (SVGs de editar/excluir)

`title` vira tooltip visual, mas não é garantia de bom anúncio por leitor de tela (e emojis podem ser lidos de forma inconsistente entre plataformas). `AppShell.vue` e `ThemeToggle.vue`, em contraste, já usam `aria-label` corretamente — vale replicar o mesmo padrão nesses componentes.

### 10. Card "arquivo" na etapa de preview usa estilo de número grande para texto
**Onde:** `ImportarExtratoView.vue:216-219`

`nomeArquivoExibido` é renderizado com `text-2xl font-black font-mono` (mesmo estilo do número `totalLinhas` ao lado) e sem `truncate` — nome de arquivo longo (comum em extratos bancários, ex. `extrato-nubank-conta-corrente-julho-2026.csv`) pode quebrar o grid de 2 colunas ou vazar do card.

### 11. `PROJETO.md` cita um problema de lint que não existe mais
**Onde:** seção final do `PROJETO.md` ("Lint quebrado no frontend agora")

`grep -rn ": any"` no projeto não retorna nada, e `npm run lint:eslint` roda limpo — os 3 `catch` em `stores/categorias.ts` já usam `catch (e)` sem anotação. Achado não é de UI, mas vale corrigir o registro do documento para não induzir a próxima pessoa a "resolver" algo que já foi resolvido.

### 12. Campo de emoji da categoria personalizada sem preview
**Onde:** `CategoriaSelect.vue:135-141`

Campo de texto livre para o ícone, sem exibir como ele vai aparecer no restante do app (badge de categoria, gráfico) antes de confirmar — usuário só vê o resultado final depois de já ter salvo.

---

## Nota à parte (fora do escopo de UI/UX, mas adjacente a dado pessoal)

O app guarda o telefone do usuário em `localStorage` sem token de sessão real (a API confia no telefone enviado no corpo/params) — já registrado como pendência conhecida no `PROJETO.md`. Não é um problema de interface, mas por lidar com dado pessoal (telefone) e dado financeiro, vale manter essa pendência visível da próxima vez que segurança/autenticação entrar em pauta — não é ação decorrente desta revisão de UX/UI.

---

## Próximos passos sugeridos

1. Validar visualmente (Fase B do plano) os achados implementados que dependem de "como fica na tela" — nenhuma ferramenta de browser/screenshot esteve disponível nesta sessão para confirmar automaticamente.
2. ~~Decidir com o usuário quais achados viram tarefas de implementação~~ — feito, ver status abaixo.

## Status de implementação (2026-07-12)

| # | Achado | Status | O que foi feito |
|---|---|---|---|
| 1 | Excluir dívida/conta fixa sem confirmação | **Feito** | `confirm()` nativo antes de excluir, em `DividasView.vue` e `ContasFixasView.vue`. Por pedido explícito do usuário, ficou como confirmação simples — não o padrão completo de desfazer com toast/grace-period de `stores/gastos.ts` (fica registrado como opção futura se quiser nivelar). |
| 2 | Meta sem gasto no mês some da tela | **Mantido como está** | Decisão explícita do usuário — não implementado. |
| 3 | `alert()` nativo ao criar categoria | **Feito** | Banner de erro estilizado dentro do modal do `CategoriaSelect.vue`, no mesmo padrão do resto do app. |
| 4 | Seletor de mês aparece fora de telas com filtro de mês | **Feito** | `AppShell.vue` só renderiza o seletor de mês nas abas Dashboard/Lançamentos (`mostrarSeletorMes`). |
| 5 | Toast de desfazer é global (segunda exclusão apaga a primeira) | **Feito** | `LancamentosView.vue` passou a usar uma fila de toasts (`TransitionGroup`), cada exclusão pendente com seu próprio "Desfazer". |
| 6 | Categorias personalizadas incompleta | **Feito (completo)** | Endpoint `PATCH /api/categorias/:id` novo na API (+ 5 testes, mesmo padrão de `contas-fixas`/`dividas`) · `stores/categorias.ts` ganhou `editarCategoria` · cor própria por hash do nome em `theme/categorias.ts` (paleta separada das 8 cores fixas) · nova tela dedicada `CategoriasView.vue` + `CategoriaPersonalizadaItem.vue` (criar/editar/excluir, com confirmação) · nova aba "🏷️ Categorias" no `AppShell` e rota `/categorias`. Nenhuma alteração de schema foi necessária (não usa coluna nova, só `nome`/`icone` já existentes) — sem passo manual de banco em produção. |
| 7 | `ImportarExtratoView` pula para preview sem loading | **Feito** | `etapa.value` só muda depois que a resposta da API chega. |
| 8 | Motion inconsistente entre features formais/informais | **Feito (parcial)** | `v-motion` de entrada adicionado ao cabeçalho de `DividasView.vue`/`ContasFixasView.vue`, igual ao Dashboard. O esquema de cor por feature (emerald/violet/amber) não foi formalmente documentado em outro lugar — ficou só registrado aqui. |
| 9 | Botões só-ícone sem `aria-label` | **Feito** | `aria-label` adicionado em `DividaItem.vue`, `ContaFixaItem.vue` e `GastoItem.vue`, espelhando o `title` já existente. |
| 10 | Card de nome de arquivo com estilo de número, sem truncar | **Feito** | `ImportarExtratoView.vue`: fonte menor, `truncate` + `title` com o nome completo. |
| 11 | `PROJETO.md` com nota de lint desatualizada | **Feito** | Linha corrigida, com nota de que já foi verificado. |
| 12 | Campo de emoji sem preview | **Feito** | Preview ao vivo do badge (ícone + nome) abaixo dos campos, no modal de nova categoria. |

**Consequência do #6 para o processo de deploy:** a rota nova (`PATCH /api/categorias/:id`) precisa do deploy de código de sempre na API — não é automático só por estar no repositório (mesmo aviso já registrado na spec da reforma para a rota de metas). Nenhum passo manual de schema é necessário desta vez.

**Verificação rodada nesta sessão:** `npm test` (28 testes) + `npm run lint:eslint` + `vue-tsc --build` + `npm run build` em `gestor-financeiro-web`, e `npm test` (74 testes) em `gestor-financeiro-api` — todos verdes antes e depois das mudanças. Não houve verificação visual manual no navegador (sem ferramenta de browser disponível nesta sessão).

---

## Segunda passada — revisão do código novo criado nesta sessão (2026-07-12)

O código escrito para implementar o #6 (`CategoriasView.vue`, `CategoriaPersonalizadaItem.vue`, `stores/categorias.ts`, `CategoriaSelect.vue`) nunca tinha passado pelo mesmo checklist da Fase A — foi aplicado o mesmo processo de revisão nele, já que é UI nova tão sujeita a inconsistência quanto qualquer feature anterior.

### Achado corrigido

**`stores/categorias.ts` usava um único `erro` para falha de carregamento e falha de ação** — diferente do padrão já estabelecido em `stores/gastos.ts`/`dividas.ts`/`contasFixas.ts`/`metas.ts`, que separam `erro` (bloqueante, falha ao listar) de `erroAcao` (banner dispensável, falha ao criar/editar/excluir). Consequência prática em `CategoriasView.vue`: se a listagem falhasse, a tela mostrava ao mesmo tempo o banner de erro **e** a mensagem "Nenhuma categoria personalizada ainda" (a cadeia `v-if`/`v-else-if` não incluía o erro, só `carregando`/vazio/lista). Corrigido: store agora tem `erro`/`erroAcao` separados, `CategoriasView.vue` segue a mesma cadeia condicional de `DividasView.vue` (carregando → erro → vazio → lista), e `CategoriaSelect.vue` passou a usar `erroAcao` (é uma ação de criar, não uma carga de lista). Formulário de criar/editar agora limpa `erroAcao` ao abrir, evitando banner de tentativa anterior sobrando na tela.

### Achados registrados, não corrigidos (fora do escopo desta rodada)

- **`abrirNovaDivida`/`abrirNovaConta` (`DividasView.vue`/`ContasFixasView.vue`) não limpam `erroAcao` ao reabrir o formulário** — mesma classe de problema do achado acima, só que pré-existente (não introduzido nesta sessão). Se uma tentativa de criar falhar, cancelar e reabrir o formulário mantém o banner de erro antigo na tela. Baixo impacto (o banner "envelhecido" não impede nada, só confunde), mas vale nivelar com o que foi corrigido em Categorias na próxima vez que alguém mexer nessas telas.
- **Nome de categoria personalizada pode colidir com o nome de uma categoria fixa do sistema** (ex.: criar uma categoria personalizada chamada "Alimentação"). A `UNIQUE KEY (telefone, nome)` em `categorias_personalizadas` não sabe nada sobre as 8 categorias fixas (elas não vivem nessa tabela), então o back-end aceita o cadastro sem erro — e `corDaCategoria`/`iconeDaCategoria` sempre resolvem o nome fixo primeiro, então a categoria personalizada fica "invisível" atrás da fixa (aparece com a cor/ícone do sistema, não os dela). Baixo impacto na prática (exige o usuário digitar de propósito um nome que já existe), mas seria uma validação simples de adicionar no POST/PATCH de `routes/api/categorias/index.js` se quiser fechar essa lacuna.

**Verificação após a segunda passada:** `npm test` (28 testes), `lint:eslint`, `vue-tsc --build` e `npm run build` novamente verdes.

---

## Terceira passada — navegação e responsividade completa (2026-07-12)

Motivada por feedback direto do usuário: com 6 rotas, a tab bar horizontal do `AppShell` (mesmo já remendada com `overflow-x-auto` na primeira passada) virou um problema estrutural, não só cosmético — e os cards de Despesas/Receitas/Saldo do Dashboard foram apontados como "ruins". Decisão de design (conversada, sem gerar spec formal a pedido do usuário): **80% do uso é mobile, 20% desktop, e o desktop também estava ruim** (coluna central de 672px desperdiçando tela grande).

### Mudanças

- **`AppShell.vue` reescrito**: um breakpoint só (`lg:`, 1024px) decide tudo.
  - **< 1024px**: cabeçalho no topo (como antes) + **bottom nav fixo** com Dashboard/Lançamentos sempre visíveis + botão "Mais" (`DropdownMenu` do reka-ui, mesmo padrão do `ExportarMenu.vue`) com Dívidas/Contas Fixas/Importar/Categorias.
  - **≥ 1024px**: **sidebar fixa à esquerda** substitui a tab bar — todos os 6 itens numa lista vertical, sem aperto nenhum. Cabeçalho mobile (logo/telefone/"Trocar") some, vira parte da sidebar.
  - Navegação trocou de `TabsRoot`/`TabsTrigger` (semântica de abas dentro da mesma tela) para `<nav>` + `<button aria-current="page">` (semântica mais correta pra navegação entre páginas).
- **Ordem das telas recalibrada por frequência de uso real**: Dashboard → Lançamentos → Dívidas → Contas Fixas → Importar → Categorias (antes: Importar vinha na 3ª posição; hoje reflete que é uso esporádico, atrás das duas telas de checagem periódica).
- **`ThemeToggle.vue`**: sobe posição no mobile (`bottom-20 lg:bottom-4`) pra não colidir com o bottom nav novo.
- **`DashboardView.vue`**: layout em 2 colunas a partir de `lg:` (esquerda: resumo do mês + gráfico de categorias; direita: histórico + metas) — usa o espaço extra do desktop em vez de ficar tudo empilhado numa coluna estreita.
- **Cards de Despesas/Receitas/Saldo**: o bug real era `grid-cols-3` sem nenhum breakpoint de fonte — o mesmo `text-xl` fixo tanto em celular de 360px quanto em monitor grande, apertando valores tipo "R$ 12.345,67". Corrigido pra `text-base sm:text-xl` + `truncate` nos 3 cards.
- **Telas de lista/formulário** (Lançamentos, Dívidas, Contas Fixas, Categorias, Importar) ganharam `lg:max-w-2xl` no container raiz — no desktop, a "fatia" de conteúdo ao lado da sidebar é bem mais larga (~1200px), mas essas telas continuam com largura de leitura confortável em vez de esticar até o limite; só o Dashboard usa a largura toda (com o grid de 2 colunas).

### Achado descartado (não era bug de verdade)
Cheguei a propor aplicar a mesma correção de fonte responsiva nos grids de estatística do `ImportarExtratoView.vue` (transações/arquivo, importadas/duplicadas/no arquivo) — na revisão, esses cards mostram só contagens curtas (poucos dígitos), não valores monetários formatados como os do Dashboard. Sem risco real de overflow, então não mexi — mudar só por "consistência" ali seria alteração sem motivo real.

**Verificação:** `npm test` (28 testes), `lint:eslint`, `vue-tsc --build` e `npm run build` verdes.

---

## Fase B — verificação visual manual, finalmente feita (2026-07-12)

Nenhuma ferramenta de screenshot vinha disponível nas passadas anteriores. Nesta, encontrei `chromium` do Playwright já em cache no ambiente (`~/.cache/ms-playwright`) — instalei o pacote `playwright` isolado num diretório de scratchpad (fora dos dois repositórios, não gera dependência nova no projeto), subi o `npm run dev` e dirigi um Chromium headless de verdade: mobile (390px) e desktop (1280px) × tema claro/escuro, com a API mockada (`page.route`) simulando gastos/metas reais, já que o back-end não estava rodando localmente.

### Bug real encontrado e corrigido nesta verificação

**Os 3 cards de resumo (Despesas/Receitas/Saldo) continuavam cortando o valor com "…", mesmo depois da correção de fonte responsiva da passada anterior.** A correção anterior (`text-base sm:text-xl` + `truncate`) foi testada só por leitura de código — o screenshot mostrou "R$ 3.30…" tanto no mobile quanto no desktop. Causa raiz: 3 colunas iguais são estreitas demais pra um valor tipo "R$ 3.309,76" em qualquer largura de tela testada (no desktop a situação piorou porque o Dashboard passou a dividir a tela em 2 colunas — o grid de 3 cards agora vive só na metade esquerda, menos espaço que antes). `truncate` escondia o problema em vez de resolver — pior que estourar o card, porque esconde dado financeiro de verdade.

**Correção:** redesenhei o bloco (`DashboardView.vue`) — Saldo do mês vira um card único, largura cheia, em destaque (fonte maior, é o número mais olhado); Despesas/Receitas ficam lado a lado em 2 colunas (metade da largura cada, bem mais espaço que um terço). Sem `truncate` em lugar nenhum agora — se algum dia não couber, é sinal de que precisa ajustar o layout de novo, não esconder o dígito. Reverifiquei com o mesmo Chromium: valores aparecem completos em 390px e 1280px, claro e escuro.

### Outras confirmações visuais
- Bottom nav (mobile) + menu "Mais" (dropdown com Dívidas/Contas Fixas/Importar/Categorias): renderiza e abre corretamente, item ativo destacado.
- Sidebar (desktop): todos os 6 itens em ordem, item ativo com fundo emerald, "Trocar número" no rodapé.
- `ThemeToggle` reposicionado (`bottom-20 lg:bottom-4`): confirmado sem colidir com o bottom nav, inclusive testando o scroll real da página (não só screenshot `fullPage`, que distorce a posição de elementos `fixed` — usei um screenshot de viewport real rolado até o fim pra confirmar que o bottom nav fica de verdade fixo na tela, não "flutuando no meio do conteúdo").
- Dashboard em 2 colunas no desktop: coluna esquerda (resumo + categorias), direita (histórico + metas) — confirmado visualmente.
- Telas de lista (`lg:max-w-2xl`): confirmado que o conteúdo não estica até o limite dos ~1150px disponíveis, mantém largura de leitura.

**Verificação final:** `npm test` (28 testes), `lint:eslint`, `vue-tsc --build`, `npm run build` verdes. Dev server e artefatos do Playwright encerrados/isolados no scratchpad, nada vazou pro repositório.
