-- =============================================
-- AUTO HELP DESK - SCHEMA DO BANCO DE DADOS
-- MySQL / MariaDB
-- =============================================

CREATE DATABASE IF NOT EXISTS autohelpdesk
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE autohelpdesk;

-- ──────────────────────────────────────────
-- TABELA: planos
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS planos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nome          VARCHAR(50) NOT NULL,
  descricao     TEXT,
  preco         DECIMAL(10,2) NOT NULL,
  sla_minutos   INT NOT NULL COMMENT 'Tempo máximo de primeiro contato em minutos',
  guincho_mes   INT NOT NULL DEFAULT 1 COMMENT 'Quantidade de guinchos por mês',
  cobertura_km  INT NOT NULL DEFAULT 0 COMMENT '0 = apenas Salvador',
  tem_taxi      TINYINT(1) NOT NULL DEFAULT 0,
  tem_mecanico24h TINYINT(1) NOT NULL DEFAULT 0,
  tem_oficina   TINYINT(1) NOT NULL DEFAULT 0,
  ativo         TINYINT(1) NOT NULL DEFAULT 1,
  criado_em     DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO planos (nome, descricao, preco, sla_minutos, guincho_mes, cobertura_km, tem_taxi, tem_mecanico24h, tem_oficina) VALUES
('Básico',  'Atendimento padrão em Salvador. 1 guincho/mês, reboque até a residência.', 49.90, 15, 1, 0,   0, 0, 0),
('Prêmio',  'Atendimento imediato. 3 guinchos/mês, cobertura até 200km, táxi, mecânico 24h e oficina credenciada.', 149.90, 5,  3, 200, 1, 1, 1);

-- ──────────────────────────────────────────
-- TABELA: usuarios
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nome          VARCHAR(120) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  senha_hash    VARCHAR(255) NOT NULL,
  telefone      VARCHAR(20),
  cpf           VARCHAR(14),
  perfil        ENUM('cliente','atendente_n1','tecnico_n2','engenheiro_n3','admin') NOT NULL DEFAULT 'cliente',
  plano_id      INT NULL,
  ativo         TINYINT(1) NOT NULL DEFAULT 1,
  criado_em     DATETIME DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (plano_id) REFERENCES planos(id) ON DELETE SET NULL
);

