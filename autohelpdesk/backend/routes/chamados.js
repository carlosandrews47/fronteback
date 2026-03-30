// routes/chamados.js
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const auth    = require('../middleware/auth');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

// Configuração de upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Gera número único do chamado
async function gerarNumero() {
  const ano = new Date().getFullYear();
  const [r] = await db.query('SELECT COUNT(*) AS total FROM chamados WHERE YEAR(criado_em) = ?', [ano]);
  const seq = String(r[0].total + 1).padStart(5, '0');
  return `AHD-${ano}-${seq}`;
}

// Registra histórico
async function registrarHistorico(chamado_id, usuario_id, acao, descricao = '', nivel_de = null, nivel_para = null) {
  await db.query(
    'INSERT INTO historico_chamados (chamado_id, usuario_id, acao, descricao, nivel_de, nivel_para) VALUES (?,?,?,?,?,?)',
    [chamado_id, usuario_id, acao, descricao, nivel_de, nivel_para]
  );
}

// ─── GET /api/chamados ───────────────────────────────────────────────────
router.get('/', auth(), async (req, res) => {
  try {
    const { status, nivel, prioridade, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const u = req.usuario;

    let where = [];
    let params = [];

    // Clientes só veem seus próprios chamados
    if (u.perfil === 'cliente') { where.push('c.usuario_id = ?'); params.push(u.id); }

    if (status)    { where.push('c.status = ?');    params.push(status); }
    if (nivel)     { where.push('c.nivel = ?');     params.push(nivel); }
    if (prioridade){ where.push('c.prioridade = ?'); params.push(prioridade); }

    const wClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [chamados] = await db.query(
      `SELECT c.*, u.nome AS cliente_nome, u.telefone AS cliente_tel,
              a.nome AS atendente_nome, v.placa, v.modelo,
              p.nome AS plano_nome, p.sla_minutos
       FROM chamados c
       JOIN usuarios u ON c.usuario_id = u.id
       LEFT JOIN usuarios a ON c.atendente_id = a.id
       LEFT JOIN veiculos v ON c.veiculo_id = v.id
       LEFT JOIN planos p ON u.plano_id = p.id
       ${wClause}
       ORDER BY FIELD(c.prioridade,'critica','alta','media','baixa'), c.criado_em DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM chamados c ${wClause}`, params
    );

    res.json({ chamados, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao listar chamados.' });
  }
});

// ─── GET /api/chamados/:id ───────────────────────────────────────────────
router.get('/:id', auth(), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, u.nome AS cliente_nome, u.email AS cliente_email, u.telefone AS cliente_tel,
              a.nome AS atendente_nome, v.placa, v.marca, v.modelo, v.ano, v.cor,
              p.nome AS plano_nome, p.sla_minutos, p.tem_taxi, p.tem_mecanico24h, p.tem_oficina
       FROM chamados c
       JOIN usuarios u ON c.usuario_id = u.id
       LEFT JOIN usuarios a ON c.atendente_id = a.id
       LEFT JOIN veiculos v ON c.veiculo_id = v.id
       LEFT JOIN planos p ON u.plano_id = p.id
       WHERE c.id = ?`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Chamado não encontrado.' });

    const chamado = rows[0];

    // Cliente só vê o próprio
    if (req.usuario.perfil === 'cliente' && chamado.usuario_id !== req.usuario.id)
      return res.status(403).json({ erro: 'Acesso negado.' });

    // Histórico
    const [historico] = await db.query(
      `SELECT h.*, u.nome AS usuario_nome FROM historico_chamados h
       JOIN usuarios u ON h.usuario_id = u.id
       WHERE h.chamado_id = ? ORDER BY h.criado_em ASC`, [req.params.id]
    );

    // Evidências
    const [evidencias] = await db.query(
      'SELECT * FROM evidencias WHERE chamado_id = ? ORDER BY criado_em ASC', [req.params.id]
    );

    // Serviços
    const [servicos] = await db.query(
      'SELECT * FROM servicos_acionados WHERE chamado_id = ? ORDER BY criado_em ASC', [req.params.id]
    );

    res.json({ ...chamado, historico, evidencias, servicos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar chamado.' });
  }
});

// ─── POST /api/chamados ──────────────────────────────────────────────────
router.post('/', auth(['cliente']), async (req, res) => {
  const { titulo, descricao, tipo, prioridade, localizacao, latitude, longitude, veiculo_id } = req.body;
  if (!titulo || !tipo) return res.status(400).json({ erro: 'Título e tipo são obrigatórios.' });

  try {
    // Busca plano do cliente para calcular SLA
    const [[usuario]] = await db.query(
      'SELECT u.plano_id, p.sla_minutos FROM usuarios u LEFT JOIN planos p ON u.plano_id = p.id WHERE u.id = ?',
      [req.usuario.id]
    );

    const numero = await gerarNumero();
    const slaPrazo = new Date(Date.now() + (usuario?.sla_minutos || 15) * 60000);

    const [result] = await db.query(
      `INSERT INTO chamados (numero, usuario_id, veiculo_id, tipo, prioridade, titulo, descricao,
        localizacao, latitude, longitude, sla_prazo) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [numero, req.usuario.id, veiculo_id || null, tipo, prioridade || 'media', titulo,
       descricao || null, localizacao || null, latitude || null, longitude || null, slaPrazo]
    );

    await registrarHistorico(result.insertId, req.usuario.id, 'Chamado aberto', `Tipo: ${tipo} | Prioridade: ${prioridade || 'media'}`);

    // Notifica atendentes N1
    const [n1s] = await db.query("SELECT id FROM usuarios WHERE perfil = 'atendente_n1' AND ativo = 1");
    for (const n1 of n1s) {
      await db.query(
        'INSERT INTO notificacoes (usuario_id, chamado_id, titulo, mensagem) VALUES (?,?,?,?)',
        [n1.id, result.insertId, '🚨 Novo Chamado', `${numero} - ${titulo}`]
      );
    }

    res.status(201).json({ mensagem: 'Chamado aberto com sucesso!', id: result.insertId, numero });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao abrir chamado.' });
  }
});

