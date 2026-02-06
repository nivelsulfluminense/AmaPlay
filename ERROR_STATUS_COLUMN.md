# 🔧 Solução do Erro: Coluna "status" não existe

## ❌ Erro Encontrado

```
ERROR: 42703: column "status" of relation "profiles" does not exist
```

**Causa:** A tabela `profiles` no seu banco de dados não tem todas as colunas esperadas. Isso pode acontecer se:
- O schema não foi aplicado completamente
- Você criou a tabela manualmente sem todas as colunas
- Houve um erro durante a criação inicial

---

## ✅ Solução Correta

### **Execute o arquivo ADAPTIVE_FIX.sql ou QUICK_FIX.sql (atualizado)**

Ambos os arquivos agora foram corrigidos para:
1. **Verificar** quais colunas existem
2. **Adicionar** apenas as colunas que estão faltando
3. **Criar** os perfis ausentes
4. **Configurar** o trigger corretamente

---

## 📋 Passo a Passo

### Opção 1: Script Adaptativo (Recomendado)

1. Acesse o **SQL Editor** do Supabase
2. Copie e cole o conteúdo de **`ADAPTIVE_FIX.sql`**
3. Clique em **Run**
4. Aguarde a conclusão

Este script é mais seguro pois verifica a estrutura antes de fazer mudanças.

### Opção 2: Script Rápido (Atualizado)

1. Acesse o **SQL Editor** do Supabase
2. Copie e cole o conteúdo de **`QUICK_FIX.sql`** (agora corrigido)
3. Clique em **Run**
4. Aguarde a conclusão

---

## 🔍 Verificar Estrutura Atual

Antes de executar qualquer script, você pode verificar quais colunas existem:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;
```

**Colunas Necessárias:**
- ✅ `id` (UUID)
- ✅ `email` (TEXT)
- ✅ `name` (TEXT)
- ✅ `role` (TEXT)
- ✅ `intended_role` (TEXT) ⚠️ Pode estar faltando
- ✅ `status` (TEXT) ⚠️ Pode estar faltando
- ✅ `is_approved` (BOOLEAN) ⚠️ Pode estar faltando
- ✅ `is_setup_complete` (BOOLEAN) ⚠️ Pode estar faltando
- ✅ `is_first_manager` (BOOLEAN) ⚠️ Pode estar faltando
- ✅ `team_id` (UUID)
- ✅ `stats` (JSONB)
- ✅ `avatar` (TEXT)
- ✅ `card_avatar` (TEXT)

---

## 🚀 Script Mínimo (Se Tiver Pressa)

Se você só quer resolver o problema rapidamente, execute este script mínimo:

```sql
-- Adicionar colunas faltantes
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_setup_complete BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_first_manager BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS intended_role TEXT DEFAULT 'player';

-- Criar perfis ausentes
INSERT INTO public.profiles (id, email, name, role, intended_role, status, is_approved, is_setup_complete, is_first_manager, stats)
SELECT au.id, au.email, COALESCE(au.raw_user_meta_data->>'name', 'Visitante'), 'player', 'player', 'pending', FALSE, FALSE, FALSE,
       '{"pace": 50, "shooting": 50, "passing": 50, "dribbling": 50, "defending": 50, "physical": 50}'::jsonb
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Recriar trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, role, intended_role, status, is_approved, is_setup_complete, is_first_manager, stats)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', 'Visitante'), 'player', 'player', 'pending', FALSE, FALSE, FALSE,
            '{"pace": 50, "shooting": 50, "passing": 50, "dribbling": 50, "defending": 50, "physical": 50}'::jsonb)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verificar
SELECT COUNT(*) as total_users, COUNT(p.id) as users_with_profile
FROM auth.users au LEFT JOIN public.profiles p ON au.id = p.id;
```

---

## ✅ Após Executar o Script

1. **Verifique o resultado** - A última query deve mostrar:
   - `total_users`: número de usuários no auth
   - `users_with_profile`: deve ser igual a total_users
   - `users_without_profile`: deve ser 0

2. **Limpe o cache do navegador**
   - Ctrl+Shift+Delete
   - Selecione tudo
   - Limpe

3. **Teste o login**
   - Acesse a aplicação
   - Faça login com `weslley.assis@gmail.com`
   - Você deve ser redirecionado para o onboarding

---

## 🎯 Resultado Esperado

Após executar o script corretamente:

```
✅ Colunas adicionadas à tabela profiles
✅ Perfil criado para weslley.assis@gmail.com
✅ Trigger configurado para novos usuários
✅ Login funcionando corretamente
```

---

## ⚠️ Se Ainda Houver Erros

Se você encontrar outros erros de colunas faltando, execute:

```sql
-- Ver TODAS as colunas que existem
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' ORDER BY column_name;
```

E me informe quais colunas aparecem na lista para eu ajustar o script.

---

## 📁 Arquivos Disponíveis

1. **`ADAPTIVE_FIX.sql`** ⭐ - Mais seguro, verifica antes de adicionar
2. **`QUICK_FIX.sql`** ⚡ - Atualizado, adiciona colunas primeiro
3. **`COMPLETE_SCHEMA.sql`** 📋 - Schema completo (para referência)

**Recomendação:** Use o `ADAPTIVE_FIX.sql` primeiro!
