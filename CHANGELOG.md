# Changelog - AmaPlay

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Em Desenvolvimento
- Sistema de chat em tempo real
- Modo offline com sincronização
- PWA (Progressive Web App)
- Notificações push

## [1.0.0] - 2026-02-07

### 🎉 Primeira Versão Estável

#### Adicionado
- **Sistema de Autenticação Completo**
  - Login com email/senha
  - Integração com Google OAuth
  - Integração com Apple OAuth
  - Integração com Facebook OAuth
  - Recuperação de senha
  - Auto-criação de perfil via trigger

- **Dashboard Inteligente**
  - Visão geral do time
  - Próximos 3 eventos
  - Saldo financeiro em tempo real
  - Aniversariantes do mês
  - Quick actions personalizadas por role
  - Sistema de notificações com badge

- **Gestão Financeira**
  - Controle de receitas e despesas
  - Sistema de mensalidades com tracking
  - Aprovação de transações (presidente/vice)
  - Relatórios mensais e anuais
  - Exportação para Excel e PDF
  - Configuração de dados bancários
  - Cálculo automático de débitos

- **Agenda de Eventos**
  - Criação de jogos, treinos, churrascos
  - Sistema de confirmação de presença
  - Recorrência (semanal, mensal, anual)
  - Compartilhamento via WhatsApp
  - Notificações automáticas
  - Lista de participantes

- **Estoque de Materiais**
  - Inventário completo
  - Categorias customizáveis
  - Tracking de responsáveis
  - Status de condição
  - Alertas de estoque baixo
  - Histórico de movimentações

- **Sistema de Scouts**
  - Avaliação estilo FIFA (6 atributos)
  - Votação entre jogadores
  - Cálculo automático de OVR
  - Histórico de avaliações
  - Estatísticas por partida
  - Sistema de rating (0-10)

- **Cards Personalizados**
  - Design estilo FIFA
  - Versões Ouro e Prata
  - Captura e compartilhamento
  - Customização de background
  - Posições e estatísticas

- **Gestão de Membros**
  - Aprovação de novos membros
  - Sistema de promoções
  - Convites para cargos
  - Remoção de membros
  - Troca automática de cargos (presidente/vice)

- **Sistema de Notificações**
  - Convites de promoção
  - Alertas gerais
  - Badge com contagem
  - Marcar como lido
  - Histórico completo

- **Configurações**
  - Perfil pessoal
  - Avatar customizável
  - Privacidade
  - Gestão do time (para líderes)
  - Solicitação de promoção
  - Renúncia de cargo

- **Onboarding Inteligente**
  - Fluxo guiado para novos usuários
  - Seleção de cargo
  - Criação ou entrada em time
  - Configuração de privacidade
  - Personalização de perfil
  - Smart routing baseado em status

#### Segurança
- Row Level Security (RLS) em todas as tabelas
- Isolamento completo entre times
- Políticas baseadas em roles
- JWT authentication via Supabase
- Triggers para integridade de dados

#### Performance
- Lazy loading de componentes
- useCallback e useMemo otimizados
- Índices de banco otimizados
- Query caching
- Debouncing em inputs

#### UI/UX
- Design dark premium
- Responsivo mobile-first (max-width: 448px)
- Animações suaves
- Loading states
- Error handling robusto
- Toast notifications
- Material Symbols icons

#### Infraestrutura
- React 18.3 com TypeScript
- Vite para build
- Supabase BaaS
- TailwindCSS
- Deploy automático (Vercel/Netlify ready)

### Corrigido
- Espaçamento vertical excessivo em todas as telas móveis
- Botões de ação flutuantes saindo da área visível
- Badge de notificações não atualizando
- Cálculo incorreto de mensalidades
- Race conditions em queries simultâneas
- Memory leaks em subscriptions

### Alterado
- Migração de `status` para `is_approved` em team_members
- Refatoração do sistema de promoções
- Otimização do UserContext
- Melhorias no fluxo de aprovação
- Atualização de dependências

### Removido
- Código legado de autenticação manual
- Componentes não utilizados
- Console.logs de debug

## [0.9.0] - 2026-01-26

### Adicionado
- Sistema de scouts com votação
- Cards personalizados de jogadores
- Sistema de match ratings
- Estatísticas por partida

### Corrigido
- Problemas de navegação no login
- Bugs no fluxo de onboarding
- Erros de tipagem TypeScript

## [0.8.0] - 2026-01-22

### Adicionado
- Sistema de notificações
- Gestão de membros completa
- Sistema de promoções

### Alterado
- Refatoração completa do banco de dados
- Reimplementação de RLS
- Melhorias na arquitetura

## [0.7.0] - 2026-01-19

### Adicionado
- Tela de Finanças completa
- Sistema de mensalidades
- Aprovação de transações
- Relatórios financeiros

## [0.6.0] - 2026-01-17

### Adicionado
- Estoque de materiais
- Sistema de categorias
- Gestão de responsáveis

### Corrigido
- Problemas com face-api.js
- Dimensões dos cards

## [0.5.0] - 2026-01-15

### Adicionado
- Agenda de eventos
- Sistema de confirmação
- Recorrência de eventos

## [0.4.0] - 2026-01-13

### Adicionado
- Dashboard inicial
- Navegação bottom nav
- Estrutura de rotas

## [0.3.0] - 2026-01-10

### Adicionado
- Sistema de autenticação
- Integração com Supabase
- UserContext

## [0.2.0] - 2026-01-05

### Adicionado
- Configuração inicial do projeto
- Setup do Vite
- TailwindCSS

## [0.1.0] - 2026-01-01

### Adicionado
- Estrutura inicial do projeto
- README básico
- Configuração Git

---

## Tipos de Mudanças

- **Adicionado** para novas funcionalidades.
- **Alterado** para mudanças em funcionalidades existentes.
- **Descontinuado** para funcionalidades que serão removidas.
- **Removido** para funcionalidades removidas.
- **Corrigido** para correções de bugs.
- **Segurança** para vulnerabilidades.

## Links

- [Unreleased]: https://github.com/nivelsulfluminense/AmaPlay/compare/v1.0.0...HEAD
- [1.0.0]: https://github.com/nivelsulfluminense/AmaPlay/releases/tag/v1.0.0
