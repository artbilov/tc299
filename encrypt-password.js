const { scrypt, randomBytes } = require('crypto')


module.exports = { hash, verify }


async function hash(password) {
  const salt = randomBytes(8).toString('hex')
  return new Promise((resolve, reject) =>
    scrypt(password, salt, 32, (err, hash) =>
      err ? reject(err) : resolve(salt + hash.toString('hex'))))
}

async function verify(password, hashed) {
  const salt = hashed.slice(0, 16)
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 32, (err, hash) =>
      err ? reject(err) : resolve(hashed == salt + hash.toString('hex')))
  })
}