// ─── PATCH /api/chamados/:id/assumir ────────────────────────────────────
router.patch('/:id/assumir', auth(['atendente_n1','tecnico_n2','engenheiro_n3','admin']), async (req, res) => {
  try {
    const [[chamado]] = await db.query('SELECT * FROM chamados WHERE id = ?', [req.params.id]);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado.' });
    if (chamado.status === 'resolvido') return res.status(400).json({ erro: 'Chamado já resolvido.' });

    await db.query(
      'UPDATE chamados SET atendente_id = ?, status = ? WHERE id = ?',
      [req.usuario.id, 'em_atendimento', req.params.id]
    );
    await registrarHistorico(req.params.id, req.usuario.id, 'Chamado assumido', `Atendente: ${req.usuario.nome}`);

    res.json({ mensagem: 'Chamado assumido com sucesso.' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao assumir chamado.' });
  }
});

// ─── PATCH /api/chamados/:id/escalar ────────────────────────────────────
router.patch('/:id/escalar', auth(['atendente_n1','tecnico_n2','admin']), async (req, res) => {
  const { nivel_para, motivo } = req.body;
  if (!nivel_para) return res.status(400).json({ erro: 'Nível de destino obrigatório.' });

  try {
    const [[chamado]] = await db.query('SELECT * FROM chamados WHERE id = ?', [req.params.id]);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado.' });

    const nivel_de = chamado.nivel;
    await db.query(
      'UPDATE chamados SET nivel = ?, status = ? WHERE id = ?',
      [nivel_para, 'escalado', req.params.id]
    );
    await registrarHistorico(req.params.id, req.usuario.id, 'Chamado escalado', motivo || '', nivel_de, nivel_para);

    // Notifica equipe do nível destino
    const perfilMap = { N2: 'tecnico_n2', N3: 'engenheiro_n3' };
    const perfil = perfilMap[nivel_para];
    if (perfil) {
      const [equipe] = await db.query('SELECT id FROM usuarios WHERE perfil = ? AND ativo = 1', [perfil]);
      for (const membro of equipe) {
        await db.query(
          'INSERT INTO notificacoes (usuario_id, chamado_id, titulo, mensagem) VALUES (?,?,?,?)',
          [membro.id, req.params.id, `📢 Escalado para ${nivel_para}`, `${chamado.numero} - ${chamado.titulo}`]
        );
      }
    }

    res.json({ mensagem: `Chamado escalado para ${nivel_para}.` });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao escalar chamado.' });
  }
});

// ─── PATCH /api/chamados/:id/resolver ───────────────────────────────────
router.patch('/:id/resolver', auth(['atendente_n1','tecnico_n2','engenheiro_n3','admin']), async (req, res) => {
  const { solucao } = req.body;
  if (!solucao) return res.status(400).json({ erro: 'Descrição da solução é obrigatória.' });

  try {
    const [[chamado]] = await db.query('SELECT * FROM chamados WHERE id = ?', [req.params.id]);
    if (!chamado) return res.status(404).json({ erro: 'Chamado não encontrado.' });

    const agora = new Date();
    const slaCumprido = chamado.sla_prazo ? agora <= new Date(chamado.sla_prazo) : null;

    await db.query(
      'UPDATE chamados SET status = ?, solucao = ?, resolvido_em = ?, sla_cumprido = ? WHERE id = ?',
      ['resolvido', solucao, agora, slaCumprido, req.params.id]
    );
    await registrarHistorico(req.params.id, req.usuario.id, 'Chamado resolvido', solucao);

    // Notifica cliente
    await db.query(
      'INSERT INTO notificacoes (usuario_id, chamado_id, titulo, mensagem) VALUES (?,?,?,?)',
      [chamado.usuario_id, req.params.id, '✅ Chamado Resolvido', `${chamado.numero} foi encerrado.`]
    );

    res.json({ mensagem: 'Chamado resolvido com sucesso.', sla_cumprido: slaCumprido });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao resolver chamado.' });
  }
});

// ─── POST /api/chamados/:id/avaliar ─────────────────────────────────────
router.post('/:id/avaliar', auth(['cliente']), async (req, res) => {
  const { nota } = req.body;
  if (!nota || nota < 1 || nota > 5) return res.status(400).json({ erro: 'Nota deve ser de 1 a 5.' });

  try {
    await db.query(
      'UPDATE chamados SET avaliacao = ? WHERE id = ? AND usuario_id = ? AND status = "resolvido"',
      [nota, req.params.id, req.usuario.id]
    );
    res.json({ mensagem: 'Avaliação registrada!' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao avaliar.' });
  }
});

// ─── POST /api/chamados/:id/servico ─────────────────────────────────────
router.post('/:id/servico', auth(['atendente_n1','tecnico_n2','admin']), async (req, res) => {
  const { tipo, prestador, observacoes } = req.body;
  if (!tipo) return res.status(400).json({ erro: 'Tipo de serviço obrigatório.' });

  try {
    // Verifica se cliente tem o serviço no plano
    const [[chamado]] = await db.query(
      `SELECT c.usuario_id, p.tem_taxi, p.tem_mecanico24h, p.tem_oficina, p.guincho_mes,
              a.guincho_usado
       FROM chamados c
       JOIN usuarios u ON c.usuario_id = u.id
       LEFT JOIN planos p ON u.plano_id = p.id
       LEFT JOIN assinaturas a ON u.id = a.usuario_id
       WHERE c.id = ?`, [req.params.id]
    );

    if (tipo === 'taxi' && !chamado.tem_taxi)
      return res.status(403).json({ erro: 'Serviço de táxi não incluso no plano do cliente.' });
    if (tipo === 'mecanico' && !chamado.tem_mecanico24h)
      return res.status(403).json({ erro: 'Mecânico 24h não incluso no plano.' });
    if (tipo === 'oficina' && !chamado.tem_oficina)
      return res.status(403).json({ erro: 'Oficina credenciada não inclusa no plano.' });
    if (tipo === 'guincho' && chamado.guincho_usado >= chamado.guincho_mes)
      return res.status(403).json({ erro: 'Cota de guincho mensal esgotada.' });

    await db.query(
      'INSERT INTO servicos_acionados (chamado_id, tipo, prestador, observacoes) VALUES (?,?,?,?)',
      [req.params.id, tipo, prestador || null, observacoes || null]
    );

    if (tipo === 'guincho') {
      await db.query(
        'UPDATE assinaturas SET guincho_usado = guincho_usado + 1 WHERE usuario_id = ?',
        [chamado.usuario_id]
      );
    }

    await registrarHistorico(req.params.id, req.usuario.id, `Serviço acionado: ${tipo}`, prestador || '');
    res.status(201).json({ mensagem: `Serviço "${tipo}" acionado com sucesso!` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao acionar serviço.' });
  }
});

// ─── POST /api/chamados/:id/evidencia ───────────────────────────────────
router.post('/:id/evidencia', auth(), upload.single('arquivo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: 'Arquivo não enviado.' });

  try {
    await db.query(
      'INSERT INTO evidencias (chamado_id, usuario_id, arquivo, tipo_mime, tamanho, descricao) VALUES (?,?,?,?,?,?)',
      [req.params.id, req.usuario.id, req.file.filename, req.file.mimetype, req.file.size, req.body.descricao || null]
    );
    await registrarHistorico(req.params.id, req.usuario.id, 'Evidência anexada', req.file.originalname);
    res.status(201).json({ mensagem: 'Evidência enviada!', arquivo: req.file.filename });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao enviar evidência.' });
  }
});

module.exports = router;
