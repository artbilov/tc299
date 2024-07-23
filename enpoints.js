const fs = require('fs')
const { getUsers } = require('./get-users.js')
const { getProducts } = require('./get-products.js')
const { hash, verify } = require('./encrypt-password.js')
const { isAdmin } = require('./check-admin.js')
const { upgradeSession, updateUserData, updateWishlist, updateCart, updateViews, getToken, sessions, getWishListProducts } = require('./sessions/sessions.js')

const categoryEndpoints = { 'candles': 'Candles', 'lighting-decor': 'Lighting Decor', 'gift-sets': 'Gift Sets', 'get-warm': 'Get Warm', 'table-games': 'Table Games', 'books-and-journals': 'Books & Journals' }



const endpoints = {

  async 'GET:products'({ db, params, pageSize, res }) {
    const query = params.query
    const page = +params.page || 1
    const color = params.color || ''
    const min = +params.min || 0
    const max = +params.max || Infinity
    const sort = params.sort
    const dir = params.dir
    const data = await getProducts({ db, query, pageSize, page, color, min, max, sort, dir })
    res.end(JSON.stringify(data))
  },

  async 'GET:product'({ db, params, res }) {
    const product = await db.collection('products').findOne({ article: params.article })
    res.end(JSON.stringify(product))
  },

  async 'GET:search'({ db, params, pageSize, res }) {
    // const { query, min, max, ...props } = params
    const query = params.query
    const page = +params.page || 1
    const color = params.color || ''
    const min = +params.min || 0
    const max = +params.max || Infinity
    const sort = params.sort
    const dir = params.dir

    // let filter = query ?
    //   // { $or: [
    //   { name: { $regex, $options: "i" } }
    //   // { category: { $regex, $options: "i" }},
    //   // { color: { $regex, $options: "i" } }
    //   // ] }
    //   : props
    // if (min && max) {
    //   filter = {
    //     $and: [
    //       filter,
    //       { price: { $gte: +min, $lte: +max } }
    //     ]
    //   }
    // }

    // let pipeline = [
    //   {
    //     $match: query
    //       ? { name: { $regex, $options: "i" } }
    //       : props
    //   },
    //   ...sort ? [{ $sort: { [sort]: dir == 'desc' ? -1 : 1 } }] : [],
    //   {
    //     $facet: {
    //       totalProducts: [
    //         { $count: 'amount' },
    //       ],
    //       prices: [
    //         {
    //           $group: {
    //             _id: null,
    //             minPrice: { $min: '$price' },
    //             maxPrice: { $max: '$price' }
    //           }
    //         },
    //       ],
    //       products: [
    //         { $skip: skip },
    //         { $limit: pageSize }
    //       ]
    //     }
    //   }
    // ]

    // if (min && max) {
    //   pipeline = [
    //     {
    //       $match: {
    //         $and: [
    //           pipeline[0].$match,
    //           { price: { $gte: +min, $lte: +max } }
    //         ]
    //       }
    //     }
    //   ]
    // }

    // const products = await db.collection('products').find(filter).toArray()

    const data = await getProducts({ db, query, pageSize, page, color, min, max, sort, dir })
    res.end(JSON.stringify(data))
  },

  async 'GET:user'({ db, params, pageSize, res }) {
    const page = +params.page || 1
    const data = await getUsers(db, pageSize, page)
    res.end(JSON.stringify(data))
  },

  async 'GET:users'({ db, params, pageSize, req, res }) {
    if (isAdmin(req)) {
      const page = +params.page || 1
      const data = await getUsers(db, pageSize, page)
      res.end(JSON.stringify(data))
    }
  },

  async 'GET:user-onload'({ db, req, res }) {
    const token = await getToken(req)
    const session = sessions.find(session => session.token === token)
    const email = session?.email

    if (email) {
      const pipeline = [
        // Находим пользователя по email
        { $match: { email } },

        // Преобразуем wishList
        {
          $lookup: {
            from: 'products',
            localField: 'wishList',
            foreignField: 'article',
            as: 'populatedWishList'
          }
        },

        // Преобразуем inCart
        {
          $lookup: {
            from: 'products',
            localField: 'inCart.article',
            foreignField: 'article',
            as: 'productDetails'
          }
        },

        // Объединяем inCart с данными о продуктах
        {
          $addFields: {
            inCart: {
              $map: {
                input: '$inCart',
                as: 'cartItem',
                in: {
                  $mergeObjects: [
                    '$$cartItem',
                    {
                      product: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: '$productDetails',
                              cond: { $eq: ['$$this.article', '$$cartItem.article'] }
                            }
                          },
                          0
                        ]
                      }
                    }
                  ]
                }
              }
            }
          }
        },

        // Финальная проекция для формирования нужной структуры
        {
          $project: {
            _id: 0,
            fullName: 1,
            email: 1,
            wishList: {
              $map: {
                input: '$populatedWishList',
                as: 'product',
                in: {
                  name: '$$product.name',
                  category: '$$product.category',
                  article: '$$product.article',
                  description: '$$product.description',
                  aboutProduct: '$$product.aboutProduct',
                  color: '$$product.color',
                  quantity: '$$product.quantity',
                  price: '$$product.price',
                  image: '$$product.image',
                  picture: '$$product.picture'
                }
              }
            },
            inCart: {
              $map: {
                input: '$inCart',
                as: 'cartItem',
                in: {
                  article: '$$cartItem.article',
                  quantity: '$$cartItem.quantity',
                  product: {
                    name: '$$cartItem.product.name',
                    category: '$$cartItem.product.category',
                    article: '$$cartItem.product.article',
                    description: '$$cartItem.product.description',
                    aboutProduct: '$$cartItem.product.aboutProduct',
                    color: '$$cartItem.product.color',
                    quantity: '$$cartItem.product.quantity',
                    price: '$$cartItem.product.price',
                    image: '$$cartItem.product.image',
                    picture: '$$cartItem.product.picture'
                  }
                }
              }
            }
          }
        }
      ];

      const [enrichedUser] = await db.collection('users').aggregate(pipeline).toArray();

      res.end(JSON.stringify({ enrichedUser, cookie: { token: session.token, expire: session.end } })) //new Date(session.end).toUTCString()
    } else {
      res.end(JSON.stringify({ noUser: 'Please login or register first', cookie: { token: session.token, expire: session.end } })) //new Date(session.end).toUTCString()
    }
  },

  async 'GET:wish-list'({ req, res }) {
    const token = getToken(req)
    if (!token) return

    const session = sessions.find(session => session.token === token)

    if (!session) {
      res.end(JSON.stringify({ error: 'No session found' }))
      return
    }

    if (!session.email) {
      res.end(JSON.stringify({ error: 'Please login or register first' }))
      return
    }

    const email = session.email

    const products = await getWishListProducts(email)

    res.end(JSON.stringify(products))
  },

  async 'GET:cart'({ db, req, res }) {
    const token = getToken(req)

    if (!token) {
      res.statusCode = 401
      res.end(JSON.stringify({ error: 'No session found' }))
      return
    }

    const session = sessions.find(session => session.token === token)

    if (!session) {
      res.statusCode = 403
      res.end(JSON.stringify({ error: 'No session found' }))
      return
    }

    if (!session.email) {
      res.statusCode = 404
      res.end(JSON.stringify({ error: 'Please login or register first' }))
      return
    }

    const email = session.email
    const user = await db.collection('users').findOne({ email })
    res.end(JSON.stringify(user.inCart))
  },

  'GET:art-page.html'({ res }) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end(fs.readFileSync('art-page.html', 'utf-8'))
  },

  async 'POST:product'({ db, req, res, payload }) {
    if (isAdmin(req)) {
      const { _id, name, category, description = '', aboutProduct = '', color = '', quantity = 0, price = null, image = [], picture = '', reviews = [], questions = [], createdAt = '', updatedAt = '' } = payload
      if (!name || !category) {
        res.writeHead(400).end(JSON.stringify({ error: "name, category and article are required" }))
        return
      }
      const product = { ..._id && { _id }, name, category, description, aboutProduct, color, quantity, price, image, picture, reviews, questions, createdAt, updatedAt }
      const result = await db.collection('products').insertOne(product).catch(err => {
        if (err.code == 11000) return { insertedId: null }
      })
      if (result.insertedId) {
        res.end(JSON.stringify({ _id: result.insertedId }))
      } else {
        res.writeHead(400).end(JSON.stringify({ error: "article is not unique" }))
      }
    }
  },

  async 'POST:register'({ db, req, res, payload }) {
    const { regType } = payload
    if (regType === 'google') {
      const { name, email, id, wishList = [], inCart = [] } = payload

      if (!name || !email || !id) {
        res.writeHead(400).end(JSON.stringify({ error: "All fields are required!" }))
        return
      }

      let { promo } = payload

      if (!promo) promo = false

      const user = { fullName: name, email, promo, regType, _id: id, wishList, inCart, orders: [], reviews: [] }

      // reviews: [{ article, stars, text, reviewDate }, { article, stars, text, reviewDate }]

      try {
        const result = await db.collection('users').updateOne(
          { email }, // Проверяем наличие документа с указанным email
          { $setOnInsert: user }, // Добавляем новый документ user при отсутствии
          { upsert: true, returnOriginal: false } // Создаем новый документ, если его нет
        )

        if (result.upsertedId) {
          res.statusCode = 201
          await upgradeSession(req, email)
          console.log('User created')
          // delete user._id

          const pipeline = [
            // Находим пользователя по email
            { $match: { email } },

            // Преобразуем wishList
            {
              $lookup: {
                from: 'products',
                localField: 'wishList',
                foreignField: 'article',
                as: 'populatedWishList'
              }
            },

            // Преобразуем inCart
            {
              $lookup: {
                from: 'products',
                localField: 'inCart.article',
                foreignField: 'article',
                as: 'productDetails'
              }
            },

            // Объединяем inCart с данными о продуктах
            {
              $addFields: {
                inCart: {
                  $map: {
                    input: '$inCart',
                    as: 'cartItem',
                    in: {
                      $mergeObjects: [
                        '$$cartItem',
                        {
                          product: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: '$productDetails',
                                  cond: { $eq: ['$$this.article', '$$cartItem.article'] }
                                }
                              },
                              0
                            ]
                          }
                        }
                      ]
                    }
                  }
                }
              }
            },

            // Финальная проекция для формирования нужной структуры
            {
              $project: {
                _id: 0,
                fullName: 1,
                email: 1,
                wishList: {
                  $map: {
                    input: '$populatedWishList',
                    as: 'product',
                    in: {
                      name: '$$product.name',
                      category: '$$product.category',
                      article: '$$product.article',
                      description: '$$product.description',
                      aboutProduct: '$$product.aboutProduct',
                      color: '$$product.color',
                      quantity: '$$product.quantity',
                      price: '$$product.price',
                      image: '$$product.image',
                      picture: '$$product.picture'
                    }
                  }
                },
                inCart: {
                  $map: {
                    input: '$inCart',
                    as: 'cartItem',
                    in: {
                      article: '$$cartItem.article',
                      quantity: '$$cartItem.quantity',
                      product: {
                        name: '$$cartItem.product.name',
                        category: '$$cartItem.product.category',
                        article: '$$cartItem.product.article',
                        description: '$$cartItem.product.description',
                        aboutProduct: '$$cartItem.product.aboutProduct',
                        color: '$$cartItem.product.color',
                        quantity: '$$cartItem.product.quantity',
                        price: '$$cartItem.product.price',
                        image: '$$cartItem.product.image',
                        picture: '$$cartItem.product.picture'
                      }
                    }
                  }
                }
              }
            }
          ];

          const [enrichedUser] = await db.collection('users').aggregate(pipeline).toArray();

          res.end(JSON.stringify(enrichedUser))

        } else if (result.modifiedCount === 0) {
          res.statusCode = 204
          res.end(JSON.stringify({ result: 'User already exists' }))
          console.log('User already exists')
        } else {
          res.statusCode = 404
          res.end('Something went wrong, maybe session not found or ...')
          console.log('Something went wrong, maybe session not found or ...')
        }
      } catch (err) {
        res.statusCode = 500
        res.end(JSON.stringify({ error: 'Internal server error' }))
        console.log(err)
      }

    } else if (regType === 'email') {
      const { fullName, email, password, wishList = [], inCart = [] } = payload

      // Костыль для обработки входящих данных в формате ['article1', 'article2', ...] - удалить за ненадобностью!
      // if (inCart.length) inCart = inCart.map(product => typeof product === 'string' ? { article: product, quantity: 1 } : product)

      if (!fullName || !email || !password) {
        res.writeHead(400).end(JSON.stringify({ error: "All fields are required!" }))
        return
      }
      const hashed = await hash(password)
      let { promo } = payload

      if (!promo) promo = false
      const user = { fullName, email, hash: hashed, promo, regType, wishList, inCart, orders: [], reviews: [] }

      try {
        const result = await db.collection('users').updateOne(
          { email }, // Проверяем наличие документа с указанным email
          { $setOnInsert: user }, // Добавляем новый документ user при отсутствии
          { upsert: true, returnOriginal: false } // Создаем новый документ, если его нет
        )

        if (result.upsertedId) {
          res.statusCode = 201
          await upgradeSession(req, email)
          console.log('User created')

          delete user.hash

          const pipeline = [
            // Находим пользователя по email
            { $match: { email } },

            // Преобразуем wishList
            {
              $lookup: {
                from: 'products',
                localField: 'wishList',
                foreignField: 'article',
                as: 'populatedWishList'
              }
            },

            // Преобразуем inCart
            {
              $lookup: {
                from: 'products',
                localField: 'inCart.article',
                foreignField: 'article',
                as: 'productDetails'
              }
            },

            // Объединяем inCart с данными о продуктах
            {
              $addFields: {
                inCart: {
                  $map: {
                    input: '$inCart',
                    as: 'cartItem',
                    in: {
                      $mergeObjects: [
                        '$$cartItem',
                        {
                          product: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: '$productDetails',
                                  cond: { $eq: ['$$this.article', '$$cartItem.article'] }
                                }
                              },
                              0
                            ]
                          }
                        }
                      ]
                    }
                  }
                }
              }
            },

            // Финальная проекция для формирования нужной структуры
            {
              $project: {
                _id: 0,
                fullName: 1,
                email: 1,
                wishList: {
                  $map: {
                    input: '$populatedWishList',
                    as: 'product',
                    in: {
                      name: '$$product.name',
                      category: '$$product.category',
                      article: '$$product.article',
                      description: '$$product.description',
                      aboutProduct: '$$product.aboutProduct',
                      color: '$$product.color',
                      quantity: '$$product.quantity',
                      price: '$$product.price',
                      image: '$$product.image',
                      picture: '$$product.picture'
                    }
                  }
                },
                inCart: {
                  $map: {
                    input: '$inCart',
                    as: 'cartItem',
                    in: {
                      article: '$$cartItem.article',
                      quantity: '$$cartItem.quantity',
                      product: {
                        name: '$$cartItem.product.name',
                        category: '$$cartItem.product.category',
                        article: '$$cartItem.product.article',
                        description: '$$cartItem.product.description',
                        aboutProduct: '$$cartItem.product.aboutProduct',
                        color: '$$cartItem.product.color',
                        quantity: '$$cartItem.product.quantity',
                        price: '$$cartItem.product.price',
                        image: '$$cartItem.product.image',
                        picture: '$$cartItem.product.picture'
                      }
                    }
                  }
                }
              }
            }
          ];

          const [enrichedUser] = await db.collection('users').aggregate(pipeline).toArray();

          res.end(JSON.stringify(enrichedUser))

        } else if (result.modifiedCount === 0) {
          res.statusCode = 204
          res.end(JSON.stringify('User already exists'))
          console.log('User already exists')
        } else {
          res.statusCode = 404
          res.end('Something went wrong, maybe session not found or ...')
          console.log('Something went wrong, maybe session not found or ...')
        }
      } catch (err) {
        res.statusCode = 500
        res.end(JSON.stringify({ error: 'Internal server error' }))
        console.log(err)
      }

    }
  },

  async 'POST:login'({ db, req, res, payload }) {

    const { regType, email } = payload

    console.log(`payload: ${JSON.stringify(payload, null, 2)}`)

    if (regType === 'google') {
      const { id } = payload

      console.log(`id: ${id}`)

      const user = await db.collection('users').findOne({ email, _id: id }, { projection: { _id: 0 } }).catch(err => {
        if (err.code == 11000) return { insertedId: null }
      })

      if (user) {
        await updateUserData(email, user, payload)
        await upgradeSession(req, email)

        const pipeline = [
          // Находим пользователя по email
          { $match: { email } },

          // Преобразуем wishList
          {
            $lookup: {
              from: 'products',
              localField: 'wishList',
              foreignField: 'article',
              as: 'populatedWishList'
            }
          },

          // Преобразуем inCart
          {
            $lookup: {
              from: 'products',
              localField: 'inCart.article',
              foreignField: 'article',
              as: 'productDetails'
            }
          },

          // Объединяем inCart с данными о продуктах
          {
            $addFields: {
              inCart: {
                $map: {
                  input: '$inCart',
                  as: 'cartItem',
                  in: {
                    $mergeObjects: [
                      '$$cartItem',
                      {
                        product: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: '$productDetails',
                                cond: { $eq: ['$$this.article', '$$cartItem.article'] }
                              }
                            },
                            0
                          ]
                        }
                      }
                    ]
                  }
                }
              }
            }
          },

          // Финальная проекция для формирования нужной структуры
          {
            $project: {
              _id: 0,
              fullName: 1,
              email: 1,
              wishList: {
                $map: {
                  input: '$populatedWishList',
                  as: 'product',
                  in: {
                    name: '$$product.name',
                    category: '$$product.category',
                    article: '$$product.article',
                    description: '$$product.description',
                    aboutProduct: '$$product.aboutProduct',
                    color: '$$product.color',
                    quantity: '$$product.quantity',
                    price: '$$product.price',
                    image: '$$product.image',
                    picture: '$$product.picture'
                  }
                }
              },
              inCart: {
                $map: {
                  input: '$inCart',
                  as: 'cartItem',
                  in: {
                    article: '$$cartItem.article',
                    quantity: '$$cartItem.quantity',
                    product: {
                      name: '$$cartItem.product.name',
                      category: '$$cartItem.product.category',
                      article: '$$cartItem.product.article',
                      description: '$$cartItem.product.description',
                      aboutProduct: '$$cartItem.product.aboutProduct',
                      color: '$$cartItem.product.color',
                      quantity: '$$cartItem.product.quantity',
                      price: '$$cartItem.product.price',
                      image: '$$cartItem.product.image',
                      picture: '$$cartItem.product.picture'
                    }
                  }
                }
              }
            }
          }
        ];

        const [enrichedUser] = await db.collection('users').aggregate(pipeline).toArray()

        res.end(JSON.stringify(enrichedUser))
      } else {
        res.writeHead(400).end(JSON.stringify({ error: "User with this email not found" }))
      }

    } else if (regType === 'email') {
      const { password } = payload

      if (!email || !password) {
        res.writeHead(400).end(JSON.stringify({ error: "Login or password are incorrect" }))
        return
      }

      const user = await db.collection('users').findOne({ email }, { projection: { _id: 0 } }).catch(err => {
        if (err.code == 11000) return { insertedId: null }
      })

      if (user && await verify(password, user.hash).catch(_ => false)) {
        await updateUserData(email, user, payload)
        await upgradeSession(req, email)
        // delete user.hash

        const pipeline = [
          // Находим пользователя по email
          { $match: { email } },

          // Преобразуем wishList
          {
            $lookup: {
              from: 'products',
              localField: 'wishList',
              foreignField: 'article',
              as: 'populatedWishList'
            }
          },

          // Преобразуем inCart
          {
            $lookup: {
              from: 'products',
              localField: 'inCart.article',
              foreignField: 'article',
              as: 'productDetails'
            }
          },

          // Объединяем inCart с данными о продуктах
          {
            $addFields: {
              inCart: {
                $map: {
                  input: '$inCart',
                  as: 'cartItem',
                  in: {
                    $mergeObjects: [
                      '$$cartItem',
                      {
                        product: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: '$productDetails',
                                cond: { $eq: ['$$this.article', '$$cartItem.article'] }
                              }
                            },
                            0
                          ]
                        }
                      }
                    ]
                  }
                }
              }
            }
          },

          // Финальная проекция для формирования нужной структуры
          {
            $project: {
              _id: 0,
              fullName: 1,
              email: 1,
              wishList: {
                $map: {
                  input: '$populatedWishList',
                  as: 'product',
                  in: {
                    name: '$$product.name',
                    category: '$$product.category',
                    article: '$$product.article',
                    description: '$$product.description',
                    aboutProduct: '$$product.aboutProduct',
                    color: '$$product.color',
                    quantity: '$$product.quantity',
                    price: '$$product.price',
                    image: '$$product.image',
                    picture: '$$product.picture'
                  }
                }
              },
              inCart: {
                $map: {
                  input: '$inCart',
                  as: 'cartItem',
                  in: {
                    article: '$$cartItem.article',
                    quantity: '$$cartItem.quantity',
                    product: {
                      name: '$$cartItem.product.name',
                      category: '$$cartItem.product.category',
                      article: '$$cartItem.product.article',
                      description: '$$cartItem.product.description',
                      aboutProduct: '$$cartItem.product.aboutProduct',
                      color: '$$cartItem.product.color',
                      quantity: '$$cartItem.product.quantity',
                      price: '$$cartItem.product.price',
                      image: '$$cartItem.product.image',
                      picture: '$$cartItem.product.picture'
                    }
                  }
                }
              }
            }
          }
        ];

        const [enrichedUser] = await db.collection('users').aggregate(pipeline).toArray()


        res.end(JSON.stringify(enrichedUser))
      } else {
        res.writeHead(400).end(JSON.stringify({ error: "Login or password is incorrect" }))
      }
    }
  },

  async 'PUT:to-wish-list'({ req, res, payload }) {
    const { article } = payload

    await updateWishlist(req, res, article)
  },

  async 'PUT:to-cart'({ req, res, payload }) {
    const { article } = payload

    await updateCart(req, res, article)
  },

  async 'PUT:view'({req, res, payload}) {
    const { article } = payload
    await updateViews(req, res, article)
  },

  async 'POST:quantity-in-cart'({db, res, payload}) {
    const { article, quantity } = payload
    
    await updateQuantityInCart(db, res, article, quantity)
  },

}



for (const cat in categoryEndpoints) endpoints['GET:' + cat] = category

async function category({ db, res, params, pageSize, endpoint }) {
  const category = categoryEndpoints[endpoint.replace('GET:', '')]
  const query = params.query
  const page = +params.page || 1
  const color = params.color || ''
  const min = +params.min || 0
  const max = +params.max || Infinity
  const sort = params.sort
  const dir = params.dir
  const data = await getProducts({ db, query, pageSize, page, category, color, min, max, sort, dir })
  res.end(JSON.stringify(data))
}

module.exports = { endpoints }


