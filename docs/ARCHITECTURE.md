# Arquitetura do Sistema AmaPlay

## 📐 Visão Geral da Arquitetura

AmaPlay segue uma arquitetura moderna de **Single Page Application (SPA)** com backend serverless, utilizando o padrão **BaaS (Backend as a Service)** através do Supabase.

```
┌─────────────────────────────────────────────────────────────┐
│                      APRESENTAÇÃO                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │   React    │  │ TypeScript │  │  Tailwind  │            │
│  │  Router    │  │   Context  │  │    CSS     │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                    CAMADA DE SERVIÇOS                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │   Auth     │  │    Data    │  │  Supabase  │            │
│  │  Service   │  │  Service   │  │   Client   │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE (BaaS)                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ PostgreSQL │  │    Auth    │  │  Storage   │            │
│  │    +RLS    │  │    JWT     │  │            │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

## 🏛️ Arquitetura em Camadas

### 1. Camada de Apresentação (Frontend)

#### **Componentes React**
- **Screens**: Componentes de página completa representando rotas
- **Components**: Componentes reutilizáveis (PlayerCard, BottomNav, Logo)
- **Contexts**: Gerenciamento de estado global via Context API

#### **Roteamento**
```typescript
// App.tsx - Estrutura de Rotas
HashRouter
  └── Layout (Container principal)
      ├── PublicRoutes
      │   ├── /login
      │   ├── /register-account
      │   └── /forgot-password
      │
      ├── OnboardingRoutes (PrivateRoute)
      │   ├── /register-role
      │   ├── /register-team
      │   ├── /register-privacy
      │   └── /register-profile
      │
      └── ApplicationRoutes (ProtectedRoute)
          ├── /dashboard (presidente, vice, admin, player)
          ├── /agenda (presidente, vice, admin, player)
          ├── /finance (presidente, vice, admin)
          ├── /inventory (presidente, vice, admin)
          ├── /settings (todos)
          └── /pro-selection (modo profissional)
```

#### **Gerenciamento de Estado**

**UserContext.tsx**
```typescript
interface UserContextType {
  // Autenticação
  userId: string | null;
  email: string;
  login: (email, password) => Promise<any>;
  logout: () => Promise<void>;
  
  // Perfil
  name: string;
  role: Role;
  avatar: string | null;
  stats: PlayerStats;
  
  // Time
  teamId: string | null;
  teamDetails: TeamDetails;
  
  // Notificações
  notifications: Notification[];
  unreadCount: number;
  markAsRead: () => Promise<void>;
  
  // Gestão
  approveMember: (id) => Promise<boolean>;
  promoteMember: (id, role) => Promise<void>;
}
```

### 2. Camada de Serviços

#### **authService.ts**
Responsável por todas as operações de autenticação:

```typescript
export const authService = {
  // Autenticação básica
  login: (email, password) => Promise<User>
  register: (email, password, name?) => Promise<User>
  logout: () => Promise<void>
  
  // Providers OAuth
  loginWithGoogle: () => Promise<void>
  loginWithApple: () => Promise<void>
  loginWithFacebook: () => Promise<void>
  
  // Recuperação de senha
  resetPassword: (email) => Promise<void>
  
  // Perfil
  updateProfile: (updates) => Promise<void>
  uploadAvatar: (file) => Promise<string>
}
```

#### **dataService.ts**
Abstração para todas as operações de dados:

```typescript
export const dataService = {
  team: {
    getPendingRequests: () => Promise<Profile[]>
  },
  
  finance: {
    list: () => Promise<Transaction[]>
    add: (transaction) => Promise<Transaction>
    updateStatus: (id, status) => Promise<void>
    delete: (id) => Promise<void>
    
    charges: {
      list: () => Promise<Charge[]>
      add: (charge) => Promise<Charge>
    },
    
    receiver: {
      get: () => Promise<ReceiverAccount>
      update: (details) => Promise<void>
    }
  },
  
  inventory: {
    list: () => Promise<InventoryItem[]>
    save: (item) => Promise<InventoryItem>
    delete: (id) => Promise<void>
  },
  
  events: {
    list: () => Promise<GameEvent[]>
    add: (event) => Promise<GameEvent>
    update: (id, event) => Promise<void>
    delete: (id) => Promise<void>
    respond: (id, status) => Promise<void>
  },
  
  players: {
    list: (includeIncomplete?) => Promise<Player[]>
    getById: (id) => Promise<Player>
  },
  
  voting: {
    cast: (targetId, stats) => Promise<void>
    getMyVote: (targetId) => Promise<PlayerStats>
  },
  
  scoring: {
    getMatchRatings: (eventId) => Promise<MatchRating[]>
    submitRating: (eventId, playerId, rating) => Promise<void>
    getMyStats: () => Promise<ScoringStats>
  }
}
```

### 3. Camada de Dados (Supabase)

#### **Esquema do Banco de Dados**

```sql
-- Principais tabelas e relacionamentos

