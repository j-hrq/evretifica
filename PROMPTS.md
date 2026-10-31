# Prompts por fatia — Oficina OS

Um prompt para cada fatia da "Ordem de implementação" do `SPEC.md`, na mesma ordem.

## Como usar

1. Abra uma **sessão nova** do agente para cada fatia, na raiz do repositório.
2. Antes de começar, atualize a `develop`, deixe a árvore de trabalho limpa (tudo commitado) e crie a branch da fatia a partir dela (`git switch develop && git switch -c fatia-N-nome`).
3. Cole o prompt, **revise o plano** e só então aprove.
4. Ao final, confira a saída dos checks e o diff. Se estiver bom, rode o prompt de revisão (no fim deste arquivo), corrija o que ele apontar e faça o commit.
5. Faça o merge da branch na `develop` (por pull request, se usar um remoto) e só então comece a próxima fatia. A `main` (produção) só recebe a `develop` quando ela estiver estável, por exemplo ao fechar o MVP.
6. Se o agente errar duas vezes a mesma coisa, acrescente uma regra ao `AGENTS.md`. Se algo do `SPEC.md` mudar, atualize-o antes da fatia seguinte.

---

## Fatia 1 — Esqueleto

````text
Leia o AGENTS.md e o SPEC.md. Vamos implementar a fatia 1 (Esqueleto) da "Ordem de implementação" do SPEC.md, e só ela.

Antes de escrever código, me mostre um plano curto: pastas e arquivos que vai criar, versões das dependências e comandos que vai rodar. Espere minha aprovação.

Depois de aprovado, entregue:

Backend, em backend/:
- FastAPI com a estrutura do AGENTS.md
- SQLite via SQLAlchemy, com foreign keys ativadas
- Alembic configurado, ainda sem tabelas
- Configuração lida do .env
- Rota GET /api/health e um teste dela com pytest
- requirements.txt e requirements-dev.txt

Frontend, em frontend/:
- Vite + React + TypeScript
- Tailwind v4 com @tailwindcss/vite
- shadcn/ui inicializado, só com o componente Button para provar que funciona
- Proxy de /api para localhost:8000
- Uma página inicial que chama /api/health e mostra o resultado
- Scripts dev, build, lint, typecheck e test no package.json, com um teste Vitest simples

Na raiz: .env.example e .gitignore (.env, *.db, .venv, node_modules, dist, .claude/settings.local.json).

Fora do escopo: login, qualquer entidade do SPEC e servir o build pelo FastAPI.

Ao terminar, rode todos os comandos de verificação do AGENTS.md (pytest, ruff, npm run lint, typecheck, test e build) e me mostre a saída. Se algo falhar, corrija antes de dizer que acabou. Não adicione dependências além das listadas no AGENTS.md sem perguntar.
````

---

## Fatia 2 — Base de pessoa

````text
Leia o AGENTS.md e o SPEC.md. Implemente a fatia 2 (Base de pessoa) da "Ordem de implementação", e só ela. É uma fatia só de backend: sem rotas e sem telas.

Entregue:
- Modelos SQLAlchemy de Pessoa, PessoaFisica, PessoaJuridica e Telefone, a tabela de ligação pessoa_telefone (chave primária composta, sem id nem datas) e o IntEnum TipoTelefone, como descrito no SPEC.md.
- Migration Alembic com a restrição CHECK de exatamente um entre pessoa_fisica_id e pessoa_juridica_id, e os índices únicos descritos no SPEC.
- Funções puras de validação de CPF e CNPJ (só dígitos, dígitos verificadores), com testes de casos válidos, inválidos, sequências repetidas (como 000.000.000-00) e entradas com máscara.
- Um serviço em services/ que cria, atualiza e carrega uma Pessoa com o seu documento (CPF ou CNPJ) e os seus telefones, numa só transação.
- Testes da violação do CHECK (os dois preenchidos e nenhum dos dois), CPF e CNPJ duplicados e atualização da lista de telefones.

Fora do escopo: Cliente, Usuario, rotas e telas.

