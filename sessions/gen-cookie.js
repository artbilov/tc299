function genCookie(name, value, days = 0, hours = 0, minutes = 0) {
  if (!days && !hours && !minutes) days = 1
  const milliseconds = ((days * 24 + hours) * 60 + minutes) * 60 * 1000
  const expire = Date.now() + milliseconds
  const cookie = name + '=' + value + '; path=/; expires=' + new Date(expire).toUTCString()
  return { cookie, expire }
}
exports.genCookie = genCookie;