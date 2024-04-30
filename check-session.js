module.exports = { checkSession }

async function checkSession(db, cookie) {
  if (cookie.includes('token=')) {

    const token = cookie.split('; ').find(str => str.includes('token=')).split('=')[1]

    const result = await db.collection('sessions').findOne({ token })

    return result
  }
  return false
}