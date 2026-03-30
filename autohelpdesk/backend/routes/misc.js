// routes/misc.js  –  Veículos, Planos, Notificações, Dashboard
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const auth    = require('../middleware/auth');

// ══════════════════════════════════════════
// PLANOS
// ══════════════════════════════════════════
router.get('/planos', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM planos WHERE ativo = 1 ORDER BY preco');
    res.json(rows);
  } catch (err) { res.status(500).json({ erro: 'Erro ao listar planos.' }); }
});

// ══════════════════════════════════════════
// VEÍCULOS
// ══════════════════════════════════════════
router.get('/veiculos', auth(['cliente']), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM veiculos WHERE usuario_id = ? AND ativo = 1', [req.usuario.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ erro: 'Erro ao listar veículos.' }); }
});

router.post('/veiculos', auth(['cliente']), async (req, res) => {
  const { placa, marca, modelo, ano, cor } = req.body;
  if (!placa) return res.status(400).json({ erro: 'Placa obrigatória.' });
  try {
    const [r] = await db.query(
      'INSERT INTO veiculos (usuario_id, placa, marca, modelo, ano, cor) VALUES (?,?,?,?,?,?)',
      [req.usuario.id, placa.toUpperCase(), marca || null, modelo || null, ano || null, cor || null]
    );
    res.status(201).json({ mensagem: 'Veículo cadastrado!', id: r.insertId });
  } catch (err) { res.status(500).json({ erro: 'Erro ao cadastrar veículo.' }); }
});

router.delete('/veiculos/:id', auth(['cliente']), async (req, res) => {
  try {
    await db.query('UPDATE veiculos SET ativo = 0 WHERE id = ? AND usuario_id = ?', [req.params.id, req.usuario.id]);
    res.json({ mensagem: 'Veículo removido.' });
  } catch (err) { res.status(500).json({ erro: 'Erro ao remover veículo.' }); }
});

// ══════════════════════════════════════════
// NOTIFICAÇÕES
// ══════════════════════════════════════════
router.get('/notificacoes', auth(), async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM notificacoes WHERE usuario_id = ? ORDER BY criado_em DESC LIMIT 50',
      [req.usuario.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ erro: 'Erro ao buscar notificações.' }); }
});

router.patch('/notificacoes/ler-todas', auth(), async (req, res) => {
  try {
    await db.query('UPDATE notificacoes SET lida = 1 WHERE usuario_id = ?', [req.usuario.id]);
    res.json({ mensagem: 'Notificações marcadas como lidas.' });
  } catch (err) { res.status(500).json({ erro: 'Erro.' }); }
});

// ══════════════════════════════════════════
// DASHBOARD (admin/técnicos)
// ══════════════════════════════════════════
router.get('/dashboard', auth(['atendente_n1','tecnico_n2','engenheiro_n3','admin']), async (req, res) => {
  try {
    const [[totais]] = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(status = 'aberto') AS abertos,
        SUM(status = 'em_atendimento') AS em_atendimento,
        SUM(status = 'escalado') AS escalados,
        SUM(status = 'resolvido') AS resolvidos,
        SUM(prioridade = 'critica') AS criticos,
        SUM(sla_cumprido = 1) AS sla_ok,
        SUM(sla_cumprido = 0) AS sla_violado,
        ROUND(AVG(avaliacao), 1) AS media_avaliacao
      FROM chamados
    `);

    const [por_nivel] = await db.query(`
      SELECT nivel, COUNT(*) AS total FROM chamados GROUP BY nivel
    `);

    const [por_tipo] = await db.query(`
      SELECT tipo, COUNT(*) AS total FROM chamados GROUP BY tipo ORDER BY total DESC LIMIT 6
    `);

    const [ultimos] = await db.query(`
      SELECT c.id, c.numero, c.titulo, c.status, c.prioridade, c.nivel, c.criado_em,
             u.nome AS cliente_nome
      FROM chamados c JOIN usuarios u ON c.usuario_id = u.id
      ORDER BY c.criado_em DESC LIMIT 10
    `);

    const [clientes_plano] = await db.query(`
      SELECT p.nome, COUNT(*) AS total
      FROM usuarios u JOIN planos p ON u.plano_id = p.id
      WHERE u.perfil = 'cliente'
      GROUP BY p.id, p.nome
    `);

    res.json({ totais, por_nivel, por_tipo, ultimos, clientes_plano });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao carregar dashboard.' });
  }
});

// ══════════════════════════════════════════
// USUÁRIOS (admin)
// ══════════════════════════════════════════
router.get('/usuarios', auth(['admin']), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.nome, u.email, u.telefone, u.perfil, u.ativo, u.criado_em,
              p.nome AS plano_nome
       FROM usuarios u LEFT JOIN planos p ON u.plano_id = p.id
       ORDER BY u.criado_em DESC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ erro: 'Erro ao listar usuários.' }); }
});

module.exports = router;
