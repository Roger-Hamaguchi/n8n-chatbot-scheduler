# Chatbot com Agendamento e Bloqueio – n8n

## Visão Geral

Este projeto implementa um chatbot backend-first utilizando o n8n como orquestrador central, com foco em clareza arquitetural, regras explícitas e controle determinístico do fluxo.

O sistema foi desenvolvido como solução para um desafio técnico, priorizando previsibilidade, separação de responsabilidades e aderência rigorosa às regras de negócio propostas.

Funcionalidades principais:
- Conversação via LLM (interpretação de linguagem apenas)
- Criação, consulta, atualização e cancelamento de agendamentos
- Confirmação explícita antes de qualquer ação crítica
- Bloqueio e desbloqueio de usuários
- Lembretes automáticos por inatividade (timeout de 15 minutos)
- Supressão automática após o segundo lembrete
- Persistência explícita de mensagens para polling do frontend

O frontend é uma interface simples de chat em React, usada exclusivamente para validação funcional da integração com o backend.

---

Demo em Produção (Frontend)
https://n8n-chatbot-scheduler.vercel.app  

O frontend está hospedado na Vercel e se comunica diretamente com os webhooks
do backend em produção (n8n Cloud).


---

## Stack Utilizada

- Orquestração / Backend: n8n (Cloud)
- Banco de Dados: PostgreSQL (Supabase)
- LLM: OpenAI (API)
- Frontend: Chat simples em React (Vite)
- Infraestrutura:
  - Desenvolvimento: Docker + Docker Compose
  - Produção: n8n Cloud + Supabase + Vercel

---

## Arquitetura Geral

Princípios adotados:

- Existe um único fluxo principal que conversa com o usuário.
- Fluxos auxiliares funcionam como serviços determinísticos.
- O LLM não controla fluxo nem estado, apenas interpreta linguagem.
- Regras de negócio, estado e persistência ficam fora do modelo.
- Toda ação crítica exige confirmação explícita.
- Mensagens exibidas ao usuário são persistidas de forma explícita.
- O sistema evita dependência excessiva de memória implícita da LLM.

---

## Fluxos no n8n

### Fluxo Principal – /chat

Responsável por:

- Receber mensagens do frontend via webhook.
- Criar ou buscar o usuário pelo email.
- Persistir a mensagem do usuário.
- Verificar se o usuário está bloqueado.
- Injetar contexto auxiliar (ex.: existência de rascunho).
- Acionar o AI Agent (LLM com memória persistente).
- Classificar intenção via parser determinístico.
- Orquestrar ações conforme o intent retornado:
  - Conversa simples
  - Criação de rascunho de agendamento
  - Confirmação de criação
  - Atualização ou cancelamento de agendamentos
  - Bloqueio de usuário
- Persistir a resposta final do bot.
- Retornar a resposta ao frontend.

Este é o único fluxo que responde diretamente ao usuário.

---

## Fluxos Auxiliares (Serviços)

Esses fluxos não conversam com o usuário. Executam apenas lógica de negócio.

- /api/v1/rascunho-agendamento
  - Cria ou atualiza um rascunho de agendamento
  - Não cria o agendamento definitivo

- /api/v1/agendamento (POST | PUT | DELETE)
  - Confirma criação de agendamento a partir de rascunho
  - Atualiza ou cancela agendamentos existentes
  - Retorna o registro atualizado

- /api/v1/agendamentos (GET)
  - Lista agendamentos do usuário
  - Usado como fonte da verdade para leitura

- /api/v1/bloqueio
  - Bloqueia o usuário (is_blocked = true)

- /api/v1/desbloqueio
  - Desbloqueia o usuário

- reminder.worker
  - Executado via cron
  - Envia lembretes após inatividade do usuário

Esses fluxos são chamados exclusivamente pelo fluxo principal ou pelo cron.

---

## Regras de Negócio

### Usuário

- Email é único.
- Usuário pode ser bloqueado.
- Usuário bloqueado:
  - Não chega à LLM.
  - Recebe resposta padrão imediata.
- O desbloqueio é feito via endpoint dedicado, acionado pelo frontend.

---

### Agendamentos

- Toda criação exige confirmação explícita.
- O usuário nunca manipula diretamente IDs internos.

Fluxo de criação:
1. Usuário informa dados
2. Criação de rascunho
3. Solicitação de confirmação
4. Usuário responde “sim” ou “não”
5. Criação definitiva ou descarte do rascunho

