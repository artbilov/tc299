const fs = require('fs')
const { genToken } = require("./gen-token.js")
const { genCookie } = require("./gen-cookie.js")

const sessions = []
let db

async function loadSessions(dbConnection) {
  db = dbConnection
  const loadedSessions = await db.collection('sessions').find().toArray()
  sessions.push(...loadedSessions)
}

async function ensureSession(req, res) {
  const { cookie } = req.headers

  // console.log("Cookie: " + cookie)

  const token = cookie?.split('; ').find(token => token.startsWith('__Host-hh-user-session='))?.split('=')[1]

  await deleteExpiredSessions()

  if (!token) {
    createSession(res)
  }
  else {
    const session = checkSession(token)
    if (!session) createSession(res)
  }
}

function createSession(res) {
  const token = genToken()
  const { cookie, expire: end } = genCookie('__Host-hh-user-session', token, 0, 0, 60)
  const email = ''
  const wishList = []
  const inCart = []
  const start = Date.now()

  res.setHeader('Set-Cookie', cookie)


  const session = { token, email, wishList, inCart, start, end }
  sessions.push(session)

  db.collection('sessions').insertOne(session)


  return cookie
}

function checkSession(token) {
  const session = sessions.find(session => session.token === token)

  return session && session.end > Date.now()
}

async function deleteExpiredSessions() {
  const now = Date.now()
  sessions.splice(0, sessions.length, ...sessions.filter(session => session.end > now))

  const filter = { end: { $lt: now } }
  await db.collection('sessions').deleteMany(filter)
}


// ...
async function updateSession(req, res, article) {
  // Get session (token).
  const { cookie } = req.headers
  const token = cookie?.split('; ').find(token => token.startsWith('__Host-hh-user-session='))?.split('=')[1]

  if (!token) return

  const session = sessions.find(session => session.token === token)

  if (!session) return

  if (req.url === '/to-wish-list') {
    updateWishlist(res, session, token, article)
  } else if (req.url === '/to-cart') {
    updateCart(res, session, token, article)
  }
}

// Используем для регистрации пользователя
async function upgradeSession(req, email) {

  const { cookie } = req.headers
  const token = cookie?.split('; ').find(token => token.startsWith('__Host-hh-user-session='))?.split('=')[1]

  if (!token) return

  const session = sessions.find(session => session.token === token)

  if (!session) return

  session.email = email
  session.wishList = []
  session.inCart = []

  try {
    const result = await db.collection('sessions').updateOne({ token }, { $set: { email, wishList: [], inCart: [] } })
    if (result.modifiedCount > 0) {
      console.log('Session upgraded')
    }
  } catch (error) {
    console.log(error)
  }

  



  // старая версия (когда сессия хранилась в базе данных, а не на фронте)
  // try {
  //   // Передающая коллекция - sessions, принимающая коллекция - users
  //   const sessionsCollection = db.collection('sessions')
  //   const usersCollection = db.collection('users')

  //   // Найти документ в коллекции sessions, имеющий поле token
  //   const sessionDoc = sessions.find(session => session.token === token)

  //   if (sessionDoc) {
  //     // Найти документ в коллекции users, имеющий email, соответствующий email в sessionDoc
  //     sessionDoc.email = email
  //     // await sessionsCollection.updateOne({ token }, { $set: { email } })
  //     const userDoc = await usersCollection.findOne({ email })

  //     if (userDoc) {
  //       // Найти элементы из массива wishList в sessionDoc, которых нет в массиве wishList userDoc
  //       const uniqueWishListItems = sessionDoc.wishList.filter(item => !userDoc.wishList.includes(item))

  //       // Найти элементы из массива inCart в sessionDoc, которых нет в массиве inCart userDoc
  //       const uniqueInCartItems = sessionDoc.inCart.filter(({ article }) => !userDoc.inCart.includes({ article }))

  //       // Добавить уникальные элементы в массив wishList и inCart userDoc
  //       userDoc.wishList.push(...uniqueWishListItems)
  //       userDoc.inCart.push(...uniqueInCartItems)

  //       // Обновить документ userDoc в коллекции users
  //       await usersCollection.updateOne({ email }, {
  //         $set: {
  //           wishList: userDoc.wishList,
  //           inCart: userDoc.inCart
  //         }
  //       })
  //     }

  //     // Очистить массив wishList и inCart в sessionDoc
  //     sessions.map(session => session.token === token ? { ...session, wishList: [], inCart: [] } : session)
  //     await sessionsCollection.updateOne({ token }, {
  //       $set: {
  //         wishList: [],
  //         inCart: []
  //       }
  //     });

  //     res.end(JSON.stringify({ result: 'Wishlist and Cart upgraded' }));
  //   }
  // } catch (error) {
  //   console.log(error);
  // }
}

