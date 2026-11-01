# Oficina OS

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
docs/           diagrama do modelo de dados
SPEC.md         especificação funcional e regras de negócio
```

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto (ou em `backend/.env`) a partir do `.env.example`:

```bash
cp .env.example .env
```

Variáveis utilizadas:

- `DATABASE_URL`: URL de conexão com o banco SQLite (ex.: `sqlite:///./oficina.db`)
- `SECRET_KEY`: Chave secreta usada para assinar o cookie de sessão HTTP-only (gere um valor aleatório seguro em produção)

> Nunca faça commit do arquivo `.env` nem de arquivos `*.db`.

## Instalação e Configuração Inicial

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
```

Aplique as migrations para criar o schema no SQLite:

```bash
alembic upgrade head
```

### 2. Seeds (Usuário da Oficina e Marcas de Veículo)

Crie ou atualize o usuário único da oficina (os dados são solicitados de forma interativa no terminal):

```bash
python -m app.seed
```

Popule a tabela de marcas de veículos com a lista inicial:

```bash
python -m app.seed_marcas
```

> Ambos os scripts de seed são idempotentes e podem ser executados novamente com segurança.

### 3. Frontend

Em outro terminal:

```bash
cd frontend
npm install
```

## Desenvolvimento

### Rodar o Backend

Em `backend/` (com o ambiente virtual ativo):

```bash
uvicorn app.main:app --reload --port 8000
```

A API ficará disponível em `http://localhost:8000/api` (healthcheck em `GET /api/health`).

### Rodar o Frontend

Em `frontend/`:

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

1. Gere o build de produção do frontend:

```bash
cd frontend
npm run build
```

2. Inicie o servidor FastAPI (em `backend/`, com `.venv` ativo e `.env` configurado):

```bash
cd ../backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

O aplicativo completo (interface web + API) estará disponível em `http://localhost:8000`.
