# API Documentation - AmaPlay

## 🔌 Visão Geral da API

O AmaPlay utiliza Supabase como backend, que fornece uma API RESTful automática baseada no schema do PostgreSQL, além de real-time subscriptions e autenticação integrada.

## 🔐 Autenticação

### Base URL

```
https://[seu-projeto].supabase.co
```

### Headers Necessários

```http
apikey: SEU_ANON_KEY
Authorization: Bearer JWT_TOKEN
Content-Type: application/json
```

### Obter JWT Token

```typescript
// Via authService
const { data, error } = await authService.login(email, password);
const token = data.session.access_token;
```

## 📚 Endpoints Principais

### Authentication

#### POST `/auth/v1/signup`

Criar nova conta.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "senha123",
  "data": {
    "name": "João Silva"
  }
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "user_metadata": {
      "name": "João Silva"
    }
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token"
  }
}
```

#### POST `/auth/v1/token?grant_type=password`

Login.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "senha123"
}
```

**Response:**
```json
{
  "access_token": "jwt_token",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "refresh_token",
  "user": { /* user object */ }
}
```

#### POST `/auth/v1/logout`

Logout (invalida token).

**Headers:**
```
Authorization: Bearer JWT_TOKEN
```

**Response:**
```
204 No Content
```

### Profiles

#### GET `/rest/v1/profiles`

Listar perfis (filtrado por RLS).

**Query Params:**
```
?team_id=eq.UUID
&status=eq.approved
&select=id,name,email,role,avatar,stats
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@example.com",
    "role": "player",
    "avatar": "https://...",
    "stats": {
      "pace": 75,
      "shooting": 80,
      "passing": 70,
      "dribbling": 85,
      "defending": 60,
      "physical": 78
    }
  }
]
```

#### GET `/rest/v1/profiles?id=eq.UUID`

Buscar perfil específico.

**Response:**
```json
{
  "id": "uuid",
  "name": "João Silva",
  "email": "joao@example.com",
  "role": "player",
  "team_id": "team-uuid",
  "ovr": 75,
  "position": "ATA",
  /* ... outros campos */
}
```

#### PATCH `/rest/v1/profiles?id=eq.UUID`

Atualizar perfil.

**Request:**
```json
{
  "name": "João da Silva",
  "avatar": "https://nova-url.com/avatar.jpg",
  "position": "MEI"
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "João da Silva",
  "avatar": "https://nova-url.com/avatar.jpg",
  "position": "MEI",
  /* campos atualizados */
}
```

### Teams

#### GET `/rest/v1/teams?id=eq.UUID`

Buscar time por ID.

**Response:**
```json
{
  "id": "uuid",
  "name": "Time FC",
  "logo": "https://...",
  "primary_color": "#13EC5B",
  "monthly_fee_amount": 50.00,
  "due_day": 10,
  "member_count": 15,
  "created_at": "2026-01-01T00:00:00Z"
}
```

#### PATCH `/rest/v1/teams?id=eq.UUID`

Atualizar configurações do time (apenas presidente/vice).

**Request:**
```json
{
  "monthly_fee_amount": 60.00,
  "due_day": 15,
  "logo": "https://novo-logo.com/logo.png"
}
```

### Transactions

#### GET `/rest/v1/transactions`

Listar transações.

**Query Params:**
```
?team_id=eq.UUID
&status=eq.paid
&order=created_at.desc
&limit=50
```

**Response:**
```json
[
  {
    "id": "uuid",
    "type": "income",
    "amount": 50.00,
    "description": "Mensalidade - João Silva",
    "category": "Mensalidade",
    "status": "paid",
    "transaction_date": "2026-02-01",
    "created_at": "2026-02-01T10:00:00Z"
  }
]
```

#### POST `/rest/v1/transactions`

Criar transação (apenas admins).

**Request:**
```json
{
  "team_id": "uuid",
  "type": "expense",
  "amount": 150.00,
  "description": "Bolas de futebol",
  "category": "Equipamento",
  "transaction_date": "2026-02-07",
  "status": "paid"
}
```

**Response:**
```json
{
  "id": "uuid",
  "team_id": "uuid",
  "type": "expense",
  "amount": 150.00,
  /* ... */
}
```

#### PATCH `/rest/v1/transactions?id=eq.UUID`

Atualizar status (aprovação/rejeição).

**Request:**
```json
{
  "status": "paid"
}
```

#### DELETE `/rest/v1/transactions?id=eq.UUID`

Deletar transação.