async function updateWishlist(res, session, token, article) {
  // Check if email is in session
  if (session.email) {
    const email = session.email

    try {
      const result = await db.collection('users').updateOne(
        { email },
        [
          {
            $set: {
              wishList: {
                $cond: {
                  if: { $in: [article, "$wishList"] },
                  then: { $setDifference: ["$wishList", [article]] },
                  else: { $concatArrays: ["$wishList", [article]] }
                }
              }
            }
          }
        ],
        { multi: false, upsert: false }
      )

      if (result.modifiedCount > 0) {
        res.writeHead(200).end(JSON.stringify({ result: 'Product added to wishlist' }))
      } else {
        res.writeHead(404).end(JSON.stringify({ error: 'Session not found' }))
      }
    } catch (err) {
      console.error(err);
      res.writeHead(500).end(JSON.stringify({ error: 'Internal server error' }))
    }
  } else {
    // Add article to session without email

    try {
      const result = await db.collection('sessions').updateOne(
        { token },
        [
          {
            $set: {
              wishList: {
                $cond: {
                  if: { $in: [article, "$wishList"] },
                  then: { $setDifference: ["$wishList", [article]] },
                  else: { $concatArrays: ["$wishList", [article]] }
                }
              }
            }
          }
        ],
        { multi: false, upsert: false }
      )

      if (result.modifiedCount > 0) {
        res.writeHead(200).end(JSON.stringify({ result: 'Product added to wishlist' }))
      } else {
        res.writeHead(404).end(JSON.stringify({ error: 'Session not found' }))
      }
    } catch (err) {
      console.error(err);
      res.writeHead(500).end(JSON.stringify({ error: 'Internal server error' }))
    }
  }
}

async function updateCart(res, session, token, article) {
  // Check if email is in session
  if (session.email) {
    const email = session.email

    try {
      const result = await db.collection('users').updateOne(
        { email, 'inCart.article': { $ne: article } }, // Проверяем, что объекта с таким article еще нет
        { $push: { inCart: { article, quantity: 1 } } }, // Добавляем новый объект в массив inCart
        { upsert: false } // Не создаем новый документ
      )

      if (result.modifiedCount > 0) {
        res.statusCode = 201
        res.end(JSON.stringify({ result: 'Product added to cart' }))
        console.log('Product added to cart')
      } else if (result.modifiedCount === 0) {
        res.statusCode = 204
        res.end(JSON.stringify({ error: 'Product already in cart' }))
        console.log('Product already in cart')
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

  } else {
    // Add article to session without email
    try {
      const result = await db.collection('sessions').updateOne(
        { token, 'inCart.article': { $ne: article } },
        { $push: { inCart: { article, quantity: 1 } } },
        { upsert: false }
      )

      if (result.modifiedCount > 0) {
        res.statusCode = 201
        res.end(JSON.stringify({ result: 'Product added to cart' }))
      } else if (result.modifiedCount === 0) {
        res.statusCode = 204
        res.end(JSON.stringify({ error: 'Product already in cart' }))
      } else {
        res.end('Something went wrong, maybe session not found or ...')
        console.log('Something went wrong, maybe session not found or ...')
      }
    } catch (err) {
      res.statusCode = 500
      res.end(JSON.stringify({ error: 'Internal server error' }))
    }
  }
}


module.exports = { sessions, ensureSession, loadSessions, updateSession, upgradeSession }
