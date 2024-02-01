fetch('https://tc299.onrender.com/user', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({login: "artbilov", password: "123123aaa"})
})