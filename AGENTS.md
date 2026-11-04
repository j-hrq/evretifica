# Oficina OS

App web para uma oficina mecânica registrar clientes, veículos, orçamentos e ordens de serviço.
Requisitos e regras de negócio estão em `SPEC.md`: leia antes de implementar qualquer funcionalidade.

## Estado atual

Projeto novo, ainda sem código. Siga a "Ordem de implementação" do `SPEC.md`, uma fatia por vez.

## Stack

- Backend: Python 3.12+, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2, SQLite
- Frontend: React + TypeScript + Vite, Tailwind CSS v4 (plugin `@tailwindcss/vite`), shadcn/ui
- Frontend, dados e formulários: React Router, TanStack Query, React Hook Form + Zod
- Testes: pytest (backend), Vitest (frontend)
- Lint: ruff (backend), ESLint e `tsc --noEmit` (frontend)

## Estrutura

```
backend/
  app/          main.py, config.py, db.py, auth.py, models/, schemas/, routers/, services/
  alembic/      migrations
  tests/
frontend/
  src/          components/ui/ (shadcn), pages/, lib/, hooks/
docs/           modelo-de-dados.drawio (diagrama do modelo de dados)
SPEC.md         produto e regras de negócio
```

## Comandos

Na raiz (multiplataforma via `scripts/cli.mjs`):
- Configuração completa: `npm run setup` (cria `.env`, `backend/.venv`, instala deps, aplica migrations, roda `seed_marcas`, instala e compila o frontend e cria o usuário se o banco estiver sem usuários)
- Produção/rede local: `npm run backend`
- Dev backend: `npm run dev:backend`
- Dev frontend: `npm run dev:frontend`
- Seeds: `npm run seed`, `npm run seed:marcas` e `npm run seed:massa`

Backend (em `backend/`):
- Instalar: `python -m venv .venv && source .venv/bin/activate && pip install -r requirements-dev.txt`
- Dev: `uvicorn app.main:app --reload --port 8000` (ou `npm run dev:backend` na raiz)
- Testes: `pytest`
- Lint: `ruff check . && ruff format --check .`
- Migration: `alembic revision --autogenerate -m "mensagem"` e `alembic upgrade head`
- Seed do usuário: `python -m app.seed`
- Seed de marcas de veículo: `python -m app.seed_marcas`

Frontend (em `frontend/`):
- Instalar: `npm install`
- Dev: `npm run dev` (faz proxy de `/api` para `localhost:8000`)
- Testes: `npm test`
- Lint e tipos: `npm run lint` e `npm run typecheck`
- Build: `npm run build`
- Componente shadcn: `npx shadcn@latest add <componente>`

Se um script ainda não existir, crie-o no `package.json` ao montar o esqueleto.

## Configuração

Variáveis em `.env` (nunca commitar; mantenha `.env.example` atualizado): `DATABASE_URL` e `SECRET_KEY`.
O usuário da oficina (e a pessoa ligada a ele) é criado por um script de seed, com nome, CPF ou CNPJ, login e senha informados na execução. Nunca coloque credenciais no código, no `.env` nem no repositório.

## Convenções

- Nomes de classes, tabelas, colunas e rotas em português, sem acento, seguindo o diagrama: classes em PascalCase (`OrdemServico`), colunas em snake_case (`data_criacao`), rotas em kebab-case (`/api/ordens-servico`). Textos de interface, mensagens ao usuário e documentação em português do Brasil.
- O JSON da API usa snake_case e o frontend usa os mesmos nomes, sem conversão para camelCase.
- `SituacaoAvaliacao`, `TipoItem` e `TipoTelefone` são `IntEnum` com os códigos do `SPEC.md`, gravados em `status_id` e `tipo_id`. Não crie tabelas para eles.
- Rotas finas: a lógica de negócio fica em `services/`, não nos routers.
- Valide com Pydantic no backend e com Zod no frontend, mantendo as regras iguais nos dois lados.
- Siga o padrão dos arquivos vizinhos antes de inventar um novo.
- Em componentes de `components/ui/`, só edite o necessário; prefira compor em vez de alterar.

## Regras

- Não adicione dependências sem perguntar.
- O diagrama em `docs/` está defasado em relação ao `SPEC.md`; em caso de divergência, vale o `SPEC.md`. Se o código precisar divergir do `SPEC.md`, pergunte antes.
- Dinheiro sempre em centavos (inteiro), nunca `float`. Totais são calculados no backend.
- Senhas só como hash. Toda rota, exceto o login, exige sessão.
- Todo schema muda por migration Alembic. Nunca edite o banco na mão. O SQLite precisa de `PRAGMA foreign_keys=ON`.
- Código novo vem com teste. Rode testes, lint e tipos antes de dizer que terminou.
- Faça só o que a tarefa pede. Não refatore nem "melhore" código fora do escopo.
- Em dúvida sobre um requisito, consulte o `SPEC.md` e, se não resolver, pergunte em vez de assumir.
- Commits pequenos, um por tarefa, com mensagem no imperativo. Não commite `.env`, `*.db` nem `node_modules`.
- Fluxo de branches: `main` é produção e `develop` é a base estável. Trabalhe sempre na branch da fatia, criada a partir de `develop`. Nunca faça commit, merge nem push direto em `main` ou `develop`.
