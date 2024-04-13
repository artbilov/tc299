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
  const token = cookie?.split('; ').find(token => token.startsWith('user_session='))?.split('=')[1]

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
  const { cookie, expire: end } = genCookie('user_session', token, 0, 0, 100)
  const email = ''
  const wishList = []
  const cart = []
  const start = Date.now()

  res.setHeader('Set-Cookie', cookie)

  const session = { token, email, wishList, cart, start, end }
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

async function updateSession(req, res, place, article) {
  const { cookie } = req.headers
  const token = cookie?.split('; ').find(token => token.startsWith('user_session='))?.split('=')[1]

  if (!token) return

  const session = sessions.find(session => session.token === token)

  if (!session) return

  if (place !== 'wishList' && place !== 'cart') return

  if (session.email) {
    const email = session.email
    const sessionsForUpdate = sessions.filter(session => session.email == email)

    const [{ wishList }, ...rest] = sessionsForUpdate
    wishList.push(article)

    for (const session of rest) session.wishList = wishList

    try {
      await db.collection('sessions').updateMany({ email }, { $set: { wishList } })

    } catch (error) {
      console.log(error)
    }
    const sessionWL = wishList
    const user = await db.collection('users').updateOne(
      { email },
      [
        {
          $set: {
            wishList: {
              $cond: {
                if: {
                  $gt: [
                    { $size: { $setDifference: [sessionWL, "$wishList"] } },
                    0
                  ]
                },
                then: { $setUnion: ["$wishList", sessionWL] },
                else: "$wishList"
              }
            }
          }
        }
      ],
      { multi: false, upsert: false }
    )
    console.log(user)
  } else {
    session.wishList.push(article)

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

module.exports = { sessions, ensureSession, loadSessions, updateSession }
