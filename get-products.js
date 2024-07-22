
async function getProducts({db, query, pageSize, page, category, color, min, max, sort, dir}) {
  const skip = (page - 1) * pageSize;

  console.log('query: ' + JSON.stringify(query, null, 2))
  

  const $regex = new RegExp((query || "").replace(/([^a-zA-Z0-9])/g, "\\$1"))


  const pipeline = [
    {
      $match: {
        ...query ? { name: { $regex, $options: "i" } } : {},
        ...category ? { category } : {},
        ...color ? { color: Array.isArray(color) ? { $in: color } : color } : {},
        price: { $gte: min, $lte: max }
      }
    },
    ...sort ? [{ $sort: { [sort]: dir == 'desc' ? -1 : 1 } }] : [],
    {
      $facet: {
        totalProducts: [
          { $count: 'amount' },
        ],
        prices: [
          {
            $group: {
              _id: null,
              minPrice: { $min: '$price' },
              maxPrice: { $max: '$price' }
            }
          },
        ],
        products: [
          { $skip: skip },
          { $limit: pageSize },
          {
            $project: {
              _id: 0,
              __v: 0,
            }
          }
        ],
      }
    }
  ];

  const [result] = await db.collection('products').aggregate(pipeline).toArray();
  const { products, totalProducts: [{ amount } = {}], prices: [{ minPrice, maxPrice } = {}] } = result;
  const data = { page, totalProducts: amount, totalPages: Math.ceil(amount / pageSize), minPrice, maxPrice, results: products };
  // console.log(data);
  return data;
}
exports.getProducts = getProducts;
