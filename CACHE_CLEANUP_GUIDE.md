# 🧹 Guia de Limpeza de Cache - AmaPlay

## ✅ Limpezas Realizadas Automaticamente

### 1. Cache do NPM
```bash
npm cache clean --force
```
✅ **Concluído** - Cache do NPM limpo

### 2. Pasta de Build (dist)
```bash
Remove-Item -Recurse -Force dist
```
✅ **Concluído** - Pasta dist removida

---

## 📋 Próximos Passos - Limpeza do Navegador

### Opção 1: Limpeza Automática via Console (Recomendado)

1. Abra o aplicativo no navegador
2. Pressione **F12** para abrir o DevTools
3. Vá para a aba **Console**
4. Copie e cole o conteúdo do arquivo `clear-browser-cache.js`
5. Pressione **Enter**
6. Aguarde a mensagem de conclusão
7. Recarregue a página com **Ctrl+Shift+R** (Windows) ou **Cmd+Shift+R** (Mac)

### Opção 2: Limpeza Manual do Navegador

#### Google Chrome / Edge
1. Pressione **Ctrl+Shift+Delete** (Windows) ou **Cmd+Shift+Delete** (Mac)
2. Selecione:
   - ✅ Cookies e outros dados do site
   - ✅ Imagens e arquivos armazenados em cache
   - ✅ Dados de apps hospedados
3. Período: **Todo o período**
4. Clique em **Limpar dados**

#### Firefox
1. Pressione **Ctrl+Shift+Delete** (Windows) ou **Cmd+Shift+Delete** (Mac)
2. Selecione:
   - ✅ Cookies
   - ✅ Cache
   - ✅ Armazenamento offline de sites
3. Período: **Tudo**
4. Clique em **Limpar agora**

### Opção 3: Limpeza via DevTools (Mais Completa)

1. Abra o DevTools (**F12**)
2. Vá para **Application** (Chrome/Edge) ou **Storage** (Firefox)
3. Clique com botão direito em **Storage**
4. Selecione **Clear site data** ou **Delete All**
5. Confirme a ação

---

## 🔄 Reiniciar o Servidor de Desenvolvimento

Após limpar o cache, reinicie o servidor:

```bash
# Pare o servidor atual (Ctrl+C no terminal)
# Depois execute:
npm run dev
```

---

## 🎯 Verificação Pós-Limpeza

Após limpar tudo e reiniciar, verifique:

1. ✅ Você foi deslogado automaticamente
2. ✅ Não há dados de usuário no localStorage
3. ✅ Telas protegidas redirecionam para login
4. ✅ Após login, as rotas funcionam corretamente

### Como Verificar no Console:

```javascript
// Verificar se localStorage está vazio
console.log('localStorage:', localStorage.length); // Deve ser 0

// Verificar se sessionStorage está vazio
console.log('sessionStorage:', sessionStorage.length); // Deve ser 0

// Verificar cookies
console.log('cookies:', document.cookie); // Deve estar vazio ou sem dados do app
```

---

## 🚨 Problemas Comuns

### "Ainda consigo acessar rotas protegidas"
- Faça hard reload: **Ctrl+Shift+R** (Windows) ou **Cmd+Shift+R** (Mac)
- Tente em uma aba anônima/privada
- Verifique se o servidor foi reiniciado

### "Erro ao fazer login"
- Verifique se a migration do banco foi aplicada
- Limpe o cache novamente
- Verifique o console do navegador para erros

### "Página em branco"
- Verifique o console do navegador (F12)
- Reinicie o servidor de desenvolvimento
- Verifique se não há erros de compilação

---

## 📝 Checklist Completo

- [x] Cache do NPM limpo
- [x] Pasta dist removida
- [ ] Cache do navegador limpo
- [ ] localStorage limpo
- [ ] sessionStorage limpo
- [ ] Cookies limpos
- [ ] IndexedDB limpo
- [ ] Servidor reiniciado
- [ ] Página recarregada com hard reload
- [ ] Teste de acesso sem login realizado
- [ ] Migration do banco aplicada

---

## 💡 Dicas Adicionais

### Modo Incógnito/Privado
Para testar sem cache:
- **Chrome/Edge**: Ctrl+Shift+N
- **Firefox**: Ctrl+Shift+P

### Desabilitar Cache durante Desenvolvimento
1. Abra DevTools (F12)
2. Vá para **Network**
3. Marque **Disable cache**
4. Mantenha o DevTools aberto enquanto desenvolve

### Limpar Cache do Supabase
O Supabase armazena tokens no localStorage. Para limpar:
```javascript
// No console do navegador
Object.keys(localStorage).forEach(key => {
  if (key.includes('supabase')) {
    localStorage.removeItem(key);
    console.log('Removido:', key);
  }
});
```

---

## 🎉 Pronto!

Após seguir todos os passos, seu ambiente estará completamente limpo e as novas mudanças de segurança estarão ativas!
