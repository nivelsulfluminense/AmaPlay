# Guia de Configuração de Login Social (OAuth)

Para ativar o login com Google, Facebook e Apple no seu aplicativo AmaPlay, você precisa obter as chaves de API (Client ID e Secret) em cada plataforma.

A URL de Callback (Redirect URL) que você vai precisar em todos os passos abaixo é encontrada no seu painel Supabase em **Authentication > Providers**. Geralmente tem o formato:
`https://<seu-projeto>.supabase.co/auth/v1/callback`

---

## 1. Google (Google Cloud Console)

1.  Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2.  Crie um **Novo Projeto** ou selecione um existente.
3.  No menu lateral, vá para **APIs e Serviços > Tela de permissão OAuth**.
    *   Selecione **Externo** e clique em Criar.
    *   Preencha o nome do App ("AmaPlay"), email de suporte e dados de contato.
    *   Clique em Salvar e Continuar até finalizar.
4.  Vá para **Credenciais** no menu lateral.
5.  Clique em **+ CRIAR CREDENCIAIS** > **ID do cliente OAuth**.
6.  Tipo de aplicativo: **Aplicação Web**.
7.  Nome: "AmaPlay Web".
8.  **Origens JavaScript autorizadas**:
    *   `http://localhost:3000`
    *   `https://ama-play.vercel.app` (sua URL de produção)
9.  **URIs de redirecionamento autorizados**:
    *   Cole a **Redirect URL** do seu projeto Supabase (veja no início deste guia).
10. Clique em **Criar**.
11. Copie o **ID do cliente** e a **Chave secreta do cliente** e cole no painel do Supabase (Authentication > Providers > Google).

---

## 2. Facebook (Meta for Developers)

1.  Acesse o [Meta for Developers](https://developers.facebook.com/).
2.  Vá em **Meus Apps** e clique em **Criar App**.
3.  Selecione **Consumidor** ou **Outro** (dependendo das opções atuais) e clique em Avançar.
4.  Preencha o nome ("AmaPlay") e email.
5.  No painel do app, procure por **Login do Facebook** e clique em **Configurar**.
6.  Selecione **Web**.
7.  No menu lateral esquerdo, vá em **Login do Facebook > Configurações**.
8.  Em **Valid OAuth Redirect URIs**, cole a **Redirect URL** do seu projeto Supabase. Salve.
9.  Agora vá em **Configurações > Básico** no menu lateral esquerdo.
10. Copie o **ID do Aplicativo** e a **Chave Secreta do Aplicativo** (clique em Mostrar).
11. Cole essas chaves no painel do Supabase (Authentication > Providers > Facebook).

---

## 3. Apple (Apple Developer Program)

*Nota: Requer uma conta de desenvolvedor da Apple ativa (paga).*

1.  Acesse o [Apple Developer Portal](https://developer.apple.com/account/).
2.  Vá em **Certificates, Identifiers & Profiles**.
3.  **Identifiers**: Crie um App ID com o recurso "Sign in with Apple" ativado.
4.  **Identifiers**: Crie um **Services ID**.
    *   Vincule ao seu App ID principal.
    *   Configure o "Sign in with Apple" no Service ID.
    *   Adicione o domínio (ex: `ama-play.vercel.app`) e a **Redirect URL** do Supabase em "Return URLs".
5.  **Keys**: Crie uma nova chave (Key).
    *   Marque "Sign in with Apple".
    *   Baixe o arquivo `.p8` (Guarde com segurança, você não consegue baixar de novo!).
6.  No Painel do Supabase (Authentication > Providers > Apple):
    *   **Service ID**: O identificador que você criou no passo 4.
    *   **Team ID**: Seu ID de time da Apple (canto superior direito do portal).
    *   **Key ID**: O ID da chave criada no passo 5.
    *   **Secret Key**: Cole o conteúdo do arquivo `.p8` que você baixou.

---

## Passo Final: Supabase

Após configurar cada provedor:
1.  Vá em **Authentication > URL Configuration**.
2.  Adicione suas URLs de site em **Redirect URLs**:
    *   `http://localhost:3000`
    *   `http://localhost:3000/#/dashboard`
    *   `https://ama-play.vercel.app`
    *   `https://ama-play.vercel.app/#/dashboard`