Fluxo de atualização:
- Listagem dos agendamentos do usuário
- Seleção por índice/contexto conversacional
- Coleta das alterações
- Apresentação de antes/depois
- Confirmação explícita
- Atualização do registro

Fluxo de cancelamento:
- Seleção
- Confirmação explícita
- Cancelamento lógico

Campos obrigatórios:
- Data e hora
- Título

Status possíveis:
- pendente
- cancelado
- realizado

---

### Lembretes por Inatividade

- Após 15 minutos sem resposta do usuário, um lembrete é enviado.
- Máximo de 2 lembretes automáticos.
- Após o segundo lembrete sem resposta:
  - O sistema suprime novas mensagens automáticas.
- O controle é feito via tabela dedicada de estado (reminder_state).

### Observação sobre uso em produção

O fluxo de lembretes por inatividade (reminder.worker) está implementado e funcional, porém pode permanecer desativado em produção.

Motivo:
- Em ambientes com n8n Cloud, especialmente no plano gratuito, execuções recorrentes via cron consomem créditos rapidamente.
- Para evitar consumo desnecessário, recomenda-se ativar o reminder apenas quando houver necessidade real ou em ambientes com plano adequado.

Essa decisão é intencional e faz parte da governança de custo do projeto.

---

## Persistência de Mensagens e Polling

As mensagens exibidas no frontend são persistidas explicitamente na tabela messages.

Campos principais:
- user_id
- direction (user | bot | system)
- content
- created_at

O frontend utiliza polling via webhook para buscar novas mensagens, com uso de cursor temporal.

Webhook:
- GET /get-messages

Funcionamento:
- Primeira chamada retorna histórico completo e um cursor (after_ts).
- Chamadas subsequentes retornam apenas mensagens posteriores ao cursor.
- Caso não haja novas mensagens, a lista retornada é vazia.
- Mensagens dos tipos user, bot e system são retornadas e renderizadas.

Essa abordagem foi adotada para manter simplicidade e evitar dependência de WebSockets.

---

## Identidade do Usuário (user_id)

- O user_id é gerado exclusivamente pelo backend.
- O fluxo /chat cria ou recupera o usuário e retorna seu user_id na resposta.
- O frontend nunca gera UUIDs.
- O frontend persiste o user_id em localStorage após a primeira resposta.
- Em reloads ou novas mensagens, o user_id persistido é reutilizado.
- O polling e a leitura de mensagens dependem exclusivamente desse user_id.

Essa decisão garante isolamento correto entre usuários e evita mistura de conversas.

---

## Modelagem de Dados

O schema mínimo (Supabase) está em db/init.sql.

### users
- id
- name
- email
- is_blocked
- created_at
- updated_at

### appointment_drafts
- user_id
- payload
- created_at

### appointments
- id
- user_id
- title
- description
- scheduled_for
- status
- created_at
- updated_at

### messages
- id
- user_id
- direction (user | bot | system)
- content
- created_at

### reminder_state
- user_id
- last_bot_message_at
- last_user_message_at
- reminder_count
- is_suppressed
- updated_at

---

## Memória Conversacional

- Gerenciada automaticamente pelo n8n.
- Tabela utilizada: n8n_chat_histories
- Não faz parte do domínio da aplicação.
- Usada apenas como contexto interno para o AI Agent.

---

## Documentação da API

A API é exposta via Webhooks do n8n.

Em produção (n8n Cloud), os endpoints seguem este padrão:
- BASE_URL = https://automacaoai.app.n8n.cloud

Endpoints principais:
- POST /webhook/chat
- GET  /webhook/get-messages
- POST /webhook/api/v1/bloqueio
- POST /webhook/api/v1/desbloqueio

### Observação sobre uso de IDs nos endpoints

Embora o enunciado do desafio mencione endpoints REST no formato `/api/v1/agendamento/:id`, neste projeto os IDs internos de agendamentos não são expostos diretamente no path.

Decisão arquitetural:
- O frontend nunca manipula UUIDs de agendamentos.
- A seleção de agendamentos é feita por índice (posição na lista) ou por contexto conversacional.
- O backend resolve internamente o ID correto antes de executar ações de update ou delete.

Essa abordagem é comum em sistemas conversacionais, reduz acoplamento com o cliente e evita erros por manipulação incorreta de identificadores técnicos.