-- Usuário admin padrão (senha: Admin@123)
INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES
('Administrador', 'admin@autohelpdesk.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Usuário atendente N1 (senha: N1@123)
INSERT INTO usuarios (nome, email, senha_hash, telefone, perfil) VALUES
('Carlos Atendente', 'n1@autohelpdesk.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '71999990001', 'atendente_n1');

-- Usuário técnico N2 (senha: N2@123)
INSERT INTO usuarios (nome, email, senha_hash, telefone, perfil) VALUES
('Ana Técnica', 'n2@autohelpdesk.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '71999990002', 'tecnico_n2');

-- Usuário engenheiro N3 (senha: N3@123)
INSERT INTO usuarios (nome, email, senha_hash, telefone, perfil) VALUES
('Roberto Engenheiro', 'n3@autohelpdesk.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '71999990003', 'engenheiro_n3');

-- ──────────────────────────────────────────
-- TABELA: veiculos
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS veiculos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id    INT NOT NULL,
  placa         VARCHAR(10) NOT NULL,
  marca         VARCHAR(50),
  modelo        VARCHAR(80),
  ano           YEAR,
  cor           VARCHAR(30),
  ativo         TINYINT(1) NOT NULL DEFAULT 1,
  criado_em     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ──────────────────────────────────────────
-- TABELA: assinaturas
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assinaturas (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id      INT NOT NULL UNIQUE,
  plano_id        INT NOT NULL,
  status          ENUM('ativa','suspensa','cancelada') NOT NULL DEFAULT 'ativa',
  guincho_usado   INT NOT NULL DEFAULT 0,
  data_inicio     DATE NOT NULL,
  data_renovacao  DATE NOT NULL,
  criado_em       DATETIME DEFAULT CURRENT_TIMESTAMP,
  atualizado_em   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (plano_id)   REFERENCES planos(id)
);

-- ──────────────────────────────────────────
-- TABELA: chamados
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chamados (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  numero          VARCHAR(20) NOT NULL UNIQUE COMMENT 'Ex: AHD-2026-00001',
  usuario_id      INT NOT NULL,
  veiculo_id      INT NULL,
  nivel           ENUM('N1','N2','N3') NOT NULL DEFAULT 'N1',
  tipo            ENUM('pane_seca','pane_eletrica','acidente','furo_pneu','chave_perdida','bateria','superaquecimento','outro') NOT NULL DEFAULT 'outro',
  prioridade      ENUM('baixa','media','alta','critica') NOT NULL DEFAULT 'media',
  status          ENUM('aberto','em_atendimento','escalado','resolvido','cancelado') NOT NULL DEFAULT 'aberto',
  titulo          VARCHAR(200) NOT NULL,
  descricao       TEXT,
  localizacao     VARCHAR(255),
  latitude        DECIMAL(10,8) NULL,
  longitude       DECIMAL(11,8) NULL,
  atendente_id    INT NULL,
  sla_prazo       DATETIME NULL COMMENT 'Prazo máximo conforme plano',
  sla_cumprido    TINYINT(1) NULL,
  solucao         TEXT NULL,
  avaliacao       TINYINT NULL CHECK (avaliacao BETWEEN 1 AND 5),
  criado_em       DATETIME DEFAULT CURRENT_TIMESTAMP,
  atualizado_em   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  resolvido_em    DATETIME NULL,
  FOREIGN KEY (usuario_id)   REFERENCES usuarios(id),
  FOREIGN KEY (veiculo_id)   REFERENCES veiculos(id) ON DELETE SET NULL,
  FOREIGN KEY (atendente_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- ──────────────────────────────────────────
-- TABELA: historico_chamados
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS historico_chamados (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  chamado_id  INT NOT NULL,
  usuario_id  INT NOT NULL,
  acao        VARCHAR(100) NOT NULL,
  descricao   TEXT,
  nivel_de    ENUM('N1','N2','N3') NULL,
  nivel_para  ENUM('N1','N2','N3') NULL,
  criado_em   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- ──────────────────────────────────────────
-- TABELA: evidencias
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evidencias (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  chamado_id  INT NOT NULL,
  usuario_id  INT NOT NULL,
  arquivo     VARCHAR(255) NOT NULL,
  tipo_mime   VARCHAR(100),
  tamanho     INT,
  descricao   VARCHAR(255),
  criado_em   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- ──────────────────────────────────────────
-- TABELA: servicos_acionados
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS servicos_acionados (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  chamado_id    INT NOT NULL,
  tipo          ENUM('guincho','taxi','mecanico','oficina') NOT NULL,
  status        ENUM('solicitado','confirmado','a_caminho','concluido','cancelado') NOT NULL DEFAULT 'solicitado',
  prestador     VARCHAR(120),
  observacoes   TEXT,
  criado_em     DATETIME DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE CASCADE
);

-- ──────────────────────────────────────────
-- TABELA: notificacoes
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notificacoes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT NOT NULL,
  chamado_id  INT NULL,
  titulo      VARCHAR(150) NOT NULL,
  mensagem    TEXT NOT NULL,
  lida        TINYINT(1) NOT NULL DEFAULT 0,
  criado_em   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (chamado_id)  REFERENCES chamados(id) ON DELETE SET NULL
);

-- ──────────────────────────────────────────
-- ÍNDICES
-- ──────────────────────────────────────────
CREATE INDEX idx_chamados_status   ON chamados(status);
CREATE INDEX idx_chamados_nivel    ON chamados(nivel);
CREATE INDEX idx_chamados_usuario  ON chamados(usuario_id);
CREATE INDEX idx_historico_chamado ON historico_chamados(chamado_id);
CREATE INDEX idx_notif_usuario     ON notificacoes(usuario_id, lida);
