/**
 * Helper untuk mengirim error response tanpa membocorkan detail internal di production.
 */
const isProd = process.env.NODE_ENV === 'production';

function sendError(res, err, statusCode = 500) {
  console.error('[Route Error]', err.message || err);
  const message = isProd ? 'Terjadi kesalahan server' : (err.message || 'Server error');
  res.status(statusCode).json({ error: message });
}

module.exports = { sendError };
