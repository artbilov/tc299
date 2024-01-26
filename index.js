require('dotenv').config()
const { createServer } = require('http')
const fs = require('fs')
const port = process.env.PORT
const { handleApi } = require('./api.js')


const server = createServer(handleApi)

server.listen(port, () => {
  console.log('Server started on http://localhost:' + port)
})

