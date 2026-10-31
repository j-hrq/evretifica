# Oficina OS — Especificação do MVP

App web para uma oficina mecânica registrar clientes, veículos, orçamentos e ordens de serviço (OS).

> Fonte de verdade do produto. O diagrama `docs/modelo-de-dados.drawio` é a base do modelo de dados, mas
> está defasado em relação a este documento (`Pessoa`, `Telefone`, `numero` e `cliente_id` nos documentos,
> datas e km). Em caso de divergência, vale este documento.
> Itens marcados com **(a confirmar)** são premissas ainda não validadas.

## Decisões já tomadas

- Backend: Python + FastAPI + SQLite. Frontend: React + Vite + shadcn/ui (Tailwind v4).
- Orçamento e OS são **entidades separadas, sem relação entre si** por enquanto.
- Orçamentos e OS têm **itens** com quantidade e valor; cada linha aponta para um `Item` do cadastro, que é a categoria do serviço.
- **Login único** da oficina no MVP: um usuário criado por script, sem tela de cadastro de usuários. Mais usuários ficam para depois.
- `Pessoa` é uma tabela própria, **ou física ou jurídica, nunca as duas**. `Cliente` e `Usuario` apontam para ela por `pessoa_id`.
- Telefones ficam em tabela própria, ligada à pessoa por uma tabela de ligação.
- Orçamento e OS guardam o **cliente do momento** (`cliente_id`): trocar o dono do veículo depois não altera documentos antigos.
- Orçamentos e OS têm número sequencial no formato `NNN-AAAA-ORC` e `NNN-AAAA-OS`.
- Toda entidade com status usa o mesmo enum `SituacaoAvaliacao`.
- Nomes de classes, tabelas, colunas e rotas em português, como no diagrama.

## Escopo do MVP

- Login e logout
- CRUD de clientes, com pessoa física ou jurídica e telefones
- CRUD de marcas de veículo
- CRUD de veículos (cada veículo pertence a um cliente e tem uma marca)
- CRUD de itens (categorias de serviço que entram em orçamentos e OS)
- CRUD de orçamentos, com número, validade, itens e campo de descrição (observações)
- CRUD de ordens de serviço, com número, km de entrada, itens e campo de descrição (observações)
- Listagens com busca e filtro por status

## Fora do MVP

- Vínculo ou conversão entre orçamento e OS
- Cadastro de usuários e permissões
- PDF, impressão, envio por e-mail ou WhatsApp
- Financeiro, pagamentos, estoque de peças, nota fiscal
- Várias oficinas, app mobile

## Convenção de nomes

Seguem o diagrama: classes em PascalCase (`OrdemServico`), tabelas e colunas em snake_case sem acento (`data_criacao`, `pessoa_fisica_id`), rotas em kebab-case. Textos de interface em português. Membros de enum também sem acento (`CONCLUIDO`, `EM_ANDAMENTO`).

## Entidades

Todas têm `id`, `data_criacao` e `data_alteracao` (data e hora em UTC), exceto a tabela de ligação `pessoa_telefone`. Apliquei as datas também às tabelas que foram descritas sem elas (`Item`, `PessoaFisica`, `PessoaJuridica`, `Telefone`) por uniformidade **(a confirmar)**.

Obrigatoriedade quase nunca foi informada; as marcações abaixo são premissas **(a confirmar)**.

### Pessoa e contatos

**Pessoa**
- `nome` — obrigatório
- `email` — opcional
- `pessoa_fisica_id` — FK para `PessoaFisica`, única
- `pessoa_juridica_id` — FK para `PessoaJuridica`, única
- Exatamente um dos dois preenchido (restrição `CHECK`): toda pessoa é física ou jurídica, portanto todo cliente e todo usuário têm CPF ou CNPJ

**PessoaFisica**
- `cpf` — só dígitos, com validação dos dígitos verificadores; único

**PessoaJuridica**
- `cnpj` — só dígitos, com validação dos dígitos verificadores; único