---

## Exemplos de Requests (curl)

Defina:
- BASE_URL=https://automacaoai.app.n8n.cloud

1) Enviar mensagem
curl -X POST "$BASE_URL/webhook/chat" \
  -H "Content-Type: application/json" \
  -d '[{"name":"Teste","email":"teste@example.com","message":"Olá!"}]'

2) Buscar mensagens
curl "$BASE_URL/webhook/get-messages?user_id=SEU_USER_ID"

3) Bloquear usuário
curl -X POST "$BASE_URL/webhook/api/v1/bloqueio" \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@example.com"}'

4) Desbloquear usuário
curl -X POST "$BASE_URL/webhook/api/v1/desbloqueio" \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@example.com"}'

---

## Comunicação Frontend ↔ Backend

### Envio de mensagem
POST /chat

Payload:
- name
- email
- message

Resposta:
- reply
- user_id

---

### Leitura de mensagens
GET /get-messages

Parâmetros:
- user_id
- after_ts (opcional)

---

## Execução Local (Desenvolvimento)

Subir o ambiente local:
docker compose -f docker-compose.dev.yml up -d

Após subir, acesse:
http://localhost:5678

---

## Execução em Produção

O backend do projeto está implantado no n8n Cloud e o frontend é publicado na Vercel.

Configuração necessária no frontend (Vercel):
- VITE_API_URL=https://automacaoai.app.n8n.cloud

---

## Configuração do Frontend (Vite)

Em desenvolvimento local, o frontend pode usar proxy do Vite (vite.config.ts), permitindo chamadas relativas a /webhook sem necessidade de .env.

Em produção (Vercel), o frontend utiliza a variável:
- VITE_API_URL

Um arquivo de exemplo está disponível em:
- frontend/.env.example

---

## Configuração de Credenciais no n8n

### Desenvolvimento (Docker)

- Credencial PostgreSQL
  - Host: postgres
  - Database: chatbot
  - User: chatbot
  - Password: chatbot
  - Port: 5432

- Credencial OpenAI
  - Informar sua API Key válida

---

### Produção (n8n Cloud + Supabase)

- Credencial PostgreSQL (Session Pooler)
  - Host: session pooler do Supabase
  - Database: postgres
  - User: postgres.<project_ref>
  - Password: senha do banco
  - Port: 5432
  - SSL: true

- Credencial OpenAI
  - Informar sua API Key válida

---

## Como configurar a API de LLM (OpenAI)

O projeto utiliza a API da OpenAI via credencial no n8n.

Passos:
1) Crie uma API Key na OpenAI.
2) No n8n, crie uma credencial do tipo OpenAI.
3) Associe essa credencial ao node do AI Agent no workflow principal (/chat).

Observação:
- A chave deve ser configurada apenas no n8n.
- O frontend não armazena nem utiliza chave de LLM.

---

## Diferenciais (Bônus)

### Prevenção de Prompt Injection

O sistema adota uma abordagem arquitetural para mitigação de prompt injection:

- O LLM não possui acesso direto ao banco, estado ou ações.
- O modelo não executa comandos nem altera fluxo.
- Todas as ações passam por validação determinística e confirmação explícita.
- Tentativas de manipulação do prompt não produzem efeitos colaterais.

---

### Exposição de API Externa

Todas as operações de agendamento e bloqueio são expostas via endpoints HTTP independentes do frontend.

Os endpoints podem ser consumidos diretamente por:
- Postman
- Insomnia
- curl
- Outros backends

O frontend atua apenas como cliente de teste.

---

## Observações Importantes

- O projeto prioriza clareza, previsibilidade e baixo acoplamento.
- IDs internos não são expostos no fluxo conversacional por decisão arquitetural consciente.
- O ambiente Docker é destinado exclusivamente ao desenvolvimento local.
- Em produção, o sistema roda em n8n Cloud + Supabase + Vercel.

---

## Decisões Arquiteturais

- Um único fluxo conversa com o usuário.
- Serviços auxiliares são determinísticos.
- Estado crítico vive no banco de dados.
- O LLM interpreta linguagem, não decide regras.
- Confirmações explícitas evitam efeitos colaterais.
- Polling foi escolhido por simplicidade e confiabilidade.
- As decisões refletem cenários reais de chatbots conversacionais.
