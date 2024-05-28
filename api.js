module.exports = { makeApiHandler }

const { ensureSession } = require('./sessions/sessions.js')

function makeApiHandler(db) {
  return async function handleApi(req, res) {

    const path = req.url.slice(1) || 'art-page.html'
    const [route, query] = path.split('?')
    const params = decode(query)
    const method = req.method
    const endpoint = method + ':' + route
    const body = await getBody(req)
    const payload = JSON.parse(body || '{}')
    const pageSize = 9
    const origin = req.headers.origin

    // console.log({ path, method, endpoint, params })

    // db.collection('products').insertMany(JSON.parse(fs.readFileSync('products.json', 'utf-8'))) // put products from the file into a db
    // db.collection('users').createIndex({ email: 1 }, { unique: true })
    // db.collection('users').createIndex({ login: 1 }, { unique: true })

    setupCORS(req, res, origin)

    console.log("Request: " + req)

    console.log("Origin: " + origin)

    if (method === 'OPTIONS') return

    await ensureSession(req, res)

    try {
      // if (endpoint.startsWith('OPTIONS:')) res.writeHead(200, { 'Allow': 'GET, POST, PUT, DELETE' }).end()
      // else endpoints[endpoint]({ db, params, pageSize, endpoint, req, res, payload })
      
      endpoints[endpoint]({ db, params, pageSize, endpoint, req, res, payload })
    } catch (error) {
      console.log(endpoint)
      res.statusCode = 404
      res.end(JSON.stringify({ error: 'unsupported method' }))
      console.log(error)
    }
  }
}


const { decode } = require('querystring');
const { endpoints } = require('./enpoints.js')
const { getBody } = require('./get-body.js')
const { setupCORS } = require('./setup-cors.js')
const fs = require('fs')


