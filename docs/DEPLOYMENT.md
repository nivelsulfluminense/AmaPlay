# Guia de Deployment - AmaPlay

## 🚀 Visão Geral

Este guia fornece instruções detalhadas para fazer deploy do AmaPlay em diferentes plataformas e ambientes.

## 📋 Pré-requisitos

- [ ] Conta no Supabase (Free ou Pro)
- [ ] Conta em plataforma de hosting (Vercel, Netlify, ou similar)
- [ ] Git configurado
- [ ] Node.js 18+ instalado localmente

## 🔐 Configuração do Supabase

### 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Clique em "New Project"
3. Escolha:
   - **Nome**: `amaplay-production` (ou de sua preferência)
   - **Database Password**: Senha forte (salve em local seguro)
   - **Região**: Escolha mais próxima dos usuários (ex: `South America (São Paulo)`)
   - **Plano**: Free ou Pro conforme necessidade

### 2. Configurar Database

#### a) Execute o Schema Principal

1. Navegue até **SQL Editor** no painel do Supabase
2. Cole e execute o conteúdo de `FULL_DATABASE_RESET.sql`
3. Aguarde confirmação de sucesso

#### b) Execute Schemas Adicionais

```sql
-- RULE_BOOK_SCHEMA.sql
-- Cole e execute o conteúdo completo
```

#### c) Verifique as Tabelas

```sql
-- Verificar criação de tabelas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Deve retornar:
-- charges, events, event_participants, inventory,
-- match_ratings, notifications, player_votes, profiles,
-- receiver_accounts, rule_books, team_members,
-- teams, transactions
```

### 3. Row Level Security (RLS)

Verifique se RLS está habilitado em todas as tabelas:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

Todas devem ter `rowsecurity = true`.

### 4. Obter Credenciais

1. Vá para **Project Settings** → **API**
2. Copie:
   - **Project URL**: `https://[seu-projeto].supabase.co`
   - **anon/public key**: Chave pública (client-side)
   - **service_role key**: Chave privada (server-side/migrations)

⚠️ **IMPORTANTE**: Nunca exponha a `service_role key` no frontend!

### 5. Configurar Authentication

#### Habilitar Providers

1. Vá para **Authentication** → **Providers**
2. Configure providers desejados:

**Email/Password** (obrigatório):
- Já vem habilitado por padrão
- Configurar:
  - ✅ Enable Email Confirmations (recomendado)
  - ✅ Email Auth
  
**Google OAuth** (opcional):
```
1. Criar app em Google Cloud Console
2. Obter Client ID e Client Secret
3. Configurar redirect URL: 
   https://[seu-projeto].supabase.co/auth/v1/callback
4. Inserir credenciais no Supabase
```

**Apple OAuth** (opcional):
```
Similar ao Google, via Apple Developer
```

**Facebook OAuth** (opcional):
```
Similar ao Google, via Meta Developers
```

#### Configurar Email Templates

1. Vá para **Authentication** → **Email Templates**
2. Personalize templates:
   - Confirm Signup
   - Reset Password
   - Magic Link

### 6. Configurar Storage (Opcional)

Para avatares e cards de jogadores:

```sql
-- Criar bucket para avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Políticas de acesso
CREATE POLICY "Avatars são públicos"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Usuários podem fazer upload"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## 🌐 Deploy do Frontend

### Opção 1: Vercel (Recomendado)

#### Via Dashboard

1. Acesse [vercel.com](https://vercel.com)
2. Clique em "New Project"
3. Importe repositório do GitHub
4. Configure:

```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

5. **Environment Variables**:
```
VITE_SUPABASE_URL = https://[seu-projeto].supabase.co
VITE_SUPABASE_ANON_KEY = [sua-anon-key]
```

6. Clique em "Deploy"

#### Via CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Configurar env vars
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Deploy production
vercel --prod
```

### Opção 2: Netlify

1. Acesse [netlify.com](https://netlify.com)
2. "Add new site" → "Import existing project"
3. Conecte GitHub
4. Configure:

```
Build command: npm run build
Publish directory: dist
```

5. **Environment Variables**:
```
VITE_SUPABASE_URL = https://[seu-projeto].supabase.co
VITE_SUPABASE_ANON_KEY = [sua-anon-key]
```

6. Deploy

#### netlify.toml (Opcional)

Criar na raiz:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Opção 3: Railway

1. Acesse [railway.app](https://railway.app)
2. "New Project" → "Deploy from GitHub"
3. Selecione repositório
4. Configure variáveis de ambiente
5. Deploy automático

### Opção 4: Render

Similar aos anteriores, com configuração:

```yaml
# render.yaml
services:
  - type: web
    name: amaplay
    env: static
    buildCommand: npm install && npm run build
    staticPublishPath: ./dist
    envVars:
      - key: VITE_SUPABASE_URL
        value: https://[seu-projeto].supabase.co
      - key: VITE_SUPABASE_ANON_KEY
        sync: false
