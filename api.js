module.exports = { handleApi }

async function handleApi(req, res) {
  const path = req.url.slice(1)
  const [endpoint, query] = path.split('?')
  const params = decode(query)
  const method = req.method
  const body = await getBody(req)
  const payload = JSON.parse(body || '{}')

  console.log({ path, method, endpoint, params })


  if (method == 'GET') {
    if (endpoint == 'products') {
      const products = await db.collection('products').find().toArray()
      const from = params.offset || 0
      res.end(JSON.stringify(products.slice(+from, +from + (+params.count || 20))))
    } else if (endpoint == 'product') {
      const product = await db.collection('products').find({article: params.article}).toArray()
      res.end(JSON.stringify(product))
    }

  } else if (method == 'POST') {
    res.end('Not ready yet')
  } else if (method == 'PUT') {
    res.end('Not ready yet')
  } else if (method == 'DELETE') {
    res.end('Not ready yet')
  } else {
    res.end('Unsupported method')
  }


}

async function getBody(req) {
  let body = ''
  for await (const chunk of req) body += chunk
  return body
}

const { decode } = require('querystring');
const { connectMongo } = require('./mongo.js')
const fs = require('fs')

let db = connectMongo().then(_db => db = _db)


