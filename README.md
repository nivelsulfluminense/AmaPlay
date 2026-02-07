# AmaPlay - Sistema de Gestão para Times Amadores de Futebol

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-18.3-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)

## 📋 Sobre o Projeto

AmaPlay é uma plataforma completa para gestão de times amadores de futebol, oferecendo ferramentas profissionais para administração, organização de eventos, controle financeiro, gestão de estoque e análise de desempenho de jogadores.

### 🎯 Principais Funcionalidades

- **Dashboard Inteligente**: Visão geral do time com próximos jogos, finanças e aniversariantes
- **Agenda de Eventos**: Criação e gestão de jogos, treinos, churrascos e reuniões
- **Gestão Financeira**: Controle de mensalidades, receitas, despesas e relatórios
- **Estoque de Materiais**: Inventário completo de equipamentos e materiais do time
- **Sistema de Scouts**: Avaliação e acompanhamento do desempenho dos jogadores
- **Cards Personalizados**: Criação de cards estilo FIFA com estatísticas dos jogadores
- **Gestão de Membros**: Aprovação, promoção e gerenciamento de membros do time
- **Sistema de Notificações**: Alertas e convites para promoções e eventos

## 🚀 Tecnologias Utilizadas

### Frontend
- **React 18.3.1** - Biblioteca para construção da interface
- **TypeScript 5.6.2** - Tipagem estática e segurança de código
- **Vite 5.4.2** - Build tool e dev server
- **React Router DOM 6.24.0** - Roteamento e navegação
- **TailwindCSS 3.4.7** - Framework CSS utilitário
- **date-fns 3.6.0** - Manipulação de datas

### Backend & Infraestrutura
- **Supabase** - Backend as a Service (BaaS)
  - PostgreSQL - Banco de dados relacional
  - Authentication - Sistema de autenticação
  - Storage - Armazenamento de arquivos
  - Real-time - Atualizações em tempo real
  - Row Level Security (RLS) - Segurança a nível de linha

### Adicionais
- **Material Symbols** - Ícones do Google
- **html2canvas** - Captura de screenshots
- **jsPDF** - Geração de PDFs

## 📁 Estrutura do Projeto

```
amaplay/
├── .agent/                      # Configurações de agentes IA
├── components/                  # Componentes React reutilizáveis
│   ├── BottomNav.tsx           # Navegação inferior
│   ├── Logo.tsx                # Logo do aplicativo
│   └── PlayerCard.tsx          # Card de jogador estilo FIFA
├── contexts/                    # Context API do React
│   └── UserContext.tsx         # Contexto global de usuário
├── hooks/                       # Hooks customizados
│   └── useAuthRedirect.ts      # Hook de redirecionamento
├── screens/                     # Telas da aplicação
│   ├── AgendaScreen.tsx        # Tela de agenda
│   ├── DashboardScreen.tsx     # Dashboard principal
│   ├── FinanceScreen.tsx       # Gestão financeira
│   ├── InventoryScreen.tsx     # Estoque de materiais
│   ├── LoginScreen.tsx         # Tela de login
│   ├── NotificationsScreen.tsx # Notificações
│   ├── ProSelectionScreen.tsx  # Modo profissional
│   ├── RegisterAccountScreen.tsx
│   ├── RegisterRoleScreen.tsx
│   ├── RegisterTeamScreen.tsx
│   ├── RegisterPrivacyScreen.tsx
│   ├── RegisterProfileScreen.tsx
│   ├── SettingsScreen.tsx      # Configurações
│   ├── ScoringScreen.tsx       # Sistema de pontuação
│   ├── ScoutsScreen.tsx        # Avaliação de jogadores
│   ├── PlayerStatsScreen.tsx   # Estatísticas de jogador
│   ├── TeamStatsScreen.tsx     # Estatísticas do time
│   └── ...
├── services/                    # Serviços e APIs
│   ├── authService.ts          # Serviço de autenticação
│   ├── dataService.ts          # Serviço de dados
│   └── supabase.ts             # Configuração Supabase
├── docs/                        # Documentação
│   ├── MANUAL_DO_USUARIO.md    # Manual do usuário
│   ├── ARCHITECTURE.md         # Arquitetura do sistema
│   └── DATABASE_SCHEMA.md      # Esquema do banco
├── public/                      # Arquivos públicos
├── App.tsx                      # Componente raiz
├── index.css                    # Estilos globais
├── main.tsx                     # Entry point
└── vite.config.ts              # Configuração Vite
```

## 🔧 Instalação e Configuração

### Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Conta no Supabase

### Passos de Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/nivelsulfluminense/AmaPlay.git
cd amaplay
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_anon_key
```

4. **Configure o banco de dados**

Execute os scripts SQL na ordem:
- `FULL_DATABASE_RESET.sql` - Estrutura completa
- `RULE_BOOK_SCHEMA.sql` - Schema do livro de regras

5. **Inicie o servidor de desenvolvimento**
```bash
npm run dev
```

O aplicativo estará disponível em `http://localhost:5173`

## 🏗️ Build para Produção

```bash
npm run build
```

Os arquivos otimizados serão gerados na pasta `dist/`

## 👥 Níveis de Acesso

### 🏆 Presidente
- Acesso total ao sistema
- Gestão completa de membros
- Aprovação de transações financeiras
- Configurações do time

### 🥈 Vice-Presidente
- Acesso similar ao Presidente
- Não pode remover o Presidente
- Gestão de membros e finanças

### 🛡️ Admin
- Acesso a finanças e estoque
- Criação de eventos
- Avaliação de jogadores

### ⚽ Jogador
- Visualização de agenda
- Auto-avaliação
- Pagamento de mensalidades
- Acesso ao próprio perfil

## 🔐 Segurança

- **Row Level Security (RLS)**: Todas as tabelas protegidas com políticas RLS
- **Autenticação JWT**: Tokens seguros via Supabase
- **Validação de Permissões**: Verificação em múltiplas camadas
- **SQL Injection Protection**: Uso de prepared statements
- **XSS Protection**: Sanitização de inputs

## 📱 Responsividade

O aplicativo é totalmente otimizado para dispositivos móveis com:
- Layout adaptativo (max-width: 448px)
- Touch-friendly interfaces
- Navegação inferior para facilitar uso com uma mão
- Performance otimizada para 3G/4G

## 🎨 Design System

### Cores Principais
- **Primary**: `#13EC5B` (Verde neon)
- **Background Dark**: `#0a0f0d`
- **Surface Dark**: `#111816`
- **Card Dark**: `#0d1815`

### Tipografia
- **Display**: Inter, sans-serif
- **Body**: System fonts

## 🧪 Testes

```bash
# Executar testes (quando implementados)
npm run test
```

## 📚 Documentação Adicional

- [Manual do Usuário](./docs/MANUAL_DO_USUARIO.md)
- [Arquitetura do Sistema](./docs/ARCHITECTURE.md)
- [Esquema do Banco de Dados](./docs/DATABASE_SCHEMA.md)
- [Guia de Deployment](./docs/DEPLOYMENT.md)
- [Guia de Contribuição](./docs/CONTRIBUTING.md)

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor, leia o [Guia de Contribuição](./docs/CONTRIBUTING.md) antes de submeter PRs.

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Autor

**Nível Sul Fluminense**
- GitHub: [@nivelsulfluminense](https://github.com/nivelsulfluminense)

## 🙏 Agradecimentos

- Comunidade React
- Supabase Team
- Google Material Symbols
- Todos os contribuidores

---

**⚽ Desenvolvido com paixão pelo futebol amador brasileiro**
