# Esquema do Banco de Dados - AmaPlay

## 📊 Visão Geral

O AmaPlay utiliza PostgreSQL através do Supabase, com Row Level Security (RLS) habilitado em todas as tabelas para garantir isolamento de dados entre times e controle de acesso baseado em roles.

## 🗄️ Diagrama de Entidades e Relacionamentos

```
┌──────────────┐
│   profiles   │ ──┐
└──────────────┘   │
       │           │
       │ 1:N       │
       │           │
       ▼           │ N:1
┌──────────────┐   │
│team_members  │   │
└──────────────┘   │
       │           │
       │ N:1       │
       │           │
       ▼           │
┌──────────────┐◄──┘
│    teams     │
└──────────────┘
       │
       │ 1:N
       ├──────────────────┬──────────────────┬──────────────────┐
       │                  │                  │                  │
       ▼                  ▼                  ▼                  ▼
┌─────────────┐    ┌────────────┐    ┌────────────┐    ┌──────────────┐
│transactions │    │ inventory  │    │   events   │    │notifications │
└─────────────┘    └────────────┘    └────────────┘    └──────────────┘
                                            │
                                            │ 1:N
                                            ▼
                                    ┌──────────────────┐
                                    │event_participants│
                                    └──────────────────┘

       ┌────────────────────────────────────┐
       │      Avaliação de Jogadores        │
       ├──────────────┬─────────────────────┤
       ▼              ▼                     
┌──────────────┐ ┌──────────────────┐
│player_votes  │ │  match_ratings   │
└──────────────┘ └──────────────────┘
```

## 📋 Tabelas Principais

### 1. profiles

Armazena informações dos usuários/jogadores.

```sql
CREATE TABLE profiles (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    
    -- Avatar e Imagens
    avatar TEXT,
    card_avatar TEXT,
    
    -- Dados Pessoais
    birth_date TEXT,
    position TEXT CHECK (position IN ('GOL', 'ZAG', 'MEI', 'ATA')),
    address JSONB,
    
    -- Estatísticas
    stats JSONB DEFAULT '{
        "pace": 50,
        "shooting": 50,
        "passing": 50,
        "dribbling": 50,
        "defending": 50,
        "physical": 50
    }'::jsonb,
    ovr INTEGER DEFAULT 50,
    max_scout INTEGER DEFAULT 0,
    vote_count INTEGER DEFAULT 0,
    has_voted BOOLEAN DEFAULT false,
    
    -- Time e Permissões
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    role TEXT DEFAULT 'player' CHECK (
        role IN ('presidente', 'vice-presidente', 'admin', 'player')
    ),
    intended_role TEXT,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (
        status IN ('pending', 'approved', 'rejected')
    ),
    is_approved BOOLEAN DEFAULT false,
    is_first_manager BOOLEAN DEFAULT false,
    
    -- Customizações
    heart_team TEXT,
    is_public BOOLEAN DEFAULT true,
    is_pro BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_profiles_team_id ON profiles(team_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_status ON profiles(status);
```

**Campos Especiais:**

- `stats`: JSONB com atributos de jogador (pace, shooting, etc.)
- `address`: JSONB com informações de endereço e configurações de card
- `intended_role`: Cargo solicitado durante onboarding
- `is_first_manager`: Primeiro usuário a criar o time (sem aprovação)

### 2. teams

Informações dos times.

```sql
CREATE TABLE teams (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT,
    
    -- Visual
    logo TEXT,
    primary_color TEXT DEFAULT '#13EC5B',
    secondary_color TEXT DEFAULT '#ffffff',
    
    -- Gestão
    creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    member_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT true,
    
    -- Financeiro
    monthly_fee_amount DECIMAL(10,2) DEFAULT 0,
    due_day INTEGER DEFAULT 10 CHECK (due_day BETWEEN 1 AND 31),
    launch_day INTEGER DEFAULT 1 CHECK (launch_day BETWEEN 1 AND 31),
    fee_start_date TEXT,
    
    -- Customizações
    inventory_categories TEXT[] DEFAULT ARRAY[
        'Equipamento', 'Médico', 'Treino', 'Uniformes', 'Outros'
    ],
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_teams_creator_id ON teams(creator_id);
CREATE INDEX idx_teams_is_public ON teams(is_public);
```

### 3. team_members

Tabela de relacionamento N:N entre profiles e teams.

```sql
CREATE TABLE team_members (
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'player',
    is_team_approved BOOLEAN DEFAULT false,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (team_id, profile_id)
);

-- Índices
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_profile_id ON team_members(profile_id);
```

### 4. transactions

Controle financeiro completo.

