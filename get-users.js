
async function getUsers(db, pageSize, page) {
  const skip = (page - 1) * pageSize;

  const pipeline = [
    {
      $facet: {
        totalUsers: [
          { $count: 'amount' },
        ],

        users: [
          { $skip: skip },
          { $limit: pageSize }
        ]
      }
    }
  ];

  const [result] = await db.collection('users').aggregate(pipeline).toArray();
  const { users, totalUsers: [{ amount }] } = result;
  const data = { page, totalPages: Math.ceil(amount / pageSize), totalUsers: amount, results: users };
  console.log(data);
  return data;
}
exports.getUsers = getUsers;
