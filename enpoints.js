const fs = require('fs')
const { getUsers } = require('./get-users.js')
const { getProducts } = require('./get-products.js')
const { getUserData } = require('./get-user-data.js')
const { checkSession } = require('./check-session.js')
const { hash, verify } = require('./encrypt-password.js')
const { isAdmin } = require('./check-admin.js')
const { setNewSession } = require('./set-new-session.js')

const categoryEndpoints = { 'candles': 'Candles', 'lighting-decor': 'Lighting Decor', 'gift-sets': 'Gift Sets', 'get-warm': 'Get Warm', 'table-games': 'Table Games', 'books-and-journals': 'Books & Journals' }


const endpoints = {
  async 'GET:products'({ db, params, pageSize, res }) {

    const page = +params.page || 1
    const color = params.color || ''
    const min = +params.min || 0
    const max = +params.max || Infinity
    const sort = params.sort
    const dir = params.dir
    const data = await getProducts(db, pageSize, page, '', color, min, max, sort, dir)
    res.end(JSON.stringify(data))
  },

  async 'GET:product'({ db, params, res }) {
    const product = await db.collection('products').findOne({ article: params.article })
    res.end(JSON.stringify(product))
  },

  async 'GET:search'({ db, params, res }) {
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
  },

  async 'GET:user'({ db, params, pageSize, res }) {
    const page = +params.page || 1
    const data = await getUsers(db, pageSize, page)
    res.end(JSON.stringify(data))
  },

  async 'GET:users'({ db, params, pageSize, req, res }) {
    if (isAdmin(req)) {
      const page = +params.page || 1
      const data = await getUsers(db, pageSize, page)
      res.end(JSON.stringify(data))
    }
  },

  'GET:art-page.html'({ res }) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end(fs.readFileSync('art-page.html', 'utf-8'))
  },

  async 'GET:session'({ db, req, res }) {
    const { cookie } = req.headers
    const isValidSession =  cookie && await checkSession(db, cookie)

    if (isValidSession) {
      const userData = await getUserData(db, cookie)
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify(userData, null, 2))
    } else {
      setNewSession(db, res)
    }

    // if (cookie) {
    //   const result = await checkSession(db, cookie)
    //   if (result) res.end(JSON.stringify(getUserData(cookie)))
    //   else {
    //     const token = genToken()
    //     const cookie = genCookie('token', token, 7)
    //     res.setHeader('Set-Cookie', cookie)
    //     // saveSession(db,)
    //   }
    // } else {
    //   setNewSession(db, res)
    // }
  },

  async 'POST:product'({ db, req, res, payload }) {
    if (isAdmin(req)) {
      const { _id, name, category, description = '', aboutProduct = '', color = '', quantity = 0, price = null, image = [], picture = '', reviews = [], questions = [], createdAt = '', updatedAt = '' } = payload
      if (!name || !category) {
        res.writeHead(400).end(JSON.stringify({ error: "name, category and article are required" }))
        return
      }
      const product = { ..._id && { _id }, name, category, description, aboutProduct, color, quantity, price, image, picture, reviews, questions, createdAt, updatedAt }
      const result = await db.collection('products').insertOne(product).catch(err => {
        if (err.code == 11000) return { insertedId: null }
      })
      if (result.insertedId) {
        res.end(JSON.stringify({ _id: result.insertedId }))
      } else {
        res.writeHead(400).end(JSON.stringify({ error: "article is not unique" }))
      }
    }
  },

  async 'POST:user'({ db, res, payload }) {
    const { fullName, email, password } = payload
    let { promo } = payload
    const hashed = await hash(password)

    if (!fullName || !email || !password) {
      res.writeHead(400).end(JSON.stringify({ error: "All fields are required!" }))
      return
    }

    if (!promo) promo = false
    const user = { fullName, email, hash: hashed, promo }
    const result = await db.collection('users').insertOne(user).catch(err => {
      if (err.code == 11000) return { insertedId: null }
    })
    if (result.insertedId) {
      res.end(JSON.stringify({ _id: result.insertedId }))
    } else {
      res.writeHead(400).end(JSON.stringify({ error: "Email is occupied" }))
    }
  },

  async 'POST:login'({ db, res, payload }) {
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
  },

  async 'PUT:toWishList'({db, req, res, payload}) {
    const { id } = payload
    const { cookie } = req.headers
    if (!cookie || !cookie.includes('token=')) return
    const { userId } = cookie.split('=')[1]

    try {
        const result = await db.collection('users').updateOne(
            { _id: userId },
            { $addToSet: { wishList: id } }
        )

        if (result.modifiedCount > 0) {
            res.status(200).json({ message: 'Product added to wishlist' })
        } else {
            res.status(404).json({ error: 'User not found' })
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' })
    }
  }

}

for (const cat in categoryEndpoints) endpoints['GET:' + cat] = category

async function category({ db, params, pageSize, endpoint, res }) {
  const category = categoryEndpoints[endpoint.replace('GET:', '')]
  const page = +params.page || 1
  const color = params.color || ''
  const min = +params.min || 0
  const max = +params.max || Infinity
  const sort = params.sort
  const dir = params.dir
  const data = await getProducts(db, pageSize, page, category, color, min, max, sort, dir)
  res.end(JSON.stringify(data))
}

module.exports = { endpoints }


