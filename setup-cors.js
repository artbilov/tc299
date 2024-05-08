function setupCORS(req, res) {

  if (req.method === 'OPTIONS') {
    // Установка заголовков CORS
    // res.setHeader('Access-Control-Allow-Origin', '*');
    // res.setHeader('Access-Control-Allow-Methods', 'POST, GET, DELETE, PUT, OPTIONS');
    // res.setHeader('Access-Control-Allow-Headers', 'origin, Content-Type, accept');

    res.writeHead(200);
    res.end();
    return;
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Request-Method', 'POST, GET, DELETE, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'origin, Content-Type, accept');

}

module.exports = { setupCORS }


// res.setHeader('Access-Control-Allow-Methods', 'POST, GET, DELETE, PUT')
// res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
// res.setHeader('Content-Type', 'application/json; charset=utf-8')

// res.setHeader('Access-Control-Allow-Origin', '*')
// res.setHeader('Access-Control-Allow-Headers', 'POST, GET, DELETE, PUT, OPTIONS, key, Content-Type')