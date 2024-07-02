const fs = require('fs')
const { getUsers } = require('./get-users.js')
const { getProducts } = require('./get-products.js')
const { getUserData } = require('./get-user-data.js')
const { checkSession } = require('./check-session.js')
const { hash, verify } = require('./encrypt-password.js')
const { isAdmin } = require('./check-admin.js')
// const { setNewSession } = require('./set-new-session.js')
const { ensureSession, updateSession, upgradeSession, updateUserData } = require('./sessions/sessions.js')

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

  // async 'GET:session'({ db, req, res }) {
  //   const { cookie } = req.headers
  //   const isValidSession = cookie && await checkSession(db, cookie)

  //   if (isValidSession) {
  //     const userData = await getUserData(db, cookie)
  //     res.setHeader('Content-Type', 'application/json; charset=utf-8')
  //     res.end(JSON.stringify(userData, null, 2))
  //   } else {
  //     setNewSession(db, res)
  //   }
  // },

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

  async 'POST:register'({ db, req, res, payload }) {
    const { regType } = payload
    if (regType === 'google') {
      const { name, email, id, wishList = [], inCart = [] } = payload

      if (!name || !email || !id) {
        res.writeHead(400).end(JSON.stringify({ error: "All fields are required!" }))
        return
      }

      let { promo } = payload

      if (!promo) promo = false

      const user = { fullName: name, email, promo, regType, _id: id, wishList, inCart, orders: [], reviews: [] }

      // reviews: [{ article, stars, text, reviewDate }, { article, stars, text, reviewDate }]

      try {
        const result = await db.collection('users').updateOne(
          { email }, // Проверяем наличие документа с указанным email
          { $setOnInsert: user }, // Добавляем новый документ user при отсутствии
          { upsert: true, returnOriginal: false } // Создаем новый документ, если его нет
        )

        if (result.upsertedId) {
          res.statusCode = 201
          upgradeSession(req, email)
          console.log('User created')
          delete user._id
          res.end(JSON.stringify({ user }))
        } else if (result.modifiedCount === 0) {
          res.statusCode = 204
          res.end(JSON.stringify({ result: 'User already exists' }))
          console.log('User already exists')
        } else {
          res.statusCode = 404
          res.end('Something went wrong, maybe session not found or ...')
          console.log('Something went wrong, maybe session not found or ...')
        }
      } catch (err) {
        res.statusCode = 500
        res.end(JSON.stringify({ error: 'Internal server error' }))
        console.log(err)
      }

    } else if (regType === 'email') {
      const { fullName, email, password, wishList = [], inCart = [] } = payload

      if (!fullName || !email || !password) {
        res.writeHead(400).end(JSON.stringify({ error: "All fields are required!" }))
        return
      }
      const hashed = await hash(password)
      let { promo } = payload

      if (!promo) promo = false
      const user = { fullName, email, hash: hashed, promo, regType, wishList, inCart, orders: [], reviews: [] }

      try {
        const result = await db.collection('users').updateOne(
          { email }, // Проверяем наличие документа с указанным email
          { $setOnInsert: user }, // Добавляем новый документ user при отсутствии
          { upsert: true, returnOriginal: false } // Создаем новый документ, если его нет
        )

        if (result.upsertedId) {
          res.statusCode = 201
          upgradeSession(req, email)
          console.log('User created')
          delete user.hash
          res.end(JSON.stringify({ user }))
        } else if (result.modifiedCount === 0) {
          res.statusCode = 204
          res.end(JSON.stringify('User already exists'))
          console.log('User already exists')
        } else {
          res.statusCode = 404
          res.end('Something went wrong, maybe session not found or ...')
          console.log('Something went wrong, maybe session not found or ...')
        }
      } catch (err) {
        res.statusCode = 500
        res.end(JSON.stringify({ error: 'Internal server error' }))
        console.log(err)
      }

    }
  },

  async 'POST:login'({ db, req, res, payload }) {

    const { regType, email } = payload

    if (regType === 'google') {
      const { id } = payload
      const user = await db.collection('users').findOne({ email, _id: id }, { projection: { _id: 0 } }).catch(err => {
        if (err.code == 11000) return { insertedId: null }
      })

      if (user) {
        updateUserData(email, user, payload)
        upgradeSession(req, email)
        res.end(JSON.stringify(user))
      } else {
        res.writeHead(400).end(JSON.stringify({ error: "User with this email not found" }))
      }

    } else if (regType === 'email') {
      const { password } = payload

      if (!email || !password) {
        res.writeHead(400).end(JSON.stringify({ error: "Login or password are incorrect" }))
        return
      }

      const user = await db.collection('users').findOne({ email }, { projection: { _id: 0 } }).catch(err => {
        if (err.code == 11000) return { insertedId: null }
      })

      if (user && await verify(password, user.hash).catch(_ => false)) {
        updateUserData(email, user, payload)
        upgradeSession(req, email)
        delete user.hash
        res.end(JSON.stringify(user))
      } else {
        res.writeHead(400).end(JSON.stringify({ error: "Login or password is incorrect" }))
      }
    }
  },

  'PUT:to-wish-list'({ req, res, payload }) {
    const { article } = payload

    updateSession(req, res, article)
  },

  'PUT:to-cart'({ req, res, payload }) {
    const { article } = payload

    updateSession(req, res, article)
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


