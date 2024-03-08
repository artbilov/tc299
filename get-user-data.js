module.exports = { getUserData }

async function getUserData(db, cookie) {
   const token = cookie.split('=')[1]
   const result = await db.collection('sessions').findOne({ token })
   if (!result) return
   const { userId, inCart, wishList } = result
   return { userId, inCart, wishList }
}