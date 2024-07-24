module.exports = { makeApiHandler }


function makeApiHandler(db) {
  return async function handleApi(req, res) {

    const path = req.url.slice(1) || 'art-page.html'
    const [route, queryStr] = path.split('?')
    const params = decode(queryStr)
    const method = req.method
    const endpoint = method + ':' + route
    const body = await getBody(req)
    const payload = JSON.parse(body || '{}')
    const pageSize = 9

    // if (!endpoints[endpoint]) {
    //   res.statusCode = 404
    //   res.end(JSON.stringify("Don't bother BackEnd! It has no such endpoint: " + endpoint)) 
    //   return
    // }

    console.log("Origin-before: " + req.headers.origin)

    const origin = req.headers.origin || req.headers.referer || "*"

    console.log("Origin-after: " + origin)

    // console.log({ path, method, endpoint, params })

    // Технический блок
    // db.collection('products').insertMany(JSON.parse(fs.readFileSync('products.json', 'utf-8'))) // put products from the file into a db
    // db.collection('users').createIndex({ email: 1 }, { unique: true })
    // db.collection('products').createIndex({ article: 1 }, { unique: true })
    // db.collection('sessions').createIndex({ token: 1 }, { unique: true })

    console.log("Cookie-in: " + req.headers.cookie)

    setupCORS(req, res, origin)

    if (method === 'OPTIONS') return

    await ensureSession(req, res)

    try {
      // if (endpoint.startsWith('OPTIONS:')) res.writeHead(200, { 'Allow': 'GET, POST, PUT, DELETE' }).end()
      // else endpoints[endpoint]({ db, params, pageSize, endpoint, req, res, payload })

      await endpoints[endpoint]({ db, params, pageSize, endpoint, req, res, payload })

    } catch (error) {
      console.log('Endpoint: ' + endpoint)
      console.log(error)
      res.statusCode = 404
      res.end(JSON.stringify(error))
    }
  }
}

const { ensureSession } = require('./sessions/sessions.js')
const { decode } = require('querystring');
const { endpoints } = require('./enpoints.js')
const { getBody } = require('./get-body.js')
const { setupCORS } = require('./setup-cors.js')
const fs = require('fs') //не удалять (нужно при загрузке данных с файла)