**Telefone**
- `ddd` — 2 dígitos
- `telefone` — só dígitos (8 ou 9)
- `tipo_id` — `TipoTelefone`

**pessoa_telefone** — tabela de ligação, sem `id` nem datas
- `pessoa_id` e `telefone_id`, chave primária composta

**Cliente**
- `pessoa_id` — obrigatório, único (FK `Pessoa`)
- `ativo` — padrão `true`

**Usuario**
- `pessoa_id` — obrigatório, único (FK `Pessoa`)
- `login` — obrigatório e único
- `senha` — obrigatória; guardada só como hash, nunca em texto puro

### Veículos e itens

**MarcaVeiculo**
- `nome` — obrigatório e único
- `ativo` — padrão `true`

**Veiculo**
- `cliente_id` — obrigatório (FK `Cliente`), o dono atual
- `marca_id` — obrigatório (FK `MarcaVeiculo`)
- `modelo` — texto, obrigatório
- `placa` — obrigatória e única; normalizada em maiúsculas e sem hífen; aceita o padrão antigo e o Mercosul
- `ano_fabricacao` e `ano_modelo` — inteiros de 4 dígitos, opcionais; exibidos como `AAAA/AAAA`
- `cor` — texto, opcional
- `km` — inteiro (quilometragem), opcional
- `observacao` — texto livre, opcional

**Item** — categoria do serviço
- `nome` — obrigatório
- `ativo` — padrão `true`

### Orçamentos e ordens de serviço

**Orcamento**
- `numero` — gerado pelo backend, único, só leitura (ex.: `001-2026-ORC`)
- `cliente_id` — FK `Cliente`; definido pelo backend (veja a regra 5), só leitura na API
- `veiculo_id` — obrigatório (FK `Veiculo`)
- `status_id` — `SituacaoAvaliacao`, padrão `PENDENTE`
- `data_emissao` — data, padrão hoje
- `validade_dias` — inteiro positivo definido pelo usuário, opcional. O vencimento (`data_emissao + validade_dias`) é calculado
- `descricao` — texto livre (observações), opcional
- `itens` — lista de `ItemOrcamento`
- `total` — calculado

**OrdemServico**
- `numero` — gerado pelo backend, único, só leitura (ex.: `001-2026-OS`)
- `cliente_id` — FK `Cliente`; definido pelo backend (veja a regra 5), só leitura na API
- `veiculo_id` — obrigatório (FK `Veiculo`)
- `km_entrada` — inteiro, quilometragem na entrada na oficina, opcional
- `status_id` — `SituacaoAvaliacao`, padrão `PENDENTE`
- `descricao` — texto livre (observações), opcional
- `itens` — lista de `ItemOrdemServico`
- `total` — calculado

**ItemOrcamento** e **ItemOrdemServico** — mesmo formato, tabelas separadas
- `orcamento_id` / `ordem_servico_id` — FK obrigatória (o diagrama mostra a lista no pai; a FK fica na linha)
- `item_id` — FK `Item`, obrigatório
- `tipo_id` — `TipoItem`, obrigatório
- `valor_unitario` — inteiro, em centavos
- `quantidade` — decimal com até 2 casas (permite horas de mão de obra)

## Enums

No código são `IntEnum`; o código numérico é o valor gravado em `status_id` e `tipo_id`. Não há tabelas de apoio. Novos valores entram com novos códigos; nunca renumere nem reutilize um código.

**SituacaoAvaliacao** — usado por toda entidade que tem status

| Código | Nome |
|---|---|
| 1 | `PENDENTE` |
| 2 | `EM_ANDAMENTO` |
| 3 | `CONCLUIDO` |
| 4 | `ACEITO` |
| 5 | `RECUSADO` |
| 6 | `CANCELADO` |

**TipoItem** — escolhido pelo usuário ao adicionar cada item a um orçamento ou OS

| Código | Nome |
|---|---|
| 1 | `MAO_DE_OBRA` |
| 2 | `AQUISICAO` |
| 3 | `AMBOS` |

**TipoTelefone**

