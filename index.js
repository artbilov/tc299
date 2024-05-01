require('dotenv').config()
const { createServer } = require('http')
const fs = require('fs')
const port = process.env.PORT
const { makeApiHandler } = require('./api.js')
const { connectMongo } = require('./mongo.js')
const { loadSessions } = require('./sessions/sessions.js')

connectMongo().then(async db => {
  const handleApi = makeApiHandler(db)
  const server = createServer(handleApi)

  await loadSessions(db)

  server.listen(port, () => {
    console.log('Server started on http://localhost:' + port)
  })
})
