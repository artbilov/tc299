function setupCORS(req, res, origin) {
  // Установка заголовков CORS
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE, HEAD')
  res.setHeader('Access-Control-Allow-Headers', '*')
  // res.setHeader('Content-Type', 'application/json; charset=utf-8')

  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE, HEAD')
    res.setHeader('Access-Control-Allow-Headers', '*')
    res.end('Preflight request has succeeded.')
  }
}

module.exports = { setupCORS }


// res.setHeader('Access-Control-Allow-Methods', 'POST, GET, DELETE, PUT')
// res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
// res.setHeader('Content-Type', 'application/json; charset=utf-8')

// res.setHeader('Access-Control-Allow-Origin', '*')
// res.setHeader('Access-Control-Allow-Headers', 'POST, GET, DELETE, PUT, OPTIONS, key, Content-Type')