module.exports = { makeApiHandler }


const artPage = `
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test API page</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' style=' background:black'><text y='16' font-family='Trebuchet MS' font-weight='900' fill='orange'>AB</text></svg>">
  <script>
    onload = () => form.addEventListener('submit', testApi)

    const testApi = async (e) => {
      e.preventDefault()
      if (!input.value) return
      ul.innerHTML = ''
      // const url = \`http://localhost:1234/${input.value}\`
      const url = \`https://tc299.vercel.app/${input.value}\`
      const result = await fetch(url)
      const data = await result.json()

      render(data)
      console.log(data)
    }

    const render = (data) => {
      if (input.value == 'products') {
        data.results.forEach(item => {
          const li = document.createElement('li')
          li.innerHTML = \`
            <h3>${item.name}</h3>
            <img src="${item.image[0]}">
            <p>${item.price}</p>
          \`
          ul.append(li)
        })
      } else {
        data.results.forEach(({_id, hash, ...item}) => {
          const tr = document.createElement('tr')
          let html = ''
          for (const key in item) {
            html += \`<td title="${key}">${item[key]}</td>\`
          }
          tr.innerHTML = html
          table.append(tr)
        })
      }
    }
  </script>

  <style>
    ul {
      list-style: none;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
    }

    li {
      width: 32%;
      overflow: hidden;
    }

    img {
      width: 100%;
    }
  </style>

</head>

<body>
  <h1>Test API page</h1>
  <form id="form">
    <input id="input" type="text">
    <button>Try</button>
  </form>
  <p>Put your API-route in the Input field above. For example: 'candles' or 'gift-sets'</p>
  <ul id="ul"></ul>
  <table id="table"></table>

</body>

</html>
`



function makeApiHandler(db) {
  return async function handleApi(req, res) {
    // if (req.url === '/') {
    //   res.writeHead(302, {
    //     'Location': 'https://tc299.vercel.app/art-page.html'
    //   });
    //   res.end()
    //   return
    // }

    const path = req.url.slice(1) || 'art-page.html'
    const [endpoint, query] = path.split('?')
    const params = decode(query)
    const method = req.method
    const body = await getBody(req)
    const payload = JSON.parse(body || '{}')
    const pageSize = 9
    const categoryEndpoints = { 'candles': 'Candles', 'lighting-decor': 'Lighting Decor', 'gift-sets': 'Gift Sets', 'get-warm': 'Get Warm', 'table-games': 'Table Games', 'books-and-journals': 'Books & Journals' }

    // console.log({ path, method, endpoint, params })

    // db.collection('products').insertMany(JSON.parse(fs.readFileSync('products.json', 'utf-8'))) // put products from the file into a db
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
          const page = +params.page || 1
          const data = await getUsers(db, pageSize, page)
          res.end(JSON.stringify(data))
        }
      } else if (categoryEndpoints[endpoint]) {
        const category = categoryEndpoints[endpoint]
        const page = +params.page || 1
        const data = await getProducts(db, pageSize, page, category)
        res.end(JSON.stringify(data))
      } else if (endpoint === 'art-page.html') {
        console.log(fs.readdirSync('.'))
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end( artPage, 'utf-8')
        // res.end(fs.readFileSync('art-page.html', 'utf-8'))
      } else {
        res.statusCode = 404
        res.end(JSON.stringify({ error: 'not found' }))
      }

    } else if (method == 'POST') {
      if (endpoint == 'product') {
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
      } else if (endpoint == 'user') {
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

async function getProducts(db, pageSize, page, category) {
  const skip = (page - 1) * pageSize;

  const pipeline = [
    ...category ? [{ $match: { category } }] : [],
    {
      $facet: {
        totalProducts: [
          { $count: 'amount' },
        ],
        prices: [
          {
            $group: {
              _id: null,
              minPrice: { $min: '$price' },
              maxPrice: { $max: '$price' }
            }
          },
        ],
        products: [
          { $skip: skip },
          { $limit: pageSize }
        ]
      }
    }
  ]

  const [result] = await db.collection('products').aggregate(pipeline).toArray()
  const { products, totalProducts: [{ amount }], prices: [{ minPrice, maxPrice }] } = result
  const data = { page, totalProducts: amount, totalPages: Math.ceil(amount / pageSize), minPrice, maxPrice, results: products }
  console.log(data)
  return data
}

async function getUsers(db, pageSize, page) {
  const skip = (page - 1) * pageSize;

  const pipeline = [
    {
      $facet: {
        totalUsers: [
          { $count: 'amount' },
        ],

        users: [
          { $skip: skip },
          { $limit: pageSize }
        ]
      }
    }
  ]

  const [result] = await db.collection('users').aggregate(pipeline).toArray()
  const { users, totalUsers: [{ amount }] } = result
  const data = { page, totalPages: Math.ceil(amount / pageSize), totalUsers: amount, results: users }
  console.log(data)
  return data
}

const { decode } = require('querystring');
const fs = require('fs')
const { isAdmin } = require('./check-admin.js')
const { hash, verify } = require('./encrypt-password.js')


