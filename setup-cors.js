function setupCORS(req, res, origin) {
  // Установка заголовков CORS
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE, HEAD');

  // for Cookies
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cookie, credentials, user-agent')
  res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie')
  res.setHeader('Content-Type', 'application/json')
  // res.setHeader(
  //   'Content-Security-Policy',
  //   "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self';"
  // );

  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.end('Preflight request has succeeded.')
  }
}

module.exports = { setupCORS }

