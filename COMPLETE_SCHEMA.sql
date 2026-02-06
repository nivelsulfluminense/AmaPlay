-- ============================================
-- AMAPLAY - COMPLETE DATABASE SCHEMA (UPDATED)
-- ============================================
-- Criado em: 2026-02-01
-- Atualizado em: 2026-02-01
-- Descrição: Schema completo com todas as tabelas, RLS, triggers e índices
-- Versão: 2.0 - Reset completo com estrutura corrigida
-- ============================================

-- Este arquivo é uma referência do schema completo.
-- Para aplicar em um banco novo, use FULL_DATABASE_RESET.sql
-- ============================================

-- ESTRUTURA COMPLETA:
-- 
-- 1. TABELAS (8):
--    - teams
--    - profiles  
--    - team_members
--    - notifications
--    - transactions
--    - inventory
--    - game_events
--    - event_participants
--
-- 2. ÍNDICES (18)
-- 3. TRIGGERS (7)
-- 4. FUNÇÕES (3)
-- 5. POLÍTICAS RLS (21)
--
-- ============================================

-- Para ver o schema completo e executável,
-- consulte o arquivo: FULL_DATABASE_RESET.sql

-- ============================================
-- RESUMO DAS TABELAS
-- ============================================

/*
TEAMS
-----
- id (UUID, PK)
- name (TEXT)
- location (TEXT)
- logo (TEXT)
- primary_color (TEXT) DEFAULT '#13ec5b'
- secondary_color (TEXT) DEFAULT '#ffffff'
- description (TEXT)
- is_public (BOOLEAN) DEFAULT TRUE
- creator_id (UUID, FK → profiles.id)
- member_count (INTEGER) DEFAULT 0
- has_first_manager (BOOLEAN) DEFAULT FALSE
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)

PROFILES
--------
- id (UUID, PK, FK → auth.users.id)
- email (TEXT)
- name (TEXT) DEFAULT 'Visitante'
- role (TEXT) DEFAULT 'player'
- intended_role (TEXT) DEFAULT 'player'
- avatar (TEXT)
- card_avatar (TEXT)
- team_id (UUID, FK → teams.id)
- phone (TEXT)
- birth_date (DATE)
- address (JSONB)
- position (TEXT)
- stats (JSONB) DEFAULT '{"pace": 50, ...}'
- ovr (INTEGER) DEFAULT 50
- max_scout (INTEGER) DEFAULT 0
- vote_count (INTEGER) DEFAULT 0
- has_voted (BOOLEAN) DEFAULT FALSE
- is_public (BOOLEAN) DEFAULT TRUE
- is_setup_complete (BOOLEAN) DEFAULT FALSE
- status (TEXT) DEFAULT 'pending'
- is_approved (BOOLEAN) DEFAULT FALSE
- is_first_manager (BOOLEAN) DEFAULT FALSE
- heart_team (TEXT)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)

TEAM_MEMBERS
------------
- id (UUID, PK)
- team_id (UUID, FK → teams.id)
- profile_id (UUID, FK → profiles.id)
- role (TEXT) DEFAULT 'player'
- is_team_approved (BOOLEAN) DEFAULT FALSE
- joined_at (TIMESTAMPTZ)
- UNIQUE(team_id, profile_id)

NOTIFICATIONS
-------------
- id (UUID, PK)
- user_id (UUID, FK → profiles.id)
- type (TEXT)
- title (TEXT)
- message (TEXT)
- data (JSONB)
- status (TEXT) DEFAULT 'pending'
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)

TRANSACTIONS
------------
- id (UUID, PK)
- team_id (UUID, FK → teams.id)
- creator_id (UUID, FK → profiles.id)
- type (TEXT)
- amount (DECIMAL(12,2))
- description (TEXT)
- category (TEXT)
- transaction_date (DATE)
- status (TEXT) DEFAULT 'pending'
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)

INVENTORY
---------
- id (UUID, PK)
- team_id (UUID, FK → teams.id)
- creator_id (UUID, FK → profiles.id)
- name (TEXT)
- category (TEXT)
- quantity (INTEGER) DEFAULT 0
- max_quantity (INTEGER) DEFAULT 0
- status (TEXT) DEFAULT 'good'
- image (TEXT)
- color (TEXT)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)

GAME_EVENTS
-----------
- id (UUID, PK)
- team_id (UUID, FK → teams.id)
- creator_id (UUID, FK → profiles.id)
- type (TEXT) DEFAULT 'game'
- title (TEXT)
- opponent (TEXT)
- event_date (DATE)
- event_time (TIME)
- location (TEXT)
- confirmed_count (INTEGER) DEFAULT 0
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)

EVENT_PARTICIPANTS
------------------
- id (UUID, PK)
- event_id (UUID, FK → game_events.id)
- user_id (UUID, FK → profiles.id)
- status (TEXT) DEFAULT 'pending'
- created_at (TIMESTAMPTZ)
- UNIQUE(event_id, user_id)
*/

-- ============================================
-- FUNÇÕES PRINCIPAIS
-- ============================================

/*
1. handle_updated_at()
   - Atualiza automaticamente o campo updated_at
   - Trigger: BEFORE UPDATE em todas as tabelas

2. handle_new_user()
   - Cria perfil automaticamente quando usuário se registra
   - Trigger: AFTER INSERT em auth.users

3. confirm_promotion(notification_id UUID)
   - RPC segura para confirmar promoções
   - Atualiza role do usuário
   - Marca notificação como aceita
*/

-- ============================================
-- POLÍTICAS RLS (RESUMO)
-- ============================================

/*
PROFILES (5 políticas):
- INSERT: Próprio perfil
- SELECT: Próprio perfil, colegas de time, perfis públicos
- UPDATE: Próprio perfil

TEAMS (3 políticas):
- SELECT: Todos (para busca)
- INSERT: Autenticados
- UPDATE: Criador ou gestores

TEAM_MEMBERS (2 políticas):
- SELECT: Membros do time
- ALL: Gestores

NOTIFICATIONS (3 políticas):
- SELECT: Próprias notificações
- INSERT: Gestores
- UPDATE: Próprias notificações

TRANSACTIONS (2 políticas):
- SELECT: Membros do time
- ALL: Gestores

INVENTORY (2 políticas):
- SELECT: Membros do time
- ALL: Gestores

GAME_EVENTS (2 políticas):
- SELECT: Membros do time
- ALL: Gestores

EVENT_PARTICIPANTS (2 políticas):
- SELECT: Membros do time
- ALL: Própria participação
*/

-- ============================================
-- ÍNDICES (RESUMO)
-- ============================================

/*
PROFILES:
- idx_profiles_team_id
- idx_profiles_email
- idx_profiles_status
- idx_profiles_is_approved
- idx_profiles_role

TEAM_MEMBERS:
- idx_team_members_team_id
- idx_team_members_profile_id

NOTIFICATIONS:
- idx_notifications_user_id
- idx_notifications_status

TRANSACTIONS:
- idx_transactions_team_id
- idx_transactions_date

INVENTORY:
- idx_inventory_team_id

GAME_EVENTS:
- idx_game_events_team_id
- idx_game_events_date

EVENT_PARTICIPANTS:
- idx_event_participants_event_id
- idx_event_participants_user_id
*/

-- ============================================
-- PARA APLICAR ESTE SCHEMA
-- ============================================
-- Execute o arquivo: FULL_DATABASE_RESET.sql
-- Consulte o guia: DATABASE_RESET_GUIDE.md
-- ============================================
