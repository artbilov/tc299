const { connectMongo } = require('./mongo.js')

async function prepareCRUD(collectionName) {
  // const collectionName = "products"

  const collection = await connectMongo(collectionName)
  const products = await collection.find().toArray()

  const crud = {
    async c(product) {
      // if (typeof str !== 'string') throw 'strings only'
      if (products.some(item => item.name == product.name)) throw 'duplicate product'
      // const doc = { string: str }
      const result = await collection.insertOne(product)
      console.log({ result, products: products})
      products.push(product)
    },

    r() {
      return products.map(item => item.string)
    },

    async u(oldStr, newStr) {
      const i = products.findIndex(doc => doc.string == oldStr)
      if (i == -1) throw 'string not found'
      if (typeof newStr !== 'string') throw 'strings only'
      if (products.some(doc => doc.string == newStr)) throw 'duplicate string'
      products[i].string = newStr
      await collection.updateOne({ string: oldStr }, { $set: { string: newStr } })
    },

    async d(str) {
      const i = products.findIndex(doc => doc.string == str)
      if (i == -1) throw 'string not found'
      products.splice(i, 1)
      await collection.deleteOne({ string: str })
    }
  }
  return crud
}
module.exports = { prepareCRUD }