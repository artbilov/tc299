function setupCORS(req, res) {
  // Установка заголовков CORS
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Content-Type': 'text/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, PATCH, DELETE, HEAD',
      'Access-Control-Allow-Headers': '*'
    }).end()
    return
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'text/json')

  // res.setHeader('Content-Type', 'text/json')
  // res.setHeader('Access-Control-Allow-Origin', '*')
  // res.setHeader('Access-Control-Allow-Methods', '*')
  // res.setHeader('Access-Control-Allow-Headers', '*')

  // res.setHeader('Access-Control-Request-Method', 'POST, GET, DELETE, PUT, OPTIONS')
}

module.exports = { setupCORS }


// res.setHeader('Access-Control-Allow-Methods', 'POST, GET, DELETE, PUT')
// res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
// res.setHeader('Content-Type', 'application/json; charset=utf-8')

// res.setHeader('Access-Control-Allow-Origin', '*')
// res.setHeader('Access-Control-Allow-Headers', 'POST, GET, DELETE, PUT, OPTIONS, key, Content-Type')