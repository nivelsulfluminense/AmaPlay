# Guia de Contribuição - AmaPlay

## 🤝 Bem-vindo!

Obrigado por considerar contribuir com o AmaPlay! Este guia ajudará você a entender como participar do desenvolvimento do projeto.

## 📋 Código de Conduta

Ao contribuir, você concorda em seguir nosso código de conduta:

- Seja respeitoso e inclusivo
- Aceite críticas construtivas
- Foque no que é melhor para a comunidade
- Demonstre empatia com outros membros

## 🚀 Como Começar

### 1. Fork e Clone

```bash
# Fork no GitHub primeiro, depois:
git clone https://github.com/SEU-USUARIO/AmaPlay.git
cd amaplay

# Adicionar upstream
git remote add upstream https://github.com/nivelsulfluminense/AmaPlay.git
```

### 2. Configurar Ambiente

```bash
# Instalar dependências
npm install

# Copiar .env.example
cp .env.example .env

# Configurar variáveis de ambiente
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...

# Iniciar dev server
npm run dev
```

### 3. Criar Branch

```bash
# Sempre criar branch a partir da main atualizada
git checkout main
git pull upstream main

# Criar nova branch
git checkout -b feature/nome-da-feature
# ou
git checkout -b fix/nome-do-bug
```

## 📝 Padrões de Commit

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

### Formato

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Apenas documentação
- `style`: Mudanças de formatação (não afetam código)
- `refactor`: Refatoração (não adiciona feature nem corrige bug)
- `perf`: Melhoria de performance
- `test`: Adicionar ou corrigir testes
- `chore`: Tarefas de manutenção

### Scopes Comuns

- `auth`: Autenticação
- `dashboard`: Dashboard
- `finance`: Módulo financeiro
- `inventory`: Estoque
- `agenda`: Agenda de eventos
- `scouts`: Sistema de scouts
- `ui`: Interface geral
- `db`: Banco de dados

### Exemplos

```bash
feat(auth): adicionar login com Google OAuth

fix(finance): corrigir cálculo de saldo mensal

docs(readme): atualizar instruções de instalação

style(dashboard): ajustar espaçamento dos cards

refactor(inventory): extrair lógica de validação para service

perf(agenda): otimizar query de eventos

test(finance): adicionar testes para TransactionService

chore(deps): atualizar dependências do projeto
```

## 🏗️ Estrutura de PR

### Template de Pull Request

```markdown
## Descrição
Breve descrição do que foi feito

## Tipo de Mudança
- [ ] Bug fix (correção que não quebra funcionalidades existentes)
- [ ] Nova feature (adição que não quebra funcionalidades existentes)
- [ ] Breaking change (correção ou feature que causa mudança incompatível)
- [ ] Documentação

## Checklist
- [ ] Meu código segue os padrões do projeto
- [ ] Fiz self-review do código
- [ ] Comentei partes complexas
- [ ] Atualizei a documentação
- [ ] Não há warnings no console
- [ ] Testei localmente

## Screenshots (se aplicável)
Adicionar screenshots ou GIFs

## Issues Relacionadas
Closes #123
Related to #456
```

### Processo de Review

1. **Self-review**: Revise seu próprio código primeiro
2. **Automated checks**: CI/CD deve passar
3. **Peer review**: Pelo menos 1 aprovação necessária
4. **Maintainer review**: Revisão final do maintainer

## 💻 Padrões de Código

### TypeScript

```typescript
// ✅ BOM
interface UserProfile {
  id: string;
  name: string;
  email: string;
}

const getUserProfile = async (userId: string): Promise<UserProfile> => {
  // ...
};

// ❌ RUIM
const getUserProfile = async (userId) => {
  // sem tipagem
};
```

### React Components

```typescript
// ✅ BOM
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

const Button = ({ label, onClick, variant = 'primary' }: ButtonProps) => {
  return (
    <button 
      onClick={onClick}
      className={`btn btn-${variant}`}
    >
      {label}
    </button>
  );
};

export default Button;

// ❌ RUIM
const Button = (props) => {
  return <button onClick={props.onClick}>{props.label}</button>;
};
```

### Hooks

```typescript
// ✅ BOM
const useTeamData = (teamId: string) => {
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTeam = async () => {
      setLoading(true);
      try {
        const data = await dataService.teams.getById(teamId);
        setTeam(data);
      } catch (error) {
        console.error('Error loading team:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTeam();
  }, [teamId]);

  return { team, loading };
};

// ❌ RUIM
const useTeamData = (teamId) => {
  const [team, setTeam] = useState();
  // sem loading state, sem error handling
};
```

### Tailwind CSS

```tsx
// ✅ BOM - Classes organizadas
<div className="flex items-center justify-between p-4 bg-surface-dark rounded-xl border border-white/10">
  <span className="text-white font-bold">Label</span>
  <button className="px-4 py-2 bg-primary text-background-dark rounded-lg hover:bg-primary-dark transition-colors">
    Action
  </button>
</div>

// ❌ RUIM - Classes desorganizadas e inline styles
<div className="p-4 flex bg-surface-dark border-white/10 border items-center rounded-xl justify-between" style={{ marginTop: '10px' }}>
  {/* ... */}
</div>
```