Mostre um plano curto antes do código e espere minha aprovação. Siga os padrões do que já existe, escreva os testes junto e, ao final, rode todos os checks do AGENTS.md e me mostre a saída. Corrija o que falhar antes de dizer que terminou. Não adicione dependências sem perguntar.
````

---

## Fatia 3 — Login único

````text
Leia o AGENTS.md e o SPEC.md. Implemente a fatia 3 (Login único) da "Ordem de implementação", e só ela.

Entregue:
- Modelo Usuario (pessoa_id único, login único, senha só como hash) e a migration.
- Hash de senha: no plano, compare as opções e recomende uma. Prefira a biblioteca padrão do Python; se precisar de uma dependência nova, peça aprovação.
- Script de seed que pergunta nome, CPF ou CNPJ, login e senha (sem eco no terminal) e cria a Pessoa e o Usuario usando o serviço da fatia 2. Nada de credenciais no código, no .env ou no repositório. Documente o comando de uso no AGENTS.md.
- Rotas /api/auth/login, /api/auth/logout e /api/auth/me, com sessão por cookie HttpOnly assinado (SECRET_KEY do .env).
- Uma dependência de autenticação reutilizável que protege toda rota, exceto o login e o /api/health.
- Frontend: tela de login, proteção das rotas, botão de sair e redirecionamento para o login quando a API responder 401.
- Testes: login correto e incorreto, rota protegida sem sessão (401), logout e o script de seed.

Fora do escopo: cadastro ou edição de usuários e recuperação de senha.

Mostre um plano curto antes do código e espere minha aprovação. Siga os padrões do que já existe, escreva os testes junto e, ao final, rode todos os checks do AGENTS.md e me mostre a saída. Corrija o que falhar antes de dizer que terminou. Não adicione dependências sem perguntar.
````

---

## Fatia 4 — Clientes

Esta é a fatia que define os padrões das demais. Vale revisar com mais cuidado.

````text
Leia o AGENTS.md e o SPEC.md. Implemente a fatia 4 (Clientes) da "Ordem de implementação", ponta a ponta, usando a base de pessoa e a autenticação já existentes.

Entregue:
- Modelo Cliente (pessoa_id único, ativo) e a migration.
- Rotas /api/clientes (listar, buscar, criar, editar, excluir), com a pessoa aninhada: nome, e-mail, CPF ou CNPJ e telefones. Tudo gravado numa só transação. Listagem com busca (?q) e paginação (?page, ?per_page), como no SPEC.
- Regras de exclusão do SPEC: 409 quando houver vínculos (os veículos, orçamentos e OS ainda não existem; deixe a verificação preparada e testada no que for possível). Ao excluir um cliente sem vínculos, remova também a pessoa, com PF/PJ e telefones, se ela não estiver ligada a um usuário.
- Frontend: lista com busca e paginação, formulário de criar e editar (nome, e-mail, escolha entre CPF e CNPJ com o documento, lista editável de telefones com DDD, número e tipo, e o campo ativo), exclusão com confirmação, estados de carregando, vazio e erro. Use componentes shadcn adicionados pelo CLI, TanStack Query e React Hook Form + Zod.
- Testes de backend (CRUD, validações de CPF/CNPJ, unicidade, transação) e de frontend (ao menos o formulário e a validação).

Como esta fatia define o padrão das demais, no plano descreva a organização que vai usar para um CRUD (schemas, services, routers, páginas, hooks, formato de paginação e de erros). Ao final, proponha, sem aplicar, um trecho curto "Padrões" para o AGENTS.md.

Mostre um plano curto antes do código e espere minha aprovação. Escreva os testes junto e, ao final, rode todos os checks do AGENTS.md e me mostre a saída. Corrija o que falhar antes de dizer que terminou. Não faça nada fora desta fatia e não adicione dependências sem perguntar.
````

---

## Fatia 5 — Marcas de veículo

````text
Leia o AGENTS.md e o SPEC.md. Implemente a fatia 5 (Marcas de veículo) da "Ordem de implementação". Siga o padrão da fatia de Clientes, sem inventar uma organização nova.

