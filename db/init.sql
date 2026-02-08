-- db/init.sql
-- Schema mínimo para o desafio: users, messages, appointments, reminder_state

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- USERS
-- =========================
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  is_blocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (email);

-- =========================
-- MESSAGES (UI chat history)
-- =========================
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- 'system' é útil para lembretes/avisos operacionais
  direction text NOT NULL CHECK (direction IN ('user', 'bot', 'system')),

  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Melhor índice para polling por "mensagens mais novas"
CREATE INDEX IF NOT EXISTS messages_user_id_created_at_idx
  ON public.messages (user_id, created_at);

-- (Opcional, mas bom) se você fizer polling por id e ordenar por created_at,
-- esse índice pode ajudar em algumas consultas:
-- CREATE INDEX IF NOT EXISTS messages_user_id_id_idx
--   ON public.messages (user_id, id);


-- =========================
-- APPOINTMENTS
-- =========================
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  scheduled_for timestamptz NOT NULL,
  title text NOT NULL,
  description text NULL,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'cancelado', 'realizado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS appointments_user_id_idx
  ON public.appointments (user_id);

CREATE INDEX IF NOT EXISTS appointments_status_scheduled_for_idx
  ON public.appointments (status, scheduled_for);

-- =========================
-- REMINDER STATE
-- controla lembretes de 15 min e supressão após 2 lembretes
-- =========================
CREATE TABLE IF NOT EXISTS public.reminder_state (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  last_bot_message_at timestamptz NULL,
  last_user_message_at timestamptz NULL,
  reminder_count integer NOT NULL DEFAULT 0,
  is_suppressed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- (Opcional) trigger simples para updated_at (sem overengineering)
-- Para o desafio, atualizar updated_at pode ser feito pelo n8n mesmo.

-- =========================
-- APPOINTMENT DRAFTS
-- estado temporário para confirmação de agendamento
-- =========================
CREATE TABLE IF NOT EXISTS public.appointment_drafts (
  user_id uuid PRIMARY KEY
    REFERENCES public.users(id)
    ON DELETE CASCADE,

  payload jsonb NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now()
);