**Response:**
```
204 No Content
```

### Inventory

#### GET `/rest/v1/inventory`

Listar itens do estoque.

**Query Params:**
```
?team_id=eq.UUID
&select=*
&order=name.asc
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Bola Nike",
    "category": "Equipamento",
    "quantity": 5,
    "max_quantity": 10,
    "status": "good",
    "responsible_id": "uuid",
    "created_at": "2026-01-15T00:00:00Z"
  }
]
```

#### POST `/rest/v1/inventory`

Adicionar item.

**Request:**
```json
{
  "team_id": "uuid",
  "name": "Cone de treinamento",
  "category": "Treino",
  "quantity": 20,
  "max_quantity": 30,
  "status": "excellent",
  "responsible_id": "uuid"
}
```

#### PATCH `/rest/v1/inventory?id=eq.UUID`

Atualizar item.

**Request:**
```json
{
  "quantity": 18,
  "status": "good"
}
```

### Events

#### GET `/rest/v1/events`

Listar eventos.

**Query Params:**
```
?team_id=eq.UUID
&event_date=gte.2026-02-01
&order=event_date.asc
```

**Response:**
```json
[
  {
    "id": "uuid",
    "type": "game",
    "title": "Jogo Amistoso",
    "opponent": "Rivais FC",
    "event_date": "2026-02-10",
    "time": "15:00",
    "location": "Campo do Bairro",
    "confirmed_count": 8
  }
]
```

#### POST `/rest/v1/events`

Criar evento.

**Request:**
```json
{
  "team_id": "uuid",
  "type": "game",
  "opponent": "Time Adversário",
  "event_date": "2026-02-15",
  "time": "16:00",
  "location": "Estádio Municipal"
}
```

#### DELETE `/rest/v1/events?id=eq.UUID`

Deletar evento.

### Event Participants

#### GET `/rest/v1/event_participants`

Listar participantes de evento.

**Query Params:**
```
?event_id=eq.UUID
&select=*,profiles(name,avatar)
```

**Response:**
```json
[
  {
    "event_id": "uuid",
    "user_id": "uuid",
    "status": "confirmed",
    "profiles": {
      "name": "João Silva",
      "avatar": "https://..."
    }
  }
]
```

#### POST `/rest/v1/event_participants`

Confirmar presença.

**Request:**
```json
{
  "event_id": "uuid",
  "user_id": "uuid",
  "status": "confirmed"
}
```

#### PATCH `/rest/v1/event_participants?event_id=eq.UUID&user_id=eq.UUID`

Atualizar resposta.

**Request:**
```json
{
  "status": "declined"
}
```

### Notifications

#### GET `/rest/v1/notifications`

Listar notificações do usuário.

**Query Params:**
```
?user_id=eq.UUID
&status=eq.pending
&order=created_at.desc
```

**Response:**
```json
[
  {
    "id": "uuid",
    "type": "promotion_invite",
    "title": "Convite para Vice-Presidente",
    "message": "Você foi convidado...",
    "status": "pending",
    "data": {
      "new_role": "vice-presidente",
      "team_id": "uuid"
    },
    "created_at": "2026-02-07T10:00:00Z"
  }
]
```

#### PATCH `/rest/v1/notifications?id=eq.UUID`

Marcar como lida.

**Request:**
```json
{
  "status": "read"
}
```

#### PATCH (bulk) `/rest/v1/notifications?user_id=eq.UUID&status=eq.pending`

Marcar todas como lidas.

**Request:**
```json
{
  "status": "read"
}
```

### Player Votes (Scouts)

#### GET `/rest/v1/player_votes`

Buscar votos de um jogador.

**Query Params:**
```
?target_user_id=eq.UUID
&select=*
```

**Response:**
```json
[
  {
    "voter_id": "uuid",
    "target_user_id": "uuid",
    "pace": 75,
    "shooting": 80,
    "passing": 70,
    "dribbling": 85,
    "defending": 60,
    "physical": 78
  }
]
```

#### POST `/rest/v1/player_votes`

Votar em jogador.

**Request:**
```json
{
  "voter_id": "uuid",
  "target_user_id": "uuid",
  "pace": 75,
  "shooting": 80,
  "passing": 70,
  "dribbling": 85,
  "defending": 60,
  "physical": 78
}
```

**RLS**: Upsert automático (ON CONFLICT UPDATE)

### Match Ratings

#### GET `/rest/v1/match_ratings`

Avaliações de uma partida.