Entregue:
- Modelo MarcaVeiculo (nome único, ativo) e a migration.
- Rotas /api/marcas-veiculo (CRUD, busca e paginação) e as telas correspondentes.
- Script de seed idempotente com as marcas de veículo mais comuns no Brasil. Documente o comando no AGENTS.md.
- Regra de exclusão: 409 quando houver veículos ligados. Deixe a verificação preparada para quando os veículos existirem.
- Testes de backend e de frontend.

Mostre um plano curto antes do código e espere minha aprovação. Escreva os testes junto e, ao final, rode todos os checks do AGENTS.md e me mostre a saída. Corrija o que falhar antes de dizer que terminou. Não faça nada fora desta fatia e não adicione dependências sem perguntar.
````

---

## Fatia 6 — Veículos

````text
Leia o AGENTS.md e o SPEC.md. Implemente a fatia 6 (Veículos) da "Ordem de implementação". Siga o padrão da fatia de Clientes.

Entregue:
- Modelo Veiculo com os campos do SPEC (cliente_id, marca_id, modelo, placa, ano_fabricacao, ano_modelo, cor, km, observacao) e a migration.
- Placa: normalizada em maiúsculas e sem hífen, aceitando o padrão antigo (AAA9999) e o Mercosul (AAA9A99), única. Validação em função pura, com testes.
- Rotas /api/veiculos (CRUD, busca por placa, modelo ou cliente, paginação). Trocar o cliente_id (novo dono) deve ser possível.
- Telas: lista, formulário com busca de cliente e seleção de marca, ano exibido como AAAA/AAAA.
- Ative agora as regras de exclusão que dependem de veículos: cliente com veículos e marca com veículos retornam 409. Atualize os testes das fatias 4 e 5.
- Testes de backend e de frontend.

Mostre um plano curto antes do código e espere minha aprovação. Escreva os testes junto e, ao final, rode todos os checks do AGENTS.md e me mostre a saída. Corrija o que falhar antes de dizer que terminou. Não faça nada fora desta fatia e não adicione dependências sem perguntar.
````

---

## Fatia 7 — Itens (categorias de serviço)

````text
Leia o AGENTS.md e o SPEC.md. Implemente a fatia 7 (Itens) da "Ordem de implementação". Siga o padrão da fatia de Clientes.

Entregue:
- Modelo Item (nome, ativo) e a migration.
- Rotas /api/itens (CRUD, busca e paginação) e as telas correspondentes. Itens inativos não aparecem nos seletores de novos lançamentos, mas continuam existindo.
- A regra de exclusão (409 quando o item estiver em alguma linha de orçamento ou OS) fica preparada, mas só será testada por completo nas fatias 8 e 9.
- Testes de backend e de frontend.

Mostre um plano curto antes do código e espere minha aprovação. Escreva os testes junto e, ao final, rode todos os checks do AGENTS.md e me mostre a saída. Corrija o que falhar antes de dizer que terminou. Não faça nada fora desta fatia e não adicione dependências sem perguntar.
````

---

## Fatia 8 — Orçamentos

````text
Leia o AGENTS.md e o SPEC.md. Implemente a fatia 8 (Orçamentos) da "Ordem de implementação". Siga o padrão da fatia de Clientes.

Entregue:
- Modelos Orcamento e ItemOrcamento (com a FK orcamento_id na linha), os IntEnum SituacaoAvaliacao e TipoItem e a migration.
- Numeração NNN-AAAA-ORC: contador de 3 dígitos por tipo e por ano, atômico, único, imutável e nunca reutilizado, mesmo após exclusões. Isso exige uma tabela de contador que não está no SPEC: proponha o desenho no plano e espere minha aprovação. Faça o serviço de numeração de forma genérica, porque a fatia 9 vai reutilizá-lo para NNN-AAAA-OS.
- cliente_id preenchido pelo backend com o dono do veículo ao criar o orçamento e ao trocar o veículo; nunca aceito no envio. Trocar o dono do veículo depois não pode alterar orçamentos existentes.
- Itens aninhados (item_id, tipo_id, quantidade com 2 casas, valor_unitario em centavos). Total e vencimento calculados pelo backend na leitura; data_emissao com padrão de hoje; validade_dias opcional; status_id com padrão PENDENTE.
- Rotas /api/orcamentos (CRUD, busca por número, placa ou cliente, filtro ?status_id, paginação).
- Telas: lista e formulário com busca de veículo (mostrando o cliente), data de emissão, validade em dias com o vencimento, tabela de itens editável com total atualizado enquanto digita, descrição e status. O número aparece depois de salvo.
- Ative as regras de exclusão que dependem de orçamentos: cliente, veículo e item usados retornam 409. Atualize os testes das fatias anteriores.
- Testes: numeração (sequência, virada de ano, sem reutilização), cliente do documento preservado quando o dono do veículo muda, arredondamento do total, regras de exclusão, validações e o formulário no frontend.

