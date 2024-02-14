module.exports = { makeApiHandler }



function makeApiHandler(db) {
  return async function handleApi(req, res) {
    const path = req.url.slice(1)
    const [endpoint, query] = path.split('?')
    const params = decode(query)
    const method = req.method
    const body = await getBody(req)
    const payload = JSON.parse(body || '{}')

    // console.log({ path, method, endpoint, params })

    // db.collection('products').insertMany(JSON.parse(fs.readFileSync('data.json', 'utf-8'))) // put products from the file into a db
    // db.collection('users').createIndex({ email: 1 }, { unique: true })
    // db.collection('users').createIndex({ login: 1 }, { unique: true })

    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Access-Control-Request-Method', '*');
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'POST, GET, DELETE, PUT, OPTIONS, key, Content-Type')
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, DELETE, PUT, OPTIONS')

    if (method == 'GET') {

      if (endpoint == 'products') {

        const page = +params.page || 1
        const pageSize = 9
        const data = await getProducts(db, pageSize, page)
        res.end(JSON.stringify(data))

      } else if (endpoint == 'product') {
        const product = await db.collection('products').findOne({ article: params.article })
        res.end(JSON.stringify(product))

      } else if (endpoint == 'search') {
        const { query, min, max, ...props } = params
        const $regex = new RegExp(query?.replace(/([^a-zA-Z0-9])/g, "\\$1"))
        let filter = query ?
          // { $or: [
          { name: { $regex, $options: "i" } }
          // { category: { $regex, $options: "i" }},
          // { color: { $regex, $options: "i" } }
          // ] }
          : props
        if (min && max) {
          filter = {
            $and: [
              filter,
              { price: { $gte: +min, $lte: +max } }
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
        const { first, last, email, password } = payload
        let { promo } = payload
        const hashed = await hash(password)

        if (!first || !last || !email || !password) {
          res.writeHead(400).end(JSON.stringify({ error: "All fields are required!" }))
          return
        }

        if (!promo) promo = false
        const user = { first, last, email, hash: hashed, promo }
        const result = await db.collection('users').insertOne(user).catch(err => {
          if (err.code == 11000) return { insertedId: null }
        })
        if (result.insertedId) {
          res.end(JSON.stringify({ _id: result.insertedId }))
        } else {
          res.writeHead(400).end(JSON.stringify({ error: "Email is occupied" }))
        }

      } else if (endpoint == 'login') {
        const { email, password } = payload

        if (!email || !password) {
          res.writeHead(400).end(JSON.stringify({ error: "Email or password are incorrect" }))
          return
        }
        const user = await db.collection('users').findOne({ email }, { projection: { _id: 0 } })

        if (user && await verify(password, user.hash).catch(_ => false)) {
          delete user.hash
          res.end(JSON.stringify(user))
        } else {
          res.writeHead(400).end(JSON.stringify({ error: "Login or password is incorrect" }))
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
}

async function getBody(req) {
  let body = ''
  for await (const chunk of req) body += chunk
  return body
}

async function getProducts(db, pageSize, page) {
  const skip = (page - 1) * pageSize;

  const pipeline = [
    {
      $facet: {
        totalProducts: [
          { $count: 'amount' },

        ],
        products: [
          { $skip: skip },
          { $limit: pageSize }
        ]
      }
    }
  ]

  const [result] = await db.collection('products').aggregate(pipeline).toArray()
  const { products, totalProducts: [{ amount }] } = result
  const data = { page, totalProducts: amount, totalPages: Math.ceil(amount / pageSize), results: products }
  console.log(data)
  return data
}

const { decode } = require('querystring');
const fs = require('fs')
const { isAdmin } = require('./check-admin.js')
const { hash, verify } = require('./encrypt-password.js')

