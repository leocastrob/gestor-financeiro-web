# Cor escolhível para categorias personalizadas

**Data:** 2026-07-28
**Repos afetados:** `gestor-financeiro-api`, `gestor-financeiro-web`

## Problema

A cor de uma categoria personalizada é derivada por hash do nome, sorteando
entre seis cores fixas (`theme/categorias.ts:28`). O usuário não escolhe, e com
mais de seis categorias personalizadas duas inevitavelmente compartilham cor.

## Objetivo

Permitir escolher a cor de cada categoria personalizada, e deixar visível quais
cores já estão em uso para que a repetição só aconteça de propósito.

## Escopo

Dentro:

- Coluna `cor` em `categorias_personalizadas`
- `POST /api/categorias` e `PATCH /api/categorias/:id` aceitam `cor`
- Seletor de cor no criar e no editar, na tela Categorias
- `corDaCategoria` passa a preferir a cor gravada

Fora:

- As oito categorias fixas (Alimentação, Transporte, …) mantêm suas cores. Torná-las
  editáveis exigiria gravar sobrescritas por telefone e listá-las numa tela que
  hoje só mostra as personalizadas.
- Escolha de cor pelo bot WhatsApp.

## O limite físico, e o que fazer com ele

`scripts/validate_palette.js` da skill `dataviz` foi rodado sobre várias
paletas candidatas. O resultado é inequívoco: **nenhuma paleta de 24 cores é
mutuamente distinguível**, e nem uma de oito é. A paleta de referência da
própria ferramenta — que é exatamente a origem das oito cores fixas deste
projeto — só garante separação entre três slots quando quaisquer duas cores
podem aparecer lado a lado.

Isso significa que aumentar a paleta não resolve o problema sozinho. O que
resolve é a combinação de três coisas, todas já presentes ou previstas aqui:

1. **Escolha manual** — o usuário vê a grade inteira e decide, em vez de receber
   uma cor sorteada
2. **Cores em uso marcadas** — o seletor esmaece o swatch já ocupado e mostra o
   ícone de quem o usa, então a colisão nunca é acidental
3. **Identidade nunca é só cor** — em toda a interface a cor aparece junto do
   nome e do ícone da categoria: no badge de `GastoItem`, na legenda de
   `GraficoCategorias`, na linha da tela Categorias

A repetição não é bloqueada — duas categorias irmãs na mesma cor é uma escolha
legítima.

## Paleta

24 cores, validadas com `--mode light` e `--mode dark`: todas passam banda de
luminância, piso de croma e contraste em ambos os temas. Dois avisos de
contraste marginais (`#c98500` em 2,99 e `#c2185b` em 2,97, contra o limiar de
3,0) são aceitos porque a cor sempre aparece acompanhada de nome e ícone — o
"relief" que a skill exige para um WARN de contraste.

```
#e34948  #e66767  #c2410c  #d95926  #a16207  #c98500
#4d7c0f  #65a30d  #008300  #2f9e44  #0f8f63  #199e70
#0d9488  #1a7fa8  #0891b2  #3987e5  #2a78d6  #6d7ff0
#9085e9  #a855f7  #c026d3  #c2185b  #d55181  #db2777
```

A ordem é por matiz, em grade de 6 colunas por 4 linhas, para que a navegação
visual seja previsível.

## Banco

```sql
ALTER TABLE categorias_personalizadas ADD COLUMN cor CHAR(7) NULL AFTER icone;
```

`NULL` significa "cor automática" e preserva o comportamento de hash atual. As
categorias que já existem continuam idênticas, sem migração de dados.

`PROJETO.md:154` registra que `ALTER TABLE` é passo manual, fora do
`deploy.sh`. O ALTER precisa rodar no MySQL do servidor **antes** do deploy do
código: sem a coluna, o `POST` de categoria falha com erro de coluna
inexistente.

## Backend — `gestor-financeiro-api`

`routes/api/categorias/index.js`:

- `POST /` lê `cor` do body. Ausente, `null` ou `''` grava `NULL`. Presente,
  precisa bater `/^#[0-9a-fA-F]{6}$/`, senão 400 com
  `'Cor inválida. Use o formato #RRGGBB.'`
- `PATCH /:id` mesma validação. `cor` ausente não altera o campo; `cor: null`
  explícito volta para a cor automática.

O backend valida o formato, não a paleta: a lista de 24 vive no frontend, que é
quem restringe a escolha. Duplicar a paleta no servidor criaria dois lugares
para manter em sincronia sem ganho real — uma cor fora da paleta, se chegasse,
ainda seria um hex válido e renderizável.

A distinção entre "não enviado" e "enviado como null" no PATCH usa
`Object.prototype.hasOwnProperty.call(request.body, 'cor')`, porque `undefined`
e `null` precisam de tratamentos diferentes.

## Frontend — `gestor-financeiro-web`

### `theme/paletaCategorias.ts` (novo)

Exporta `PALETA_CORES: readonly string[]` com as 24 cores. Arquivo separado do
`theme/categorias.ts` para que a paleta de escolha (dado de UI) não se misture
com a resolução de cor (lógica).

### `theme/categorias.ts`

`corDaCategoria` ganha um passo antes do hash:

```ts
const custom = store.categorias.find(c => c.nome === categoria)
if (custom) return custom.cor || corPersonalizada(categoria)
```

Única mudança no arquivo. Badge, gráficos e a bolinha da tela Categorias
herdam sem alteração.

### `components/CorSelect.vue` (novo)

Grade de 6×4 swatches com `v-model<string | null>`.

- Swatch selecionado ganha anel de destaque
- Swatch cuja cor já pertence a outra categoria aparece a 40% de opacidade com o
  ícone dessa categoria sobreposto, e `title` com o nome dela. Continua
  clicável.
- Um botão "Automática" à parte define `null`, voltando ao hash

Recebe a lista de cores ocupadas via prop `emUso: { cor: string; nome: string; icone: string }[]`,
montada pela tela a partir do store. O componente não lê store — recebe tudo por
prop, e por isso é testável isoladamente.

### `services/api.ts`

`CategoriaPersonalizada` ganha `cor: string | null`. `DadosNovaCategoria` e
`DadosEdicaoCategoria` ganham `cor?: string | null`.

### `CategoriasView.vue` e `CategoriaPersonalizadaItem.vue`

Ambos ganham o `CorSelect` no formulário. A view calcula a lista `emUso` a
partir de `categoriasStore.categorias`, excluindo a categoria em edição — senão
a própria cor apareceria como ocupada por ela mesma.

## Testes

`gestor-financeiro-api/test/routes/api/categorias.test.js`:

- `POST` com cor válida inclui a coluna no INSERT
- `POST` com cor malformada → 400
- `POST` sem cor não inclui a coluna
- `PATCH` com cor válida atualiza
- `PATCH` com cor malformada → 400
- `PATCH` com `cor: null` grava `NULL`

`gestor-financeiro-web/src/theme/categorias.test.ts` (novo):

- `corDaCategoria` devolve a cor gravada quando existe
- cai no hash quando `cor` é `null`
- devolve a cor fixa para as oito categorias do sistema

`gestor-financeiro-web/src/theme/paletaCategorias.test.ts` (novo):

- a paleta tem 24 cores, todas em `#rrggbb` minúsculo, sem repetição

Fora de cobertura automatizada: o projeto não tem test runner de componentes
Vue montados, então `CorSelect.vue` é verificado manualmente.
