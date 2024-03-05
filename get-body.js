
async function getBody(req) {
  let body = '';
  for await (const chunk of req) body += chunk;
  return body;
}
exports.getBody = getBody;