```sql
CREATE TABLE transactions (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Tipo e Valor
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount DECIMAL(10,2) NOT NULL,
    
    -- Detalhes
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    transaction_date TEXT NOT NULL,
    
    -- Status e Aprovação
    status TEXT DEFAULT 'pending' CHECK (
        status IN ('paid', 'pending', 'rejected')
    ),
    
    -- Rastreamento
    created_by_name TEXT,
    target_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    charge_id UUID,
    
    -- Referência (para mensalidades)
    reference_month INTEGER,
    reference_year INTEGER,
    
    -- Comprovante
    proof_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_transactions_team_id ON transactions(team_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_target_user ON transactions(target_user_id);
CREATE INDEX idx_transactions_ref_date ON transactions(reference_month, reference_year);
```

### 5. charges

Cobranças mensais ou extras lançadas pela gestão.

```sql
CREATE TABLE charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    title TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    type TEXT DEFAULT 'monthly' CHECK (type IN ('monthly', 'extra')),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_charges_team_id ON charges(team_id);
```

### 6. receiver_accounts

Dados da conta bancária do time para recebimento.

```sql
CREATE TABLE receiver_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID UNIQUE REFERENCES teams(id) ON DELETE CASCADE,
    
    owner_name TEXT NOT NULL,
    document_number TEXT NOT NULL,
    institution TEXT NOT NULL,
    agency TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_type TEXT NOT NULL,
    pix_key TEXT NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_receiver_accounts_team_id ON receiver_accounts(team_id);
```

### 7. inventory

Estoque de materiais e equipamentos.

```sql
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity INTEGER DEFAULT 0,
    max_quantity INTEGER DEFAULT 0,
    
    status TEXT DEFAULT 'excellent' CHECK (
        status IN ('excellent', 'good', 'fair', 'poor')
    ),
    
    image TEXT,
    color TEXT,
    responsible_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_team_id ON inventory(team_id);
CREATE INDEX idx_inventory_responsible ON inventory(responsible_id);
```

### 8. events

Agenda de jogos, treinos e eventos.

```sql
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    type TEXT NOT NULL CHECK (
        type IN ('game', 'bbq', 'match', 'meeting', 'birthday')
    ),
    title TEXT,
    opponent TEXT,
    
    event_date TEXT NOT NULL,
    time TEXT NOT NULL,
    end_time TEXT,
    location TEXT,
    
    confirmed_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_team_id ON events(team_id);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_type ON events(type);
```

### 9. event_participants

Participantes e confirmações de eventos.

```sql
CREATE TABLE event_participants (
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    status TEXT DEFAULT 'pending' CHECK (
        status IN ('pending', 'confirmed', 'declined')
    ),
    
    responded_at TIMESTAMPTZ,
    
    PRIMARY KEY (event_id, user_id)
);

CREATE INDEX idx_event_participants_event ON event_participants(event_id);
CREATE INDEX idx_event_participants_user ON event_participants(user_id);
```

### 10. notifications

Sistema de notificações e convites.

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    type TEXT NOT NULL CHECK (
        type IN ('promotion_invite', 'general_alert', 'team_join')
    ),
    
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    
    status TEXT DEFAULT 'pending' CHECK (
        status IN ('pending', 'accepted', 'rejected', 'read')
    ),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_type ON notifications(type);
```

### 11. player_votes

Sistema de votação entre jogadores (Scout).

```sql
CREATE TABLE player_votes (
    voter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Atributos FIFA
    pace INTEGER DEFAULT 50 CHECK (pace BETWEEN 0 AND 99),
    shooting INTEGER DEFAULT 50 CHECK (shooting BETWEEN 0 AND 99),
    passing INTEGER DEFAULT 50 CHECK (passing BETWEEN 0 AND 99),
    dribbling INTEGER DEFAULT 50 CHECK (dribbling BETWEEN 0 AND 99),
    defending INTEGER DEFAULT 50 CHECK (defending BETWEEN 0 AND 99),
    physical INTEGER DEFAULT 50 CHECK (physical BETWEEN 0 AND 99),
    
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (voter_id, target_user_id)
);

CREATE INDEX idx_player_votes_target ON player_votes(target_user_id);
```

### 12. match_ratings

Avaliações de desempenho em partidas específicas.

```sql
CREATE TABLE match_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    voter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    rating DECIMAL(3,1) CHECK (rating BETWEEN 0 AND 10),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE (event_id, voter_id, player_id)
);

CREATE INDEX idx_match_ratings_event ON match_ratings(event_id);
CREATE INDEX idx_match_ratings_player ON match_ratings(player_id);
```

### 13. rule_books

Livro de regras personalizável por time.

```sql
CREATE TABLE rule_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID UNIQUE REFERENCES teams(id) ON DELETE CASCADE,
    
    title TEXT DEFAULT 'Regulamento do Time',
    content JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rule_books_team_id ON rule_books(team_id);