| Código | Nome |
|---|---|
| 1 | `CELULAR` |
| 2 | `FIXO` |
| 3 | `WHATSAPP` |
| 4 | `COMERCIAL` |

## Relacionamentos

- `Pessoa` 1 — 0..1 `Cliente`
- `Pessoa` 1 — 0..1 `Usuario`
- `Pessoa` N — 1 `PessoaFisica` ou `PessoaJuridica` (exatamente uma; cada PF/PJ pertence a uma só pessoa)
- `Pessoa` N — N `Telefone`, por `pessoa_telefone`
- `Cliente` 1 — N `Veiculo`
- `Cliente` 1 — N `Orcamento` e 1 — N `OrdemServico` (cliente do documento)
- `MarcaVeiculo` 1 — N `Veiculo`
- `Veiculo` 1 — N `Orcamento`
- `Veiculo` 1 — N `OrdemServico`
- `Orcamento` 1 — N `ItemOrcamento`
- `OrdemServico` 1 — N `ItemOrdemServico`
- `Item` 1 — N `ItemOrcamento` e 1 — N `ItemOrdemServico`
- `Orcamento` e `OrdemServico` não se relacionam diretamente

## Regras de negócio

1. Valores monetários em centavos (inteiro), nunca `float`. Total da linha = `quantidade × valor_unitario`, arredondado para centavos. `total` do documento = soma das linhas, calculado pelo backend na leitura (não é gravado).
2. Status: a troca entre valores de `SituacaoAvaliacao` é livre no MVP, sem máquina de estados **(a confirmar)**.
3. Numeração: `NNN-AAAA-ORC` para orçamentos e `NNN-AAAA-OS` para OS. `NNN` é um contador de 3 dígitos com zeros à esquerda (passando de 999, ganha mais dígitos), separado por tipo e reiniciado a cada ano **(a confirmar)**. `AAAA` é o ano de `data_emissao` (orçamento) ou de `data_criacao` (OS); na OS o pedido trazia `AAA`, e assumi o ano com 4 dígitos, como no orçamento **(a confirmar)**. O número é gerado pelo backend de forma atômica, único, imutável e nunca reutilizado, mesmo após exclusões. Exemplos: `001-2026-ORC`, `001-2026-OS`.
4. Validade do orçamento: o usuário informa `validade_dias`, e o vencimento é `data_emissao + validade_dias`, calculado. Não há mudança automática de status ao vencer.
5. Cliente do documento: o backend preenche `cliente_id` com o dono atual do veículo ao criar o orçamento ou a OS e quando o `veiculo_id` do documento é trocado. Trocar o dono do veículo depois não altera `cliente_id` dos documentos existentes. A API não aceita `cliente_id` no envio.
6. Exclusão bloqueada (409) quando houver vínculos: cliente com veículos, orçamentos ou OS; marca com veículos; veículo com orçamentos ou OS; item usado em alguma linha. Para tirar cliente, marca ou item de uso, use `ativo = false`: registros inativos não aparecem nos seletores de novos lançamentos, mas continuam nos registros antigos.
7. Excluir um cliente sem vínculos também remove a sua pessoa (com PF/PJ e telefones), desde que a pessoa não esteja ligada a um usuário **(a confirmar)**.
8. CPF, CNPJ e placa são únicos.
9. Toda rota, exceto o login, exige sessão.

## Telas

- **Login**
- **Cada cadastro** (clientes, marcas, veículos, itens, orçamentos, OS): lista com busca, filtro de status (quando houver) e paginação; formulário de criar e editar; excluir (ou inativar) com confirmação.
- **Cliente:** nome, e-mail, documento obrigatório (escolher CPF ou CNPJ), lista editável de telefones (DDD, número e tipo) e o campo ativo.
- **Orçamento:** escolher o veículo (busca por placa ou cliente, mostrando o cliente); data de emissão; validade em dias, mostrando o vencimento; tabela de itens editável, onde cada linha tem item do cadastro, tipo, quantidade e valor unitário; total atualizado enquanto digita; campo de descrição. O número aparece depois de salvo.
- **OS:** escolher o veículo; km de entrada; tabela de itens e total como no orçamento; campo de descrição. O número aparece depois de salva.