profiles (usuários)
  ├── id (UUID, PK)
  ├── email (TEXT)
  ├── name (TEXT)
  ├── role (TEXT: presidente, vice, admin, player)
  ├── team_id (UUID, FK → teams)
  ├── avatar (TEXT)
  ├── stats (JSONB)
  ├── ovr (INTEGER)
  └── is_approved (BOOLEAN)

teams
  ├── id (UUID, PK)
  ├── name (TEXT)
  ├── logo (TEXT)
  ├── primary_color (TEXT)
  ├── creator_id (UUID, FK → profiles)
  ├── monthly_fee_amount (DECIMAL)
  └── member_count (INTEGER)

team_members (relação N:N)
  ├── team_id (UUID, FK → teams)
  ├── profile_id (UUID, FK → profiles)
  ├── role (TEXT)
  └── is_team_approved (BOOLEAN)

transactions
  ├── id (UUID, PK)
  ├── team_id (UUID, FK → teams)
  ├── type (TEXT: income, expense)
  ├── amount (DECIMAL)
  ├── status (TEXT: paid, pending, rejected)
  ├── category (TEXT)
  └── target_user_id (UUID, FK → profiles)

inventory
  ├── id (UUID, PK)
  ├── team_id (UUID, FK → teams)
  ├── name (TEXT)
  ├── quantity (INTEGER)
  ├── max_quantity (INTEGER)
  ├── status (TEXT: excellent, good, fair, poor)
  └── responsible_id (UUID, FK → profiles)

events
  ├── id (UUID, PK)
  ├── team_id (UUID, FK → teams)
  ├── type (TEXT: game, bbq, match, meeting, birthday)
  ├── title (TEXT)
  ├── event_date (TIMESTAMPTZ)
  ├── time (TEXT)
  └── location (TEXT)

event_participants
  ├── event_id (UUID, FK → events)
  ├── user_id (UUID, FK → profiles)
  └── status (TEXT: pending, confirmed, declined)

notifications
  ├── id (UUID, PK)
  ├── user_id (UUID, FK → profiles)
  ├── type (TEXT: promotion_invite, general_alert)
  ├── status (TEXT: pending, accepted, rejected, read)
  ├── title (TEXT)
  └── message (TEXT)

player_votes
  ├── voter_id (UUID, FK → profiles)
  ├── target_user_id (UUID, FK → profiles)
  ├── pace, shooting, passing, etc. (INTEGER)
  └── PRIMARY KEY (voter_id, target_user_id)

match_ratings
  ├── id (UUID, PK)
  ├── event_id (UUID, FK → events)
  ├── voter_id (UUID, FK → profiles)
  ├── player_id (UUID, FK → profiles)
  └── rating (DECIMAL)
```

## 🔐 Segurança e Autenticação

### Row Level Security (RLS)

Todas as tabelas implementam RLS com políticas baseadas em:

1. **Team Isolation**: Usuários só acessam dados do seu time
2. **Role-Based Access**: Permissões por cargo (presidente, vice, admin, player)
3. **Owner Policies**: Usuários controlam seus próprios dados

**Exemplo de Política RLS:**
```sql
-- Política de leitura para transactions
CREATE POLICY "Users can view their team's transactions"
ON transactions FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM profiles 
    WHERE id = auth.uid()
  )
);

-- Política de inserção para admins
CREATE POLICY "Only admins can create transactions"
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

### Fluxo de Autenticação

```
1. Login Request
   ↓
2. Supabase Auth (JWT)
   ↓
3. Profile Creation (Trigger)
   ↓
4. Context Update
   ↓
5. Smart Routing
   ├── Missing Name? → /register-profile
   ├── Missing Team? → /register-team
   ├── Pending Approval? → /pre-dash
   └── Complete → /dashboard
```