Mostre um plano curto antes do código e espere minha aprovação. Escreva os testes junto e, ao final, rode todos os checks do AGENTS.md e me mostre a saída. Corrija o que falhar antes de dizer que terminou. Não faça nada fora desta fatia e não adicione dependências sem perguntar.
````

---

## Fatia 9 — Ordens de serviço

````text
Leia o AGENTS.md e o SPEC.md. Implemente a fatia 9 (Ordens de serviço) da "Ordem de implementação". Siga o padrão da fatia de Orçamentos e reutilize o serviço de numeração.

Entregue:
- Modelos OrdemServico e ItemOrdemServico (com a FK ordem_servico_id na linha) e a migration.
- Numeração NNN-AAAA-OS, com o ano vindo de data_criacao, usando o mesmo serviço da fatia 8.
- cliente_id preenchido pelo backend como no orçamento; km_entrada opcional; itens, total e status como no orçamento.
- Rotas /api/ordens-servico (CRUD, busca por número, placa ou cliente, filtro ?status_id, paginação) e as telas correspondentes, com km de entrada.
- Estenda as regras de exclusão para considerar OS (cliente, veículo e item) e atualize os testes.
- Testes equivalentes aos do orçamento, mais a numeração independente entre ORC e OS.

Fora do escopo: vínculo ou conversão entre orçamento e OS, e as datas de abertura e fechamento da OS.

Mostre um plano curto antes do código e espere minha aprovação. Escreva os testes junto e, ao final, rode todos os checks do AGENTS.md e me mostre a saída. Corrija o que falhar antes de dizer que terminou. Não faça nada fora desta fatia e não adicione dependências sem perguntar.
````

---

## Fatia 10 — Acabamento

````text
Leia o AGENTS.md e o SPEC.md. Implemente a fatia 10 (Acabamento) da "Ordem de implementação".

Primeiro faça uma auditoria e me mostre a lista de achados antes de alterar qualquer coisa: inconsistências entre as telas, mensagens de erro fora do português, estados de carregando, vazio e erro ausentes, buscas e filtros que divergem entre listagens, problemas de layout em tela pequena, falhas de acessibilidade básica (rótulos, foco, contraste).

Depois de eu aprovar a lista, implemente as correções, e também:
- Produção: o FastAPI servindo o build do frontend na mesma origem, como descrito no SPEC.md.
- README com instalação, variáveis de ambiente, comandos de seed, desenvolvimento e build.
- Um teste de ponta a ponta no backend que percorre os critérios de aceite do SPEC.md (cliente com CPF e telefones, dois veículos, orçamento e OS com itens e total, numeração, troca de dono do veículo, bloqueios de exclusão, rotas sem sessão recusadas).

Ao final, rode todos os checks do AGENTS.md e me mostre a saída. Corrija o que falhar antes de dizer que terminou. Não adicione dependências sem perguntar.
````

---

## Prompt de revisão (use depois de cada fatia)

Rode numa sessão nova, para o revisor não carregar o contexto de quem implementou.

````text
Você é um revisor. Leia o AGENTS.md e o SPEC.md. Revise apenas o diff desta branch contra a develop (git diff develop...HEAD).

Procure: bugs, violações das regras do AGENTS.md, divergências do SPEC.md, validações ausentes, testes que não testam nada e mudanças fora do escopo da fatia.

Não edite arquivos. Liste os achados por gravidade (alta, média, baixa), cada um com arquivo, linha e uma sugestão curta de correção.
````
