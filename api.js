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
  // db.collection('users').createIndex({ email: 1 }, { unique: true })
  // db.collection('users').createIndex({ login: 1 }, { unique: true })

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
    } else if (endpoint == 'users') {
      if (isAdmin(req)) {
        const users = await db.collection('users').find().toArray()
        const from = params.offset || 0
        res.end(JSON.stringify(users.slice(+from, +from + (+params.count || 20))))
      }
    } else if (endpoint == 'user') {
      const user = await db.collection('users').findOne({ login: params.login })

      res.end(JSON.stringify(user))

    }


  } else if (method == 'POST') {
    if (endpoint == 'product') {
      if (isAdmin(req)) {
        const { name, category, color, quantity, article, price, image, picture, otherpics = [] } = payload
        if (!name || !category || !article) {
          res.writeHead(400).end(JSON.stringify({ error: "name, category and article are required" }))
          return
        }
        const product = { name, category, color, quantity, price, image, picture, otherpics, article }
        const result = await db.collection('products').insertOne(product).catch(err => {
          if (err.code == 11000) return { insertedId: null }
        })
        if (result.insertedId) {
          res.end(JSON.stringify({ _id: result.insertedId }))
        } else {
          res.writeHead(400).end(JSON.stringify({ error: "article is not unique" }))
        }
      }
    } else if (endpoint == 'user') {
      const { name, login, password, phone, address, town, country, shipAddress, email } = payload
      const hash = encryptPassword(payload.password)

      if (!login || !password || !email) {
        res.writeHead(400).end(JSON.stringify({ error: "login, password and email are required" }))
        return
      }
      const user = { name, login, hash, phone, address, town, country, shipAddress, email }
      const result = await db.collection('users').insertOne(user).catch(err => {
        if (err.code == 11000) return { insertedId: null }
      })
      if (result.insertedId) {
        res.end(JSON.stringify({ _id: result.insertedId }))
      } else {
        res.writeHead(400).end(JSON.stringify({ error: "email or login are already in use" }))
      }
    }
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
const { isAdmin } = require('./check-admin.js')
const { encryptPassword } = require('./encrypt-password.js')

let db = connectMongo().then(_db => db = _db)

