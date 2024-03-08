exports.genToken = genToken;

function genToken() {
  let token = '';
  while (token.length < 43) {
    token += crypto.randomBytes(5).toString('hex');
    if (token.length < 43) token += '-';
  }
  return token;
}

const crypto = require('crypto')
