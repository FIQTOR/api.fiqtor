const errorHandler = (err, req, res, next) => {
  // Sanitize error message for logging to prevent CRLF injection
  const safeMessage = String(err.message || '').replace(/[\r\n]/g, '');
  console.error(`[Error] ${safeMessage}`);

  // Handle CORS errors specifically
  if (err.message === "Access Denied by CORS Policy") {
    return res.status(403).json({ status: "failed", error: "Access Denied by CORS Policy" });
  }

  // Handle Multer / File size errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ status: "failed", error: "File too large. Maximum size allowed is 4.5MB." });
  }

  // Generic fallback error without leaking stack traces or sensitive credentials
  res.status(500).json({
    status: "failed",
    error: "Internal Server Error",
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

module.exports = errorHandler;
