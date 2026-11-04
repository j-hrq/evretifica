# EVR Retifica

Aplicação web para uma oficina mecânica registrar clientes, marcas de veículos, veículos, catálogo de itens (peças e serviços), orçamentos e ordens de serviço.

## Stack

- **Backend:** Python 3.12+, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2, SQLite
- **Frontend:** React + TypeScript + Vite, Tailwind CSS v4 (`@tailwindcss/vite`), shadcn/ui, React Router, TanStack Query, React Hook Form + Zod
- **Testes e Qualidade:** pytest e ruff (backend); Vitest, ESLint e TypeScript (`tsc --noEmit`) (frontend)

## Estrutura do Projeto

```
backend/
  app/          main.py, config.py, db.py, auth.py, models/, schemas/, routers/, services/
  alembic/      migrations do banco de dados
  tests/        testes automatizados do backend
frontend/
  src/          components/ui/, pages/, lib/, hooks/
scripts/        cli.mjs (automação multiplataforma da raiz)
docs/           diagrama do modelo de dados
SPEC.md         especificação funcional e regras de negócio
```

## Configuração Rápida (Um Único Comando)

Na raiz do repositório, execute:

```bash
npm run setup
```

Esse comando executa automaticamente toda a preparação do ambiente (compatível com Windows, Linux e macOS):
1. Cria o arquivo `.env` a partir do `.env.example` (se não existir).
2. Cria o ambiente virtual `backend/.venv` (se não existir).
3. Instala as dependências do backend (`requirements-dev.txt`).
4. Aplica as migrations do banco SQLite (`alembic upgrade head`).
5. Popula as marcas de veículos iniciais (`app.seed_marcas`).
6. Instala as dependências do frontend (`npm install`) e gera o build de produção (`npm run build`).
7. Caso ainda não exista usuário no banco, solicita interativamente os dados para criar o usuário da oficina (`app.seed`).

### Outros Comandos na Raiz

- `npm run backend` — Inicia o servidor FastAPI em `0.0.0.0:8000` (servindo API + frontend compilado).
- `npm run dev:backend` — Inicia o backend com `--reload` em `localhost:8000`.
- `npm run dev:frontend` — Inicia o servidor de desenvolvimento Vite do frontend.
- `npm run seed` — Cria um usuário da oficina interativamente.
- `npm run seed:marcas` — Popula a lista inicial de marcas de veículos.
- `npm run seed:massa` — Popula o banco com uma massa de teste de 100 registros por entidade.

---

## Variáveis de Ambiente

O arquivo `.env` na raiz do projeto (ou em `backend/.env`) é gerado a partir do `.env.example`:

```bash
cp .env.example .env
```

Variáveis utilizadas:

- `DATABASE_URL`: URL de conexão com o banco SQLite (ex.: `sqlite:///./oficina.db`)
- `SECRET_KEY`: Chave secreta usada para assinar o cookie de sessão HTTP-only (gere um valor aleatório seguro em produção)

> Nunca faça commit do arquivo `.env` nem de arquivos `*.db`.

## Instalação Manual (Passo a Passo)

Caso prefira rodar cada etapa manualmente sem o `npm run setup`:

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # No Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
alembic upgrade head
```

### 2. Seeds (Usuário da Oficina e Marcas de Veículo)

Crie o usuário da oficina:

```bash
python -m app.seed
```

Popule a tabela de marcas de veículos com a lista inicial:

```bash
python -m app.seed_marcas
```

(Opcional) Popule o banco com uma massa de teste de 100 registros para cada entidade:

```bash
python -m app.seed_massa_dados
```

> Todos os scripts de seed são idempotentes e podem ser executados novamente com segurança.

### 3. Frontend

```bash
cd frontend
npm install
```

## Desenvolvimento

### Rodar o Backend

Direto da raiz do repositório:

```bash
npm run dev:backend
```

Ou manualmente em `backend/` (com o ambiente virtual ativo):

```bash
uvicorn app.main:app --reload --port 8000
```

A API ficará disponível em `http://localhost:8000/api` (healthcheck em `GET /api/health`).

### Rodar o Frontend

Direto da raiz (`npm run dev:frontend`) ou em `frontend/`:

```bash
npm run dev
```

O servidor de desenvolvimento do Vite faz proxy automático das requisições `/api` para `http://localhost:8000`.

## Testes, Lint e Verificação de Tipos

### Backend (em `backend/`)

```bash
pytest
ruff check . && ruff format --check .
```

### Frontend (em `frontend/`)

```bash
npm test
npm run lint
npm run typecheck
```

## Build e Execução em Produção

Em produção, o FastAPI serve tanto a API (`/api/*`) quanto os arquivos estáticos do frontend compilado (`frontend/dist`) na mesma origem.

1. Gere o build de produção do frontend (já incluído no `npm run setup`):

```bash
cd frontend
npm run build
```

2. Inicie o servidor FastAPI a partir da raiz:

```bash
npm run backend
```

O aplicativo completo (interface web + API) estará disponível em `http://localhost:8000`.
