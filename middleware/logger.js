const logger = (req, res, next) => {
  const maxLength = 60;
  // Sanitize input to prevent Log Injection / CRLF attacks
  const rawUrl = req.originalUrl || '';
  const sanitizedUrl = rawUrl.replace(/[\r\n]/g, '');
  const url = sanitizedUrl.length > maxLength
    ? sanitizedUrl.substring(0, maxLength) + '...'
    : sanitizedUrl;

  const rawIp = req.ip || req.socket?.remoteAddress || 'unknown';
  const sanitizedIp = String(rawIp).replace(/[\r\n]/g, '');

  console.log(`[${new Date().toISOString()}] ${req.method} ${url} - IP: ${sanitizedIp}`);
  next();
};

module.exports = logger;
