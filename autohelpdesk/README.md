# 🚗 Auto Help Desk
### Sistema de Gestão de Chamados Técnicos Automotivos — SaaS

---

## 📋 Pré-requisitos

Antes de começar, você precisa ter instalado:

| Software | Versão mínima | Download |
|---|---|---|
| **Node.js** | 18+ | https://nodejs.org |
| **MySQL** ou **MariaDB** | 8.0+ / 10.6+ | https://mysql.com ou https://mariadb.org |
| **npm** | (vem com Node.js) | — |

---

## 🚀 Passo a Passo para Rodar

### 1. Configure o banco de dados

Abra o MySQL Workbench, HeidiSQL, DBeaver ou o terminal MySQL e execute:

```sql
-- No terminal MySQL:
mysql -u root -p < backend/database.sql

-- Ou via cliente gráfico:
-- Abra o arquivo backend/database.sql e execute
```

Isso vai criar:
- Banco de dados `autohelpdesk`
- Todas as tabelas
- 4 usuários de demonstração

---

### 2. Configure as variáveis de ambiente

```bash
# Copie o arquivo de exemplo
cd backend
cp .env.example .env
```

Abra o arquivo `backend/.env` e edite:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=SUA_SENHA_DO_MYSQL_AQUI   ← mude isso!
DB_NAME=autohelpdesk
JWT_SECRET=mude_essa_chave_para_algo_seguro
PORT=3001
```

---

### 3. Instale as dependências e inicie o servidor

```bash
cd backend
npm install
npm start
```

Você deve ver:
```
✅ MySQL conectado com sucesso!

╔══════════════════════════════════════════╗
║      🚗 AUTO HELP DESK - Servidor        ║
║   Rodando em: http://localhost:3001      ║
╚══════════════════════════════════════════╝
```

---

### 4. Acesse o sistema

Abra o navegador em: **http://localhost:3001**

---

## 👤 Usuários de Demonstração

| E-mail | Perfil | Senha |
|---|---|---|
| admin@autohelpdesk.com | Administrador | password |
| n1@autohelpdesk.com | Atendente N1 | password |
| n2@autohelpdesk.com | Técnico N2 | password |
| n3@autohelpdesk.com | Engenheiro N3 | password |

> Para criar um cliente, use a aba **Cadastrar** na tela de login.

---

## 🗂️ Estrutura do Projeto

```
autohelpdesk/
├── backend/
│   ├── server.js          ← Servidor Express principal
│   ├── db.js              ← Conexão MySQL
│   ├── database.sql       ← Script do banco de dados
│   ├── .env.example       ← Modelo de configuração
│   ├── middleware/
│   │   └── auth.js        ← Autenticação JWT
│   ├── routes/
│   │   ├── auth.js        ← Login, registro, perfil
│   │   ├── chamados.js    ← CRUD de chamados, escalada, SLA
│   │   └── misc.js        ← Veículos, planos, notificações, dashboard
│   └── uploads/           ← Evidências fotográficas (criado automaticamente)
│
└── frontend/
    └── index.html         ← SPA completa (HTML + CSS + JS)
```

---

## 🔌 API REST — Endpoints Principais

### Autenticação
```
POST   /api/auth/login           Fazer login
POST   /api/auth/registrar       Criar conta
GET    /api/auth/perfil          Dados do usuário logado
```

### Chamados
```
GET    /api/chamados             Listar chamados (com filtros)
GET    /api/chamados/:id         Detalhe do chamado + histórico
POST   /api/chamados             Abrir novo chamado
PATCH  /api/chamados/:id/assumir Técnico assume o chamado
PATCH  /api/chamados/:id/escalar Escalar para N2 ou N3
PATCH  /api/chamados/:id/resolver Resolver com solução
POST   /api/chamados/:id/avaliar Cliente avalia atendimento
POST   /api/chamados/:id/servico Acionar guincho/táxi/mecânico
POST   /api/chamados/:id/evidencia Upload de foto/arquivo
```

### Outros
```
GET    /api/planos               Listar planos disponíveis
GET    /api/veiculos             Veículos do cliente logado
POST   /api/veiculos             Cadastrar veículo
GET    /api/dashboard            Métricas gerais (staff)
GET    /api/notificacoes         Notificações do usuário
GET    /api/usuarios             Lista de usuários (admin)
```

---

## 📊 Funcionalidades por Perfil

| Funcionalidade | Cliente | N1 | N2 | N3 | Admin |
|---|:---:|:---:|:---:|:---:|:---:|
| Abrir chamado | ✅ | — | — | — | ✅ |
| Ver próprios chamados | ✅ | — | — | — | — |
| Ver todos os chamados | — | ✅ | ✅ | ✅ | ✅ |
| Assumir chamado | — | ✅ | ✅ | ✅ | ✅ |
| Escalar chamado | — | ✅ | ✅ | — | ✅ |
| Resolver chamado | — | ✅ | ✅ | ✅ | ✅ |
| Acionar serviços | — | ✅ | ✅ | — | ✅ |
| Dashboard | — | ✅ | ✅ | ✅ | ✅ |
| Gerenciar usuários | — | — | — | — | ✅ |
| Avaliar atendimento | ✅ | — | — | — | — |

---

## 📐 Planos de Assinatura

| | Básico | Prêmio |
|---|---|---|
| Preço | R$ 49,90/mês | R$ 149,90/mês |
| SLA | 15 minutos | 5 minutos |
| Guinchos/mês | 1 | 3 |
| Cobertura | Salvador | Salvador + 200 km |
| Táxi/Uber | ❌ | ✅ |
| Mecânico 24h | ❌ | ✅ |
| Oficina credenciada | ❌ | ✅ |

---

## 🛠️ Tecnologias Utilizadas

**Backend:**
- Node.js + Express — servidor HTTP
- MySQL2 — conexão com banco de dados
- JWT (jsonwebtoken) — autenticação
- bcryptjs — criptografia de senhas
- Multer — upload de arquivos
- CORS — Cross-Origin Resource Sharing
- dotenv — variáveis de ambiente

**Frontend:**
- HTML5 + CSS3 + JavaScript puro (sem frameworks)
- Google Fonts (Syne + DM Sans)
- SPA (Single Page Application) com roteamento manual

**Banco de Dados:**
- MySQL / MariaDB
- 8 tabelas: planos, usuarios, veiculos, assinaturas, chamados, historico_chamados, evidencias, servicos_acionados, notificacoes

---

## ⚠️ Solução de Problemas

**"Erro ao conectar MySQL"**
- Verifique se o MySQL está rodando
- Confira usuário, senha e nome do banco no `.env`
- Confirme que o banco `autohelpdesk` foi criado (`source database.sql`)

**"npm: command not found"**
- Instale o Node.js em https://nodejs.org

**Porta 3001 ocupada**
- Mude `PORT=3002` no `.env`
- Acesse http://localhost:3002

**Frontend não carrega**
- Verifique se o servidor está rodando (`npm start`)
- Acesse http://localhost:3001 (não abra o .html diretamente)
