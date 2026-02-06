# 🔄 Guia de Reset Completo do Banco de Dados

## ⚠️ ATENÇÃO - LEIA ANTES DE EXECUTAR

**Este script irá:**
- ❌ **APAGAR TODOS OS DADOS** do banco de dados
- ❌ **REMOVER TODAS AS TABELAS** existentes
- ❌ **DELETAR TODOS OS PERFIS** de usuários
- ✅ **RECRIAR TUDO DO ZERO** com a estrutura correta

**⚠️ IMPORTANTE:**
- Todos os usuários em `auth.users` serão mantidos (autenticação Supabase)
- Mas os perfis em `public.profiles` serão deletados
- Você precisará fazer onboarding novamente após o reset

---

## 📋 Antes de Começar

### Backup (Opcional mas Recomendado)

Se você tem dados importantes, faça backup primeiro:

```sql
-- Backup de perfis
CREATE TABLE profiles_backup AS SELECT * FROM public.profiles;

-- Backup de times
CREATE TABLE teams_backup AS SELECT * FROM public.teams;
```

---

## 🚀 Como Executar o Reset

### Passo 1: Acessar o SQL Editor

1. Acesse [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto **AmaPlay**
3. Clique em **SQL Editor** no menu lateral
4. Clique em **New Query**

### Passo 2: Executar o Script

1. Abra o arquivo **`FULL_DATABASE_RESET.sql`**
2. Copie **TODO** o conteúdo
3. Cole no SQL Editor do Supabase
4. Clique em **Run** (ou pressione Ctrl+Enter)
5. Aguarde a conclusão (pode levar alguns segundos)

### Passo 3: Verificar Resultado

Ao final, você verá 3 tabelas de verificação:

#### ✅ Tabelas Criadas
```
tablename              | rls_enabled
-----------------------|------------
event_participants     | true
game_events           | true
inventory             | true
notifications         | true
profiles              | true
team_members          | true
teams                 | true
transactions          | true
```

#### ✅ Políticas RLS
```
tablename              | policy_count
-----------------------|-------------
event_participants     | 2
game_events           | 2
inventory             | 2
notifications         | 3
profiles              | 5
team_members          | 2
teams                 | 3
transactions          | 2
```

#### ✅ Triggers
```
trigger_name              | event_object_table
--------------------------|-------------------
on_auth_user_created      | users
set_updated_at_events     | game_events
set_updated_at_inventory  | inventory
set_updated_at_notifications | notifications
set_updated_at_profiles   | profiles
set_updated_at_teams      | teams
set_updated_at_transactions | transactions
```

---

## 🎯 Após o Reset

### 1. Limpar Cache do Navegador

```bash
# Pressione no navegador:
Ctrl+Shift+Delete (Windows)
Cmd+Shift+Delete (Mac)

# Selecione:
✅ Cookies
✅ Cache
✅ Armazenamento local

# Período: Todo o período
```

### 2. Reiniciar Servidor de Desenvolvimento

```bash
# Pare o servidor (Ctrl+C)
# Depois execute:
npm run dev
```

### 3. Testar a Aplicação

1. Acesse a aplicação
2. Você será redirecionado para login (sem perfil)
3. Faça login com sua conta existente
4. Você será redirecionado para o onboarding
5. Complete o fluxo de onboarding:
   - Escolher papel (Presidente/Vice/Admin/Jogador)
   - Criar ou buscar time
   - Configurar privacidade
   - Completar perfil

---

## 📊 Estrutura do Banco Após Reset

### Tabelas Criadas

1. **`teams`** - Times/Organizações
   - Armazena informações dos times
   - Cores, logo, descrição
   - Contador de membros

2. **`profiles`** - Perfis de Usuários
   - Dados pessoais
   - Papel (role) e status
   - Estatísticas de jogador
   - Vinculação com time

3. **`team_members`** - Membros do Time
   - Relacionamento many-to-many
   - Aprovação de membros
   - Histórico de entrada

4. **`notifications`** - Notificações
   - Convites de promoção
   - Alertas gerais
   - Status de leitura

5. **`transactions`** - Finanças
   - Receitas e despesas
   - Categorização
   - Status de pagamento

6. **`inventory`** - Estoque
   - Equipamentos
   - Quantidade e condição
   - Imagens

7. **`game_events`** - Jogos e Eventos
   - Partidas agendadas
   - Churrascos
   - Local e horário

8. **`event_participants`** - Participantes
   - Confirmação de presença
   - Status (confirmado/recusado)

### Colunas Importantes em `profiles`

```
✅ id (UUID) - Referência ao auth.users
✅ email (TEXT)
✅ name (TEXT)
✅ role (TEXT) - presidente, vice-presidente, admin, player
✅ intended_role (TEXT) - Papel escolhido no onboarding
✅ status (TEXT) - pending, approved, rejected
✅ is_approved (BOOLEAN) - Aprovado pelo gestor?
✅ is_setup_complete (BOOLEAN) - Onboarding completo?
✅ is_first_manager (BOOLEAN) - Primeiro gestor do time?
✅ team_id (UUID) - Time vinculado
✅ stats (JSONB) - Estatísticas do jogador
✅ avatar (TEXT) - Foto de perfil
✅ card_avatar (TEXT) - Foto para card de jogador
```

---

## 🔒 Segurança (RLS)

Todas as tabelas têm Row Level Security habilitado:

### Profiles
- ✅ Usuários podem ver e editar apenas seu próprio perfil
- ✅ Membros do time podem ver perfis de colegas
- ✅ Perfis públicos visíveis para todos

### Teams
- ✅ Todos podem ver times (para busca)
- ✅ Apenas criador/gestores podem editar

### Transactions, Inventory, Events
- ✅ Apenas membros do time podem ver
- ✅ Apenas gestores podem criar/editar/deletar

### Notifications
- ✅ Usuários veem apenas suas notificações
- ✅ Gestores podem criar notificações

---

## 🔧 Triggers Automáticos

### 1. Criação Automática de Perfil
Quando um usuário se registra:
- ✅ Perfil criado automaticamente
- ✅ Valores padrão aplicados
- ✅ Stats inicializadas

### 2. Atualização de Timestamp
Quando qualquer registro é atualizado:
- ✅ Campo `updated_at` atualizado automaticamente

---

## ✅ Checklist Pós-Reset

- [ ] Script executado sem erros
- [ ] 8 tabelas criadas
- [ ] Todas as tabelas têm RLS habilitado
- [ ] Triggers criados e ativos
- [ ] Cache do navegador limpo
- [ ] Servidor reiniciado
- [ ] Login testado
- [ ] Onboarding funciona
- [ ] Criação de time funciona
- [ ] Perfil é criado automaticamente

---

## 🚨 Problemas Comuns

### "Erro: permission denied"
**Solução:** Você está executando no SQL Editor do Supabase? Ele tem permissões de superusuário.

### "Erro: relation does not exist"
**Solução:** Execute o script completo de uma vez, não em partes.

### "Perfil não criado após login"
**Solução:** 
1. Verifique se o trigger `on_auth_user_created` existe
2. Tente criar um novo usuário de teste
3. Verifique os logs de erro no Supabase

### "Não consigo criar time"
**Solução:**
1. Verifique se completou o onboarding
2. Verifique se escolheu papel de Presidente ou Vice
3. Verifique políticas RLS da tabela teams

---

## 📝 Notas Importantes

### Usuários Existentes
- Usuários em `auth.users` **NÃO** são deletados
- Mas perfis em `profiles` **SIM**
- Ao fazer login, o trigger criará novo perfil
- Você precisará refazer o onboarding

### Dados de Teste
Se quiser criar dados de teste após o reset:

```sql
-- Criar um time de exemplo
INSERT INTO public.teams (name, primary_color, secondary_color)
VALUES ('Time Exemplo', '#13ec5b', '#ffffff')
RETURNING id;

-- Atualizar seu perfil para ser presidente deste time
UPDATE public.profiles 
SET team_id = 'UUID_DO_TIME_ACIMA',
    role = 'presidente',
    is_approved = true,
    is_setup_complete = true
WHERE email = 'seu-email@gmail.com';
```

---

## 🎉 Pronto!

Após executar o reset e seguir todos os passos, você terá:
- ✅ Banco de dados limpo e organizado
- ✅ Todas as tabelas com estrutura correta
- ✅ Segurança RLS configurada
- ✅ Triggers funcionando
- ✅ Aplicação pronta para uso

**Boa sorte!** 🚀
