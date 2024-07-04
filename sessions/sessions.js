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
  const token = getToken(req)

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
  const token = getToken(req)

  if (!token) return

  const session = sessions.find(session => session.token === token)

  if (!session) return

  if (req.url === '/to-wish-list') {
    updateWishlist(res, session, token, article)
  } else if (req.url === '/to-cart') {
    updateCart(res, session, token, article)
  }
}


function getToken(req) {
  const { cookie } = req.headers
  const token = cookie?.split('; ').find(token => token.startsWith('__Host-hh-user-session='))?.split('=')[1]
  return token
}


// Используем при входе (логине) пользователя
async function updateUserData(email, user, payload) {
  const newWishList = payload.wishList || []
  const newInCart = payload.inCart || []

  console.log(newWishList, newInCart)

  if (!newWishList.length && !newInCart.length) return

  let { wishList, inCart } = user

  const uniqueWL = [...new Set([...wishList, ...newWishList])]

  // wishList = uniqueWL

  const uniqueInCart = !inCart.length ? newInCart
    : newInCart.filter(({ article }) => !inCart.some(item => item.article == article))

  inCart.push(...uniqueInCart)

  try {
    await db.collection('users').updateOne(
      { email },
      {
        $set: {
          wishList: uniqueWL,
          inCart: uniqueInCart
        }
      }
    )
  } catch (error) {
    console.log(error)
  }
}

// Используем для регистрации пользователя
async function upgradeSession(req, email) {

  const token = getToken(req)

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

// Используем для добавления и удаления продуктов из wishList
async function updateWishlist(req, res, article) {
  // Check if email is in a session
  const token = getToken(req)
  const session = sessions.find(session => session.token === token)

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
        res.writeHead(200).end(JSON.stringify({ result: 'Product added or removed to wishlist' }))
      } else {
        res.writeHead(404).end(JSON.stringify({ error: 'Session not found' }))
      }
    } catch (err) {
      console.error(err);
      res.writeHead(500).end(JSON.stringify({ error: 'Internal server error' }))
    }
  } else {
    console.log('Please login or register first')
    res.writeHead(401).end(JSON.stringify({ error: 'Please login or register first' }))
  }
}

// Используем для добавления продуктов в inCart
async function updateCart(req, res, article) {
  // Check if email is in a session
  const token = getToken(req)
  const session = sessions.find(session => session.token === token)

  if (session.email) {
    const email = session.email
    const quantity = 1

    const user = await db.collection('users').findOne({ email })

    const { inCart } = user
    const newItemInCart = [{ article, quantity }]


    const uniqueInCart = !inCart.length ? newItemInCart
      : newItemInCart.filter(({ article }) => !inCart.some(item => item.article == article))

    try {
      await db.collection('users').updateOne(
        { email },
        {
          $set: {
            inCart: uniqueInCart
          }
        }
      )

      if (result.modifiedCount > 0) {
        res.writeHead(200).end(JSON.stringify({ result: 'Product added or removed to wishlist' }))
      } else {
        res.writeHead(404).end(JSON.stringify({ error: 'Session not found' }))
      }
    } catch (err) {
      console.error(err);
      res.writeHead(500).end(JSON.stringify({ error: 'Internal server error' }))
    }
  } else {
    console.log('Please login or register first')
    res.writeHead(401).end(JSON.stringify({ error: 'Please login or register first' }))
  }
}

module.exports = { sessions, ensureSession, loadSessions, updateSession, upgradeSession, updateUserData }
