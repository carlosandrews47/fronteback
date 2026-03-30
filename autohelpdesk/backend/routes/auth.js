// routes/auth.js
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const auth    = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: 'Email e senha obrigatórios.' });

  try {
    const [rows] = await db.query(
      'SELECT u.*, p.nome AS plano_nome, p.sla_minutos FROM usuarios u LEFT JOIN planos p ON u.plano_id = p.id WHERE u.email = ? AND u.ativo = 1',
      [email]
    );
    if (!rows.length) return res.status(401).json({ erro: 'Credenciais inválidas.' });

    const usuario = rows[0];
    const senhaOk = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaOk) return res.status(401).json({ erro: 'Credenciais inválidas.' });

    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil, plano_id: usuario.plano_id },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    delete usuario.senha_hash;
    res.json({ token, usuario });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});

// POST /api/auth/registrar
router.post('/registrar', async (req, res) => {
  const { nome, email, senha, telefone, cpf, plano_id } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios.' });

  try {
    const [exist] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (exist.length) return res.status(409).json({ erro: 'Email já cadastrado.' });

    const hash = await bcrypt.hash(senha, 10);
    const [result] = await db.query(
      'INSERT INTO usuarios (nome, email, senha_hash, telefone, cpf, perfil, plano_id) VALUES (?,?,?,?,?,?,?)',
      [nome, email, hash, telefone || null, cpf || null, 'cliente', plano_id || null]
    );

    // Se escolheu plano, cria assinatura
    if (plano_id) {
      const hoje = new Date();
      const renovacao = new Date(hoje);
      renovacao.setMonth(renovacao.getMonth() + 1);
      await db.query(
        'INSERT INTO assinaturas (usuario_id, plano_id, data_inicio, data_renovacao) VALUES (?,?,?,?)',
        [result.insertId, plano_id, hoje.toISOString().split('T')[0], renovacao.toISOString().split('T')[0]]
      );
      await db.query('UPDATE usuarios SET plano_id = ? WHERE id = ?', [plano_id, result.insertId]);
    }

    res.status(201).json({ mensagem: 'Cadastro realizado com sucesso!', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao cadastrar usuário.' });
  }
});

// GET /api/auth/perfil
router.get('/perfil', auth(), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.nome, u.email, u.telefone, u.cpf, u.perfil, u.criado_em,
              p.nome AS plano_nome, p.sla_minutos, p.guincho_mes, p.cobertura_km,
              p.tem_taxi, p.tem_mecanico24h, p.tem_oficina, p.preco,
              a.status AS assinatura_status, a.guincho_usado, a.data_renovacao
       FROM usuarios u
       LEFT JOIN planos p ON u.plano_id = p.id
       LEFT JOIN assinaturas a ON u.id = a.usuario_id
       WHERE u.id = ?`, [req.usuario.id]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar perfil.' });
  }
});

module.exports = router;
