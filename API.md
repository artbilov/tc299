Products API:
GET /products[?page={number}] - products page by page, response body like {page, totalProducts, totalPages, minPrice, maxPrice, results[]}
GET /product?article={product_article} - get specific product by article
POST /product - add new product (for Admin user only, *now this check is switched off, so everybody could add product into the database.)

Products by Category - API:
NOTE: Response comes as an object with number of all products from specific category, numbers with a min and a max prices of all products in this category, and results with 9 products, number of pages, current page number (page=1 set by default) 
GET /candles[?page={number}] - all products from the category "candles"
GET /lighting-decor[?page={number}] - all products from the category "Lighting Decor"
GET /gift-sets[?page={number}] - all products from the category "Gift Sets"
GET /get-warm[?page={number}] - all products from the category "Get Warm"
GET /table-games[?page={number}] - all products from the category "Table Games"
GET /books-and-journals[?page={number}] - all products from the category "Books & Journals"


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