**Query Params:**
```
?event_id=eq.UUID
&select=*,profiles(name,avatar)
```

**Response:**
```json
[
  {
    "event_id": "uuid",
    "player_id": "uuid",
    "voter_id": "uuid",
    "rating": 8.5,
    "profiles": {
      "name": "João Silva",
      "avatar": "https://..."
    }
  }
]
```

#### POST `/rest/v1/match_ratings`

Avaliar jogador em partida.

**Request:**
```json
{
  "event_id": "uuid",
  "player_id": "uuid",
  "voter_id": "uuid",
  "rating": 8.5
}
```

## 🔧 RPC Functions

### confirm_promotion

Confirmar promoção de membro.

**Request:**
```sql
SELECT confirm_promotion('notification-uuid');
```

**Via JS:**
```typescript
const { data, error } = await supabase
  .rpc('confirm_promotion', { 
    notification_id: 'uuid' 
  });
```

**Response:**
```json
{
  "success": true,
  "new_role": "vice-presidente"
}
```

## 📡 Real-time Subscriptions

### Subscribe to Table Changes

```typescript
// Ouvir novas notificações
const subscription = supabase
  .channel('notifications')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      console.log('Nova notificação:', payload.new);
    }
  )
  .subscribe();

// Cleanup
subscription.unsubscribe();
```

### Subscribe to Presence

```typescript
// Presença em evento
const channel = supabase.channel(`event:${eventId}`);

channel
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    console.log('Online:', Object.keys(state).length);
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ user_id: userId, online_at: new Date() });
    }
  });
```

## 📦 Storage API

### Upload Avatar

```typescript
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.jpg`, file, {
    cacheControl: '3600',
    upsert: true
  });

// URL pública
const { data: { publicUrl } } = supabase.storage
  .from('avatars')
  .getPublicUrl(`${userId}/avatar.jpg`);
```

### Delete File

```typescript
const { error } = await supabase.storage
  .from('avatars')
  .remove([`${userId}/old-avatar.jpg`]);
```

## 🚨 Error Handling

### Error Response Format

```json
{
  "code": "PGRST116",
  "details": "The result contains 0 rows",
  "hint": null,
  "message": "JSON object requested, but multiple (or no) rows were returned"
}
```

### Common Error Codes

- `PGRST116`: No rows returned
- `PGRST204`: Failed to parse filter
- `42501`: Insufficient privilege (RLS)
- `23505`: Unique violation
- `23503`: Foreign key violation

### Error Handling Example

```typescript
try {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  
  return data;
} catch (error) {
  if (error.code === 'PGRST116') {
    console.error('Perfil não encontrado');
  } else if (error.code === '42501') {
    console.error('Sem permissão');
  } else {
    console.error('Erro desconhecido:', error);
  }
}
```

## 📊 Query Examples

### Complex Filters

```typescript
// AND conditions
const { data } = await supabase
  .from('transactions')
  .select('*')
  .eq('team_id', teamId)
  .eq('status', 'paid')
  .gte('created_at', '2026-01-01');

// OR conditions
const { data } = await supabase
  .from('profiles')
  .select('*')
  .or('role.eq.presidente,role.eq.vice-presidente');

// IN operator
const { data } = await supabase
  .from('inventory')
  .select('*')
  .in('status', ['excellent', 'good']);

// LIKE
const { data } = await supabase
  .from('profiles')
  .select('*')
  .ilike('name', '%silva%');
```

### Joins

```typescript
// Inner join
const { data } = await supabase
  .from('event_participants')
  .select(`
    *,
    events(title, event_date),
    profiles(name, avatar)
  `)
  .eq('user_id', userId);
```

### Aggregations

```typescript
// Count
const { count } = await supabase
  .from('profiles')
  .select('*', { count: 'exact', head: true })
  .eq('team_id', teamId);

// Sum
const { data } = await supabase
  .rpc('get_team_balance', { team_id: teamId });
```

## 🔒 Rate Limiting

- **Free tier**: 500 requests/minuto
- **Pro tier**: Customizável

**Headers de resposta:**
```
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 498
X-RateLimit-Reset: 1675728000
```

## 📝 Best Practices

1. **Sempre use typings do TypeScript**
2. **Implemente error handling robusto**
3. **Use select específico (evite `*` em produção)**
4. **Aproveite RLS ao máximo**
5. **Cache dados quando possível**
6. **Implemente retry logic para failures**
7. **Use pagination para grandes datasets**
8. **Monitore query performance**

---

**Última atualização**: 2026-02-07