## API

- JSON sob `/api`, REST: `/api/auth`, `/api/clientes`, `/api/marcas-veiculo`, `/api/veiculos`, `/api/itens`, `/api/orcamentos`, `/api/ordens-servico`.
- Campos em snake_case, iguais aos do backend.
- Cliente é enviado e recebido com a pessoa aninhada (nome, e-mail, CPF ou CNPJ e telefones). O backend grava `Pessoa`, `PessoaFisica` ou `PessoaJuridica`, `Telefone` e `pessoa_telefone` numa só transação. Não há rota própria de pessoa no MVP.
- Itens são enviados e recebidos dentro do orçamento ou da OS, não em rotas próprias.
- `numero` e `cliente_id` de orçamentos e OS são só leitura.
- Listagens aceitam `?q=` (busca; em orçamentos e OS também pelo número), `?status_id=` (quando houver), `?page=` e `?per_page=`.
- Erros no formato `{"detail": ...}`, com códigos HTTP corretos (400/401/404/409/422).

## Autenticação

- Login e senha ficam na tabela `usuario` (senha só como hash), ligada a uma `Pessoa`. Um script de seed cria a pessoa e o usuário da oficina, com nome, CPF ou CNPJ, login e senha informados na execução. Não há tela de cadastro de usuários no MVP.
- Sessão por cookie `HttpOnly` assinado.
- Em desenvolvimento, o Vite faz proxy de `/api` para o FastAPI. Em produção, o FastAPI serve o build do frontend (mesma origem, sem CORS).

## Dados iniciais (seed)

Usuário da oficina (script) e uma lista de marcas de veículo comuns **(a confirmar)**.

## Ordem de implementação

Uma fatia por vez, cada uma com testes, em branch própria e commit pequeno.

1. **Esqueleto:** backend FastAPI + SQLite + Alembic, frontend Vite + Tailwind v4 + shadcn/ui, proxy de dev, rota de saúde com teste.
2. **Base de pessoa:** modelos, migration e serviços de `Pessoa`, `PessoaFisica`, `PessoaJuridica`, `Telefone` e `pessoa_telefone`, com validação de CPF e CNPJ e a restrição de exatamente um dos dois. Só backend e testes, sem rotas nem telas.
3. **Login único:** tabela `usuario`, script de seed, sessão (backend e tela).
4. **Clientes**, ponta a ponta, usando a base de pessoa. Esta fatia define os padrões que as demais seguem.
5. **Marcas de veículo.**
6. **Veículos.**
7. **Itens** (categorias de serviço).
8. **Orçamentos** com número, validade, itens e total.
9. **Ordens de serviço** com número, km de entrada, itens e total.
10. **Acabamento:** busca, filtros, mensagens de erro, estados vazios.

## Critérios de aceite do MVP

- Consigo cadastrar um cliente (com CPF ou CNPJ e telefones) com dois veículos, criar um orçamento e uma OS para um deles, com itens, e ver o total correto.
- O orçamento recebe número no formato `001-2026-ORC` e a OS, `001-2026-OS`, sem repetição.
- Trocar o dono de um veículo não muda o cliente mostrado nos documentos antigos.
- Não consigo excluir um cliente que tenha veículos, orçamentos ou OS.
- CPF, CNPJ ou placa inválidos ou repetidos são recusados, e uma pessoa não pode ter CPF e CNPJ ao mesmo tempo.
- Qualquer rota da API sem sessão é recusada, exceto o login.
- Testes, lint e build passam no backend e no frontend.

## Questões em aberto

- Como orçamento e OS se relacionam (conversão, vínculo ou nada).
- Impressão ou PDF do orçamento e da OS.
- Datas de abertura e fechamento da OS.
- Se o km de entrada da OS atualiza o `km` do veículo.
- Mais usuários e permissões, nas próximas atualizações.