```

## 🔐 Row Level Security (RLS)

### Estratégia de Segurança

Todas as tabelas implementam políticas RLS para:
1. **Isolamento de Time**: Usuários só acessam dados do próprio time
2. **Controle por Role**: Permissões baseadas em cargo
3. **Propriedade**: Usuários controlam seus próprios dados

### Exemplos de Políticas

#### Leitura de Profiles
```sql
CREATE POLICY "Users can view profiles from their team"
ON profiles FOR SELECT
USING (
    team_id IN (
        SELECT team_id FROM profiles WHERE id = auth.uid()
    )
    OR id = auth.uid()
    OR is_public = true
);
```

#### Atualização de Profiles
```sql
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());
```

#### Transações - Leitura
```sql
CREATE POLICY "Team members can view transactions"
ON transactions FOR SELECT
USING (
    team_id IN (
        SELECT team_id FROM profiles WHERE id = auth.uid()
    )
);
```

#### Transações - Inserção
```sql
CREATE POLICY "Admins can create transactions"
ON transactions FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND team_id = transactions.team_id
        AND role IN ('presidente', 'vice-presidente', 'admin')
    )
);
```

## 🔄 Triggers e Funções

### Auto-criação de Profile

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Promoção Segura de Membros

```sql
CREATE OR REPLACE FUNCTION confirm_promotion(notification_id UUID)
RETURNS JSON AS $$
DECLARE
    notif RECORD;
    target_profile RECORD;
    new_role TEXT;
    team UUID;
    existing_holder RECORD;
BEGIN
    -- Busca a notificação
    SELECT * INTO notif FROM notifications WHERE id = notification_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Notificação não encontrada');
    END IF;
    
    -- Extrai dados
    new_role := notif.data->>'new_role';
    team := (notif.data->>'team_id')::UUID;
    
    -- Verifica unicidade para presidente/vice
    IF new_role IN ('presidente', 'vice-presidente') THEN
        SELECT * INTO existing_holder
        FROM profiles
        WHERE team_id = team
        AND role = new_role
        AND status = 'approved'
        AND id != notif.user_id
        LIMIT 1;
        
        IF FOUND THEN
            -- Swap: atual vira player
            UPDATE profiles
            SET role = 'player'
            WHERE id = existing_holder.id;
        END IF;
    END IF;
    
    -- Atualiza o promovido
    UPDATE profiles
    SET role = new_role, intended_role = new_role
    WHERE id = notif.user_id;
    
    -- Marca notificação como aceita
    UPDATE notifications
    SET status = 'accepted'
    WHERE id = notification_id;
    
    RETURN json_build_object('success', true, 'new_role', new_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 📈 Índices e Performance

### Índices Críticos

1. **Foreign Keys**: Todos os FKs possuem índices
2. **Queries Frequentes**:
   - `profiles.team_id`
   - `transactions.team_id + status`
   - `events.team_id + event_date`
3. **Filtros Comuns**:
   - `profiles.role`
   - `notifications.status`

### Otimizações Aplicadas

- **JSONB Indexing**: GIN indexes em campos frequentes
- **Partial Indexes**: Para status específicos
- **Composite Indexes**: Em queries multi-coluna

## 🔄 Migrações

As migrações estão centralizadas em:
- `FULL_DATABASE_RESET.sql` - Schema completo
- `RULE_BOOK_SCHEMA.sql` - Feature do livro de regras

### Processo de Migração

```bash
# 1. Backup do banco atual
supabase db dump > backup.sql

# 2. Aplicar migração
supabase db push FULL_DATABASE_RESET.sql

# 3. Verificar integridade
supabase db verify
```

## 📊 Queries Comuns

### Listar Jogadores do Time

```sql
SELECT p.*
FROM profiles p
WHERE p.team_id = $team_id
AND (p.status = 'approved' OR p.is_approved = true)
ORDER BY p.name;
```

### Saldo Financeiro do Time

```sql
SELECT
    SUM(CASE WHEN type = 'income' AND status = 'paid' THEN amount ELSE 0 END) as receitas,
    SUM(CASE WHEN type = 'expense' AND status = 'paid' THEN amount ELSE 0 END) as despesas,
    SUM(CASE WHEN type = 'income' AND status = 'paid' THEN amount ELSE 0 END) -
    SUM(CASE WHEN type = 'expense' AND status = 'paid' THEN amount ELSE 0 END) as saldo
FROM transactions
WHERE team_id = $team_id;
```

### Estatísticas de Jogador

```sql
SELECT
    target_user_id,
    ROUND(AVG(pace)) as avg_pace,
    ROUND(AVG(shooting)) as avg_shooting,
    ROUND(AVG(passing)) as avg_passing,
    ROUND(AVG(dribbling)) as avg_dribbling,
    ROUND(AVG(defending)) as avg_defending,
    ROUND(AVG(physical)) as avg_physical,
    COUNT(*) as vote_count
FROM player_votes
WHERE target_user_id = $player_id
GROUP BY target_user_id;
```

---

**Última atualização**: 2026-02-07
