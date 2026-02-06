# Correção de Segurança - Proteção de Rotas

## Problema Identificado
O aplicativo estava permitindo acesso a telas protegidas sem verificação de autenticação no banco de dados. Usuários podiam acessar rotas como `/dashboard`, `/settings`, `/player-stats`, etc., mesmo sem possuir uma conta cadastrada.

## Mudanças Implementadas

### 1. Proteção de Rotas no Frontend (`App.tsx`)
Todas as rotas privadas agora estão protegidas com os componentes `PrivateRoute` ou `ProtectedRoute`:

#### Rotas Públicas (sem autenticação necessária):
- `/` - Login
- `/register-account` - Criar conta
- `/forgot-password` - Recuperar senha
- `/reset-password` - Redefinir senha

#### Rotas de Onboarding (requerem autenticação):
- `/register-role` - Escolher papel
- `/register-team` - Criar/Buscar time
- `/register-privacy` - Configurações de privacidade
- `/register-profile` - Completar perfil

#### Rotas da Aplicação (requerem autenticação + aprovação):
- `/dashboard` - Dashboard principal
- `/agenda` - Agenda de eventos
- `/finance` - Finanças (apenas gestores)
- `/inventory` - Estoque (apenas gestores)
- `/scouts` - Avaliações
- `/player-stats` - Estatísticas de jogadores
- `/team-stats` - Estatísticas do time
- `/player-payments` - Pagamentos
- `/settings` - Configurações
- `/notifications` - Notificações
- `/pre-dash` - Tela de aprovação pendente

### 2. Hook de Autenticação (`useAuthRedirect.ts`)
- Removida exceção que permitia acesso à rota `/player-stats` sem verificação completa
- Agora todas as rotas passam pela validação de autenticação

### 3. Contexto do Usuário (`UserContext.tsx`)
- Adicionado `isApproved` ao valor exportado do contexto
- Corrigidas as dependências do `useMemo` para incluir `isApproved`

### 4. Schema do Banco de Dados

#### Adicionada coluna `is_approved` à tabela `profiles`:
```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;
```

Esta coluna substitui o uso do campo `status` (text) por um booleano para melhor performance e clareza.

## Como Aplicar as Mudanças

### Passo 1: Aplicar Migration no Banco de Dados
Execute a migration SQL no seu projeto Supabase:

```bash
# O arquivo de migration está em: migration_add_is_approved.sql
```

Ou execute manualmente no SQL Editor do Supabase:

```sql
-- Add is_approved column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;

-- Populate is_approved based on existing status
UPDATE public.profiles 
SET is_approved = (status = 'approved')
WHERE status IS NOT NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON public.profiles(is_approved);

-- Update trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        name,
        role,
        intended_role,
        status,
        is_approved,
        is_setup_complete,
        stats
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', 'Visitante'),
        'player',
        'player',
        'pending',
        FALSE,
        FALSE,
        '{"pace": 50, "shooting": 50, "passing": 50, "dribbling": 50, "defending": 50, "physical": 50}'::jsonb
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Passo 2: Verificar Funcionamento
1. Faça logout da aplicação
2. Tente acessar diretamente uma rota protegida (ex: `/#/dashboard`)
3. Você deve ser redirecionado para a tela de login
4. Após fazer login, você será redirecionado para a rota apropriada baseado no seu status

## Segurança em Camadas

O sistema agora possui múltiplas camadas de segurança:

1. **Frontend (React Router)**: Componentes `PrivateRoute` e `ProtectedRoute` bloqueiam acesso não autorizado
2. **Hook de Autenticação**: `useAuthRedirect` garante que usuários estejam na rota correta
3. **Contexto de Usuário**: Verifica estado de autenticação e aprovação
4. **Row Level Security (RLS)**: Políticas no Supabase garantem que apenas dados autorizados sejam acessíveis
5. **Serviços**: Todas as consultas ao banco passam por verificação de autenticação

## Verificação de Status

O sistema agora verifica:
- ✅ `userId` - Usuário está autenticado?
- ✅ `isInitialized` - Contexto foi inicializado?
- ✅ `isApproved` - Usuário foi aprovado pelo gestor?
- ✅ `isSetupComplete` - Usuário completou o onboarding?
- ✅ `role` - Usuário tem permissão para acessar esta rota?

## Notas Importantes

- Usuários não autenticados são sempre redirecionados para `/` (login)
- Usuários autenticados mas não aprovados vão para `/pre-dash` (aguardando aprovação)
- Usuários aprovados mas com setup incompleto continuam o onboarding
- Apenas usuários com setup completo e aprovados acessam o dashboard

## Testando

Para testar a segurança:

1. **Teste sem login**: Acesse `/#/dashboard` sem estar logado
2. **Teste com usuário pendente**: Crie uma conta e tente acessar o dashboard antes de ser aprovado
3. **Teste com usuário aprovado**: Verifique se usuários aprovados conseguem acessar todas as rotas permitidas
4. **Teste de permissões**: Tente acessar rotas de gestores com uma conta de jogador
