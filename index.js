require('dotenv').config()
const { createServer } = require('http')
const fs = require('fs')
const port = process.env.PORT
const { makeApiHandler } = require('./api.js')
const { connectMongo } = require('./mongo.js')


connectMongo().then(db => {
  const handleApi = makeApiHandler(db)
  const server = createServer(handleApi)

  server.listen(port, () => {
    console.log('Server started on http://localhost:' + port)
  })
})


