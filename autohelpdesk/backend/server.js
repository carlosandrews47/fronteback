// server.js - Auto Help Desk Backend
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app = express();

// ─── Middlewares globais ──────────────────────────────────────────────────
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','PATCH','DELETE'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Pasta de uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

// Serve o frontend estático
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ─── Rotas da API ─────────────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/chamados', require('./routes/chamados'));
app.use('/api',          require('./routes/misc'));

// ─── Fallback para SPA ────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ─── Iniciar servidor ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║      🚗 AUTO HELP DESK - Servidor        ║');
  console.log(`║   Rodando em: http://localhost:${PORT}      ║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log('  Usuários padrão:');
  console.log('  📧 admin@autohelpdesk.com  🔑 password');
  console.log('  📧 n1@autohelpdesk.com     🔑 password');
  console.log('  📧 n2@autohelpdesk.com     🔑 password');
  console.log('  📧 n3@autohelpdesk.com     🔑 password');
  console.log('');
});
