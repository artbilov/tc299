module.exports = { genCookie }

function genCookie(name, value, days = 0, hours = 0, minutes = 0) {
  if (!days && !hours && !minutes) days = 1
  const milliseconds = ((days * 24 + hours) * 60 + minutes) * 60 * 1000
  const expire = new Date(Date.now() + milliseconds)
  const cookie = name + '=' + value + '; path=/; expires=' + expire.toUTCString() + '; Secure;'
  return cookie
}
