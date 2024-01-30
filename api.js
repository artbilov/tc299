module.exports = { handleApi }



async function handleApi(req, res) {
  const path = req.url.slice(1)
  const [endpoint, query] = path.split('?')
  const params = decode(query)
  const method = req.method
  const body = await getBody(req)
  const payload = JSON.parse(body || '{}')

  console.log({ path, method, endpoint, params })

  // db.collection('products').insertMany(JSON.parse(fs.readFileSync('data.json', 'utf-8'))) // put products from the file into a db
  
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'POST, GET, DELETE, OPTIONS, key')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, DELETE, OPTIONS')
  
  if (method == 'GET') {
    
    if (endpoint == 'products') {
      const products = await db.collection('products').find().toArray()
      const from = params.offset || 0
      
      res.end(JSON.stringify(products.slice(+from, +from + (+params.count || 12))))
    } else if (endpoint == 'product') {
      const product = await db.collection('products').findOne({ article: params.article })
      res.end(JSON.stringify(product))
    } else if (endpoint == 'search') {
      const { query, min, max, ...props } = params
      let filter = query ? {
        $or: [
          { name: { $regex: query, $options: "i" } },
          { category: { $regex: query, $options: "i" } },
          { color: { $regex: query, $options: "i" } }
        ]
      } : props
      if (min && max) {
        filter = {
          $and: [
            filter,
            { price: { $gte: minPrice, $lte: maxPrice } }
          ]
        }
      }
      const products = await db.collection('products').find(filter).toArray()
      res.end(JSON.stringify(products))
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


