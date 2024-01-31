module.exports = { encryptPassword }

const bcrypt = require('bcrypt')

function encryptPassword(password) {
  const salt = bcrypt.genSaltSync(10)
  return bcrypt.hashSync(password, salt)
}