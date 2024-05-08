
async function getProducts(db, pageSize, page, category, color, min, max, sort, dir) {
  const skip = (page - 1) * pageSize;

  const pipeline = [
    {
      $match: {
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
          { $limit: pageSize }
        ]
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