```

## 🔧 Configurações Adicionais

### Custom Domain

#### Vercel
```bash
vercel domains add seudominio.com
```

Configurar DNS:
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

#### Netlify
1. Site Settings → Domain Management
2. Add custom domain
3. Configurar DNS conforme instruções

### SSL/TLS

Automático em todas as plataformas mencionadas (Let's Encrypt).

### Redirects (HashRouter)

Como usamos HashRouter, não é necessário configurar redirects especiais. Mas para produção, considere migrar para BrowserRouter:

```typescript
// Mudar de:
import { HashRouter } from 'react-router-dom';

// Para:
import { BrowserRouter } from 'react-router-dom';

// E configurar _redirects ou vercel.json
```

**vercel.json**:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**_redirects** (Netlify):
```
/*    /index.html   200
```

## 📊 Monitoramento

### Supabase Dashboard

1. **Database Health**:
   - Project Settings → Database
   - Monitor connections, size, performance

2. **API Usage**:
   - Project Settings → API → Usage
   - Track requests, bandwidth

3. **Logs**:
   - Logs Explorer
   - Filter por severidade, timestamp

### Frontend Monitoring (Opcional)

#### Vercel Analytics

Adicionar ao `index.html`:
```html
<script defer src="/_vercel/insights/script.js"></script>
```

#### Google Analytics

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

#### Sentry (Error Tracking)

```bash
npm install @sentry/react @sentry/tracing
```

```typescript
// main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://[your-dsn]@sentry.io/[project-id]",
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
});
```

## 🔄 CI/CD

### GitHub Actions

Criar `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
        run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## 🧪 Ambiente de Staging

### Criar Branch de Staging

```bash
git checkout -b staging
git push origin staging
```

### Deploy Automático por Branch

**Vercel**: Cria preview automático para cada branch

**Netlify**: Similar, com deploy previews

**Configurar variáveis diferentes**:
```
VITE_SUPABASE_URL = https://staging-project.supabase.co
VITE_SUPABASE_ANON_KEY = [staging-anon-key]
```

## 🔒 Segurança em Produção

### Checklist de Segurança

- [ ] Variáveis de ambiente configuradas corretamente
- [ ] `service_role key` NUNCA no frontend
- [ ] RLS habilitado em todas as tabelas
- [ ] HTTPS configurado (automático nas plataformas)
- [ ] CORS configurado no Supabase
- [ ] Rate limiting habilitado
- [ ] Backup automático configurado

### CORS no Supabase

1. Settings → API → CORS
2. Adicionar domínio de produção:
```
https://seudominio.com
https://www.seudominio.com
```

### Rate Limiting

Supabase Pro:
- Settings → Rate Limiting
- Configurar limites por endpoint

## 📦 Backup e Recuperação

### Backup Automático (Supabase Pro)

1. Settings → Backup
2. Habilitar daily backups
3. Configurar retenção (7-30 dias)

### Backup Manual

```bash
# Exportar schema
supabase db dump --schema-only > schema.sql

# Exportar dados
supabase db dump --data-only > data.sql

# Restaurar
psql -h db.project.supabase.co -U postgres -d postgres < schema.sql
psql -h db.project.supabase.co -U postgres -d postgres < data.sql
```

## 🐛 Troubleshooting

### Build Falha

**Erro**: `VITE_SUPABASE_URL is not defined`
**Solução**: Verifique variáveis de ambiente

**Erro**: `module not found`
**Solução**: 
```bash
rm -rf node_modules package-lock.json
npm install
```

### Runtime Errors

**Erro**: `Failed to fetch from Supabase`
**Solução**: 
1. Verificar URL do Supabase
2. Verificar anon key
3. Verificar CORS
4. Verificar RLS policies

**Erro**: `Authentication failed`
**Solução**:
1. Verificar providers habilitados
2. Verificar redirect URLs
3. Verificar email templates

## 📈 Escalando para Produção

### Quando Atualizar Plano Supabase

**Free → Pro**:
- Mais de 500MB de banco
- Precisar de backups automáticos
- Mais de 50k requests/dia
- Precisar de suporte prioritário

### Performance Tips

1. **Database**:
   - Adicionar índices em queries lentas
   - Usar connection pooling
   - Habilitar cache

2. **Frontend**:
   - Code splitting
   - Lazy loading de rotas
   - Otimizar imagens
   - CDN para assets estáticos

3. **API**:
   - Implementar debouncing
   - Usar pagination
   - Cache no client

## 📚 Recursos Adicionais

- [Supabase Docs](https://supabase.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Netlify Docs](https://docs.netlify.com)
- [Vite Deployment](https://vitejs.dev/guide/static-deploy.html)

---

**Última atualização**: 2026-02-07
