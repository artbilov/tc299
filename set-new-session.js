const { genCookie } = require('./gen-cookie.js');
const { genToken } = require('./gen-token.js');


async function setNewSession(db, res) {
  const token = genToken();
  const cookieValue = genCookie('token', token, 7);
  res.setHeader('Set-Cookie', cookieValue);
  const session = { token, userId: null, inCart: [], wishList: [] };
  const result = await db.collection('sessions').insertOne(session).catch(err => { console.log(err) });
  console.log(result.insertedId);
  res.end(JSON.stringify({ token }));
}
exports.setNewSession = setNewSession;
