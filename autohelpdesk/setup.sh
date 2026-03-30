#!/bin/bash
# =============================================
# AUTO HELP DESK - Setup automático
# =============================================
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║    🚗 AUTO HELP DESK - Setup Inicial     ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# 1. Instalar dependências do backend
echo "📦 Instalando dependências Node.js..."
cd backend && npm install
if [ $? -ne 0 ]; then echo "❌ Erro ao instalar dependências."; exit 1; fi

# 2. Copiar .env se não existir
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "⚠️  Arquivo .env criado a partir do .env.example"
  echo "   EDITE o arquivo backend/.env com sua senha do MySQL antes de continuar!"
  echo ""
fi

echo "✅ Setup concluído!"
echo ""
echo "Próximos passos:"
echo "  1. Edite backend/.env com os dados do seu MySQL"
echo "  2. Execute no MySQL: source backend/database.sql"
echo "  3. Execute: cd backend && npm start"
echo "  4. Acesse: http://localhost:3001"
echo ""
