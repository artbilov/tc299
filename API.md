Products API:
GET /products[?page={number}] - products page by page, response body like {page, totalProducts, totalPages, results[]}
GET /product?article={product_article} - get specific product by article
POST /product - add new product (for Admin user only, *now this check is switched off, so everybody could add product into the database. *property "article" should be unique)

GET /search?query={partial_characters} - partial search in text fields
GET /search?prop1={exact_value}[&prop2={exact_value}&...] - search by any combination of field/value pairs
GET /search?min={number}&max={number} - filtering by price from min price to max price
  min&max could be combined with query or props

Users API:
POST /user - add new user (email, password, first, last should be nessessary parameters)
GET /users - temporary API-call to get all users ans see how the objects looks like. To be able to use it in the GET /user call for tests.
POST /login - get specific user by login (for Login purposes, there is a password check to get user) User will come from DB as is (*testing version, not for production)



await fetch('https://tc299.onrender.com/user', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({first: "artbilov9", last: "ssssss", password: "111", email: "asd@asd.ci"})
})


await fetch('http://localhost:1234/user', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({first: "artbilov9", last: "ssssss", password: "111", email: "asd@asd.ci"})
})




