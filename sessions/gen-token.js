const crypto = require('crypto');

function genToken() {
  let token = '';
  while (token.length < 43) {
    token += crypto.randomBytes(5).toString('hex');
    if (token.length < 43) token += '-';
  }
  return token;
}
exports.genToken = genToken;