## 🧪 Testes (Quando Implementados)

### Unit Tests

```typescript
// ✅ BOM
describe('authService', () => {
  describe('login', () => {
    it('should return user data on successful login', async () => {
      const result = await authService.login('test@example.com', 'password');
      
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw error on invalid credentials', async () => {
      await expect(
        authService.login('test@example.com', 'wrong')
      ).rejects.toThrow('Invalid credentials');
    });
  });
});
```

### Integration Tests

```typescript
// Testar fluxos completos
describe('User Registration Flow', () => {
  it('should complete full registration', async () => {
    // 1. Register
    const user = await authService.register('new@example.com', 'password');
    
    // 2. Set role
    await userContext.setIntendedRole('player');
    
    // 3. Join team
    await userContext.joinTeam(teamId);
    
    // 4. Verify status
    expect(user.status).toBe('pending');
  });
});
```

## 📚 Documentação

### Comentários no Código

```typescript
// ✅ BOM - Explica o "porquê", não o "o quê"
// Usamos setTimeout para evitar race condition com o Supabase RLS
setTimeout(() => {
  fetchNotifications();
}, 100);

// ❌ RUIM - Repete o código
// Chama fetchNotifications
fetchNotifications();
```

### JSDoc (quando necessário)

```typescript
/**
 * Calcula o saldo mensal de um jogador baseado em mensalidades e extras
 * 
 * @param userId - ID do usuário
 * @param month - Mês de referência (1-12)
 * @param year - Ano de referência
 * @returns Objeto com débitos, créditos e saldo
 */
const calculateMonthlyBalance = async (
  userId: string, 
  month: number, 
  year: number
): Promise<MonthlyBalance> => {
  // ...
};
```

## 🐛 Reportando Bugs

### Template de Issue

```markdown
**Descrição do Bug**
Breve descrição do problema

**Passos para Reproduzir**
1. Ir para '...'
2. Clicar em '...'
3. Scroll até '...'
4. Ver erro

**Comportamento Esperado**
O que deveria acontecer

**Comportamento Atual**
O que está acontecendo

**Screenshots**
Se aplicável, adicione screenshots

**Ambiente**
- OS: [e.g. iOS, Android, Windows]
- Browser: [e.g. chrome, safari]
- Versão: [e.g. 22]
- Dispositivo: [e.g. iPhone 12, Desktop]

**Contexto Adicional**
Qualquer informação adicional relevante
```

## ✨ Propondo Features

### Template de Feature Request

```markdown
**A feature resolve que problema?**
Descrição clara do problema

**Solução Proposta**
Como você imagina que a feature deveria funcionar

**Alternativas Consideradas**
Outras formas de resolver o problema

**Impacto**
- [ ] Alta prioridade
- [ ] Média prioridade
- [ ] Baixa prioridade

**Screenshots/Mockups**
Se aplicável, adicione mockups
```

## 🔄 Workflow de Desenvolvimento

```
1. Issue criada/atribuída
   ↓
2. Criar branch (feat/* ou fix/*)
   ↓
3. Desenvolver e commitar
   ↓
4. Push para fork
   ↓
5. Abrir Pull Request
   ↓
6. Code Review
   ↓
7. Ajustes (se necessário)
   ↓
8. Aprovação
   ↓
9. Merge para main
   ↓
10. Deploy automático
```

## 📦 Versionamento

Seguimos [Semantic Versioning](https://semver.org/):

- **MAJOR**: Mudanças incompatíveis na API
- **MINOR**: Novas funcionalidades (compatíveis)
- **PATCH**: Bug fixes (compatíveis)

Exemplo: `1.2.3` → `MAJOR.MINOR.PATCH`

## 🎯 Áreas para Contribuir

### Frontend
- Componentes reutilizáveis
- Melhorias de UX/UI
- Responsividade
- Acessibilidade
- Performance

### Backend
- Otimização de queries
- Novas políticas RLS
- Triggers e functions
- Migrações

### Documentação
- Melhorias no README
- Tutoriais
- Exemplos de código
- Traduções

### Testes
- Unit tests
- Integration tests
- E2E tests
- Performance tests

### DevOps
- CI/CD pipelines
- Docker configs
- Monitoring
- Logging

## 🏆 Reconhecimento

Contribuidores são reconhecidos em:
- README.md
- CONTRIBUTORS.md
- Release notes

## 📞 Contato

- **Issues**: Use GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: contato@nivelsulfluminense.com

## 📄 Licença

Ao contribuir, você concorda que suas contribuições serão licenciadas sob a mesma licença do projeto (MIT).

---

**Obrigado por contribuir com o AmaPlay! ⚽🚀**