## 🔄 Fluxos de Dados

### Fluxo de Aprovação de Membro

```
1. Usuário cria conta
   ↓
2. Escolhe cargo desejado (intended_role)
   ↓
3. Solicita entrar em um time
   ↓
4. Status = 'pending', is_approved = false
   ↓
5. Presidente/Vice visualiza em pendingMembers
   ↓
6. Aprova através de approveMember()
   ↓
7. Status = 'approved', is_approved = true
   ↓
8. role = intended_role
   ↓
9. Usuário acessa /dashboard
```

### Fluxo de Promoção

```
1. Presidente/Vice chama promoteMember(userId, newRole)
   ↓
2. Cria notificação tipo 'promotion_invite'
   ↓
3. Target recebe notificação
   ↓
4. Target aceita/recusa via respondToPromotion()
   ↓
5. Se aceita: RPC confirm_promotion
   ├── Verifica unicidade (presidente/vice)
   ├── Faz swap de cargos se necessário
   └── Atualiza role
   ↓
6. Notificação status = 'accepted'/'rejected'
```

## 📊 Performance e Otimizações

### Estratégias de Performance

1. **Lazy Loading**: Componentes de rota carregados sob demanda
2. **Memoization**: useCallback e useMemo para cálculos pesados
3. **Debouncing**: Inputs de busca com delay
4. **Caching**: Team ID e dados do usuário em memória
5. **Batch Updates**: Atualizações em lote quando possível

### Otimizações de Banco

1. **Índices**: Criados em colunas frequentes (team_id, user_id)
2. **Materialized Views**: Para estatísticas agregadas (futuro)
3. **Query Optimization**: Uso de joins eficientes
4. **Connection Pooling**: Gerenciado pelo Supabase

## 🚀 Escalabilidade

### Horizontal Scaling
- **Stateless Frontend**: Deploy em CDN (Vercel, Netlify)
- **Supabase**: Auto-scaling no tier pago
- **Storage**: S3-compatible com CDN

### Vertical Scaling
- **Database**: Upgrade de plano Supabase
- **Compute**: Edge Functions para lógica pesada
- **Cache**: Redis para sessões (futuro)

## 🔧 Padrões de Código

### Convenções de Nomenclatura

- **Componentes**: PascalCase (`DashboardScreen.tsx`)
- **Hooks**: camelCase com prefixo 'use' (`useAuthRedirect.ts`)
- **Contextos**: PascalCase com sufixo 'Context' (`UserContext.tsx`)
- **Serviços**: camelCase com sufixo 'Service' (`authService.ts`)
- **Tipos**: PascalCase para interfaces (`UserContextType`)

### Estrutura de Componentes

```typescript
// Imports
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

// Tipos/Interfaces
interface Props {
  // ...
}

// Componente
const ComponentName = ({ prop }: Props) => {
  // Hooks
  const navigate = useNavigate();
  const { userId, role } = useUser();
  
  // State
  const [data, setData] = useState([]);
  
  // Effects
  useEffect(() => {
    // ...
  }, []);
  
  // Handlers
  const handleAction = () => {
    // ...
  };
  
  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
};

export default ComponentName;
```

## 📱 Responsividade

### Breakpoints

```css
/* Mobile First */
.container {
  /* Base: Mobile */
  width: 100%;
  max-width: 448px; /* ~28em */
}

/* Tablet (não utilizado atualmente) */
@media (min-width: 768px) {
  /* ... */
}

/* Desktop (layout centralizado) */
@media (min-width: 1024px) {
  .app-container {
    margin: 0 auto;
    max-width: 448px;
  }
}
```

## 🧪 Testes (Futuros)

### Estratégia de Testes

1. **Unit Tests**: Jest + React Testing Library
   - Componentes isolados
   - Hooks customizados
   - Utilitários

2. **Integration Tests**: Cypress
   - Fluxos de usuário
   - Navegação
   - Formulários

3. **E2E Tests**: Playwright
   - Fluxos completos
   - Multi-browser

## 📈 Monitoramento (Futuro)

- **Error Tracking**: Sentry
- **Analytics**: Google Analytics / Mixpanel
- **Performance**: Lighthouse CI
- **Logs**: Supabase Logs + CloudWatch

---

**Última atualização**: 2026-02-07
