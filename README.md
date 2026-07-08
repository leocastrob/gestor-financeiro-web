# gestor-financeiro-web

Front-end do meu gestor de gastos pessoal. Uma página onde você entra com seu número de WhatsApp (confirmado por um código de verificação enviado pelo próprio bot), vê o total gasto no período, um gráfico por categoria e a lista de lançamentos — com opção de editar ou excluir cada um.

Para uma explicação completa do projeto (o quê, como e onde roda) veja `../PROJETO.md`. Para melhorias planejadas, veja `../MELHORIAS.md`.

## Stack

- Vue 3 + Vite, com Pinia (estado) e Vue Router (navegação).
- TailwindCSS para estilo.
- Chart.js (via `vue-chartjs`) para o gráfico de gastos por categoria.

## Como rodar localmente

1. Instalar dependências: `npm install`
2. Ter a API (`gestor-financeiro-api`) rodando — por padrão a página chama `/api/...` como caminho relativo, então funciona automaticamente se o front for buildado dentro da própria API (ver "Deploy"). Para rodar a API e o front **separados** em desenvolvimento, aponte a URL da API com a variável de ambiente `VITE_API_URL` (ver abaixo).
3. Rodar em modo desenvolvimento: `npm run dev`

## Variáveis de ambiente

- `VITE_API_URL` (opcional): URL base da API, ex. `http://localhost:3000`. Sem essa variável, as chamadas usam caminho relativo (`/api/...`), assumindo que a página e a API estão publicadas atrás do mesmo domínio — que é o caso em produção.

## Como funciona o login

Não existe usuário/senha tradicional. O fluxo é:

1. Você digita seu número de WhatsApp (com código do país e DDD).
2. A API pede pro bot mandar um código de 6 dígitos por WhatsApp (`POST /api/auth/solicitar-pin`).
3. Você digita esse código na página, que confirma com a API (`POST /api/auth/confirmar-pin`).
4. Confirmado, o telefone fica salvo no navegador (`localStorage`) e a página libera o acesso aos seus gastos.

Isso garante que só quem tem acesso ao WhatsApp daquele número consegue entrar — sem precisar cadastrar senha nenhuma.

## Estrutura

- `src/views/LoginView.vue` — tela de telefone + confirmação de código.
- `src/views/GastosView.vue` — painel principal (total, gráfico, lista, edição inline).
- `src/views/NotFoundView.vue` — página exibida para rotas inexistentes.
- `src/stores/gastos.ts` — estado global (Pinia): telefone logado e lista de transações.
- `src/services/api.ts` — todas as chamadas à API ficam centralizadas aqui.

## Build de produção

```sh
npm run build
```

Roda o type-check (`vue-tsc`) e gera os arquivos estáticos em `dist/`.

## Deploy

Não há deploy direto deste repositório para o servidor. O fluxo real é feito pelo `deploy.sh` da API (`gestor-financeiro-api`), que builda este projeto localmente — necessário porque o Termux (onde a API roda em produção) não consegue rodar as ferramentas de build do Vite — e copia o resultado (`dist/`) para dentro da pasta `public/` da API, que serve tudo (API + página web) num único processo. Veja `../PROJETO.md`, seção "Como o deploy funciona hoje".

## Lint

```sh
npm run lint
```
