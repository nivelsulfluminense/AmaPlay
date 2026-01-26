# 🚀 Guia de Configuração do MCP Supabase

## ✅ Passo 1: Instalação (Concluído)

O pacote `supabase-mcp` foi instalado globalmente com sucesso!

```bash
npm install -g supabase-mcp
```

---

## 📋 Passo 2: Obter Credenciais do Supabase

Você precisa das seguintes credenciais do seu projeto Supabase:

### 2.1. Acesse o Painel do Supabase
1. Vá para: https://supabase.com/dashboard
2. Faça login na sua conta
3. Selecione seu projeto (ou crie um novo)

### 2.2. Encontre as Credenciais
1. No menu lateral, clique em **Project Settings** (ícone de engrenagem)
2. Clique em **API**
3. Copie as seguintes informações:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** (em Project API keys) → `SUPABASE_ANON_KEY`
   - **service_role** (em Project API keys) → `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **IMPORTANTE**: A chave `service_role` é PRIVADA e nunca deve ser exposta ao cliente!

---

## 🔧 Passo 3: Configurar o MCP

Dependendo do seu editor, siga as instruções abaixo:

### **Para Cursor IDE:**

1. Abra as configurações do Cursor:
   - Windows/Linux: `Ctrl + ,`
   - Mac: `Cmd + ,`

2. Procure por "MCP" ou "Model Context Protocol"

3. Adicione a seguinte configuração:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "supabase-mcp"],
      "env": {
        "SUPABASE_URL": "https://seu-projeto-id.supabase.co",
        "SUPABASE_ANON_KEY": "sua-chave-anon-aqui",
        "SUPABASE_SERVICE_ROLE_KEY": "sua-chave-service-role-aqui"
      }
    }
  }
}
```

### **Para VS Code com extensão MCP:**

1. Instale a extensão MCP (se ainda não tiver)
2. Crie/edite o arquivo: `~/.config/mcp/settings.json` (Linux/Mac) ou `%APPDATA%\mcp\settings.json` (Windows)
3. Adicione a mesma configuração acima

### **Para Claude Desktop:**

1. Edite o arquivo de configuração:
   - Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2. Adicione a configuração do servidor MCP

---

## 🔐 Passo 4: Armazenar Credenciais com Segurança

Como você já tem um arquivo `.env.local`, vamos adicionar as credenciais lá:

```env
# Supabase Configuration
SUPABASE_URL=https://seu-projeto-id.supabase.co
SUPABASE_ANON_KEY=sua-chave-anon-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-aqui
```

⚠️ **Certifique-se** de que `.env.local` está no `.gitignore` para não commitar suas chaves!

---

## ✨ Passo 5: Testar a Conexão

Após configurar, reinicie seu editor e teste:

1. Reinicie o Cursor/VS Code
2. Verifique se o servidor MCP está conectado
3. Tente fazer uma consulta ao banco de dados através do MCP

---

## 📦 Passo 6 (Opcional): Instalar SDK Supabase no Projeto

Se você quiser usar o Supabase diretamente no código (não apenas via MCP):

```bash
npm install @supabase/supabase-js
```

Depois, crie um cliente Supabase:

```typescript
// services/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

## 🎯 Recursos do MCP Supabase

Com o MCP Supabase configurado, você pode:

✅ **Autenticação**: Criar, listar, atualizar e deletar usuários  
✅ **Banco de Dados**: Executar queries SQL, gerenciar tabelas, migrations  
✅ **Storage**: Criar buckets, upload/download de arquivos  
✅ **RLS**: Gerenciar Row Level Security  
✅ **Real-time**: Criar subscriptions  
✅ **Edge Functions**: Invocar funções serverless  
✅ **Analytics**: Estatísticas e métricas do banco  

---

## 🐛 Solução de Problemas

### Erro: "SUPABASE_URL is required"
- Verifique se as variáveis de ambiente estão configuradas corretamente
- Reinicie o editor após adicionar as credenciais

### Erro: "Invalid API key"
- Confirme se você copiou a chave correta do painel do Supabase
- Certifique-se de não ter espaços extras nas chaves

### MCP não aparece no editor
- Verifique se o pacote foi instalado globalmente: `npm list -g supabase-mcp`
- Tente reinstalar: `npm install -g supabase-mcp`

---

## 📚 Documentação Adicional

- [Supabase Docs](https://supabase.com/docs)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Supabase MCP GitHub](https://github.com/supabase/mcp-server-supabase)

---

## 🎉 Próximos Passos

Agora que o MCP está configurado, você pode:

1. ✅ Migrar do LocalStorage para Supabase
2. ✅ Implementar autenticação real
3. ✅ Adicionar upload de imagens no Storage
4. ✅ Usar real-time para atualizações ao vivo
5. ✅ Implementar Row Level Security para privacidade

**Precisa de ajuda com qualquer um desses passos? É só pedir!** 🚀
