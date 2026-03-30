// middleware/auth.js
const jwt = require('jsonwebtoken');

const auth = (perfisPermitidos = []) => {
  return (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ erro: 'Token não fornecido.' });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.usuario = decoded;

      if (perfisPermitidos.length > 0 && !perfisPermitidos.includes(decoded.perfil)) {
        return res.status(403).json({ erro: 'Acesso negado para seu perfil.' });
      }
      next();
    } catch {
      return res.status(401).json({ erro: 'Token inválido ou expirado.' });
    }
  };
};

module.exports = auth;
