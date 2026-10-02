const { HttpError } = require('../utils/errors');

exports.apiNotFound = (req, res) => res.status(404).json({ error: 'Introuvable' });

// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Requête invalide' });
  console.error(err);
  res.status(500).json({ error: 'Erreur du serveur' });
};
