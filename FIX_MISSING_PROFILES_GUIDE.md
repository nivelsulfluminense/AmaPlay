# 🔧 Guia de Correção - Perfis Ausentes no Banco de Dados

## 🚨 Problema Identificado

**Sintoma:** Mensagem "User already registered" mas banco de dados vazio

**Causa:** O usuário existe na tabela `auth.users` do Supabase, mas o perfil não foi criado na tabela `public.profiles`. Isso acontece quando:
1. O trigger de criação automática não está funcionando
2. O trigger não existia quando o usuário foi criado
3. Houve um erro durante a criação do perfil

---

## ✅ Solução Passo a Passo

### Passo 1: Acessar o SQL Editor do Supabase

1. Acesse [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto **AmaPlay**
3. No menu lateral, clique em **SQL Editor**

### Passo 2: Executar o Script de Diagnóstico

Copie e cole o conteúdo do arquivo `fix-missing-profiles.sql` no SQL Editor.

**Ou execute as queries uma por vez:**

#### 2.1 Verificar Usuários Sem Perfil

```sql
SELECT 
    au.id,
    au.email,
    au.created_at as user_created_at,
    p.id as profile_id,
    CASE 
        WHEN p.id IS NULL THEN '❌ SEM PERFIL'
        ELSE '✅ COM PERFIL'
    END as status
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
ORDER BY au.created_at DESC;
```

**Resultado esperado:** Você verá quais usuários não têm perfil.

#### 2.2 Criar Perfis Ausentes

```sql
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
)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'name', 'Visitante'),
    'player',
    'player',
    'pending',
    FALSE,
    FALSE,
    '{"pace": 50, "shooting": 50, "passing": 50, "dribbling": 50, "defending": 50, "physical": 50}'::jsonb
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;
```

**Resultado esperado:** Mensagem mostrando quantos perfis foram criados.

#### 2.3 Verificar Correção

```sql
SELECT 
    COUNT(*) as total_users,
    COUNT(p.id) as users_with_profile,
    COUNT(*) - COUNT(p.id) as users_without_profile
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id;
```

**Resultado esperado:** `users_without_profile` deve ser **0**.

### Passo 3: Recriar o Trigger (Prevenir Problemas Futuros)

Execute este bloco para garantir que o trigger está funcionando:

```sql
-- Remover trigger antigo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recriar função do trigger
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
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Passo 4: Aplicar a Migration is_approved

Se ainda não aplicou, execute também:

```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;

UPDATE public.profiles 
SET is_approved = (status = 'approved')
WHERE status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON public.profiles(is_approved);
```

---

## 🧪 Testar a Correção

### Opção 1: Fazer Login com Usuário Existente

1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Acesse a aplicação
3. Faça login com `weslley.assis@gmail.com`
4. Você deve ser redirecionado para a tela de onboarding (escolher papel)

### Opção 2: Criar Novo Usuário de Teste

1. Crie uma nova conta com email diferente
2. Verifique no SQL Editor se o perfil foi criado automaticamente:

```sql
SELECT * FROM public.profiles 
WHERE email = 'seu-email-de-teste@gmail.com';
```

---

## 🔍 Verificações Adicionais

### Verificar se o Trigger Está Ativo

```sql
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

**Resultado esperado:** Deve mostrar o trigger com `event_manipulation = INSERT` e `action_timing = AFTER`.

### Verificar Políticas RLS

```sql
SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'profiles';
```

**Resultado esperado:** Deve mostrar as políticas de INSERT, SELECT e UPDATE.

---

## 🚨 Problemas Comuns

### "Erro: duplicate key value violates unique constraint"

**Causa:** Tentando criar perfil que já existe.

**Solução:** Ignore este erro ou use `ON CONFLICT (id) DO NOTHING` na query.

### "Erro: permission denied for table profiles"

**Causa:** Políticas RLS muito restritivas.

**Solução:** Execute as queries como superusuário no SQL Editor do Supabase (já é o padrão).

### "Trigger não está sendo executado"

**Causa:** Trigger pode estar desabilitado ou com erro.

**Solução:** 
1. Verifique logs de erro no Supabase
2. Recrie o trigger usando o script fornecido
3. Teste criando um novo usuário

---

## 📊 Dados de Exemplo

Após a correção, a tabela `profiles` deve ter esta estrutura para cada usuário:

```
id: uuid (mesmo do auth.users)
email: weslley.assis@gmail.com
name: Visitante
role: player
intended_role: player
status: pending
is_approved: false
is_setup_complete: false
team_id: null
stats: {"pace": 50, "shooting": 50, ...}
```

---

## ✅ Checklist de Correção

- [ ] Executei o diagnóstico e identifiquei usuários sem perfil
- [ ] Criei perfis para usuários existentes
- [ ] Verifiquei que `users_without_profile = 0`
- [ ] Recriei o trigger de criação automática
- [ ] Apliquei a migration `is_approved`
- [ ] Testei login com usuário existente
- [ ] Testei criação de novo usuário
- [ ] Verifiquei que o trigger está ativo
- [ ] Limpei cache do navegador
- [ ] Reiniciei o servidor de desenvolvimento

---

## 🎯 Resultado Final

Após seguir todos os passos:

1. ✅ Todos os usuários existentes têm perfis
2. ✅ Novos usuários terão perfis criados automaticamente
3. ✅ Login funciona corretamente
4. ✅ Onboarding aparece para novos usuários
5. ✅ Proteção de rotas está funcionando

---

## 💡 Dica: Deletar Usuários de Teste

Se quiser limpar usuários de teste do banco:

```sql
-- ⚠️ CUIDADO: Isso remove o usuário permanentemente!
-- Substitua 'email@teste.com' pelo email que deseja remover

DELETE FROM auth.users 
WHERE email = 'email@teste.com';

-- O perfil será removido automaticamente por CASCADE
```

---

**Precisa de ajuda?** Verifique os logs de erro no Supabase Dashboard > Logs
