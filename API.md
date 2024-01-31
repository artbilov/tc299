GET /products - get all products
GET /products?ofset={number}&count={number} - pagination parameters
GET /product?article={product_article} - get specific product by article
POST /product - add new product (for Admin user only, *now this check is switched off, so everybody could add product into the database. *property "article" should be unique)

GET /search?query={partial_characters} - partial search in text fields
GET /search?prop1={exact_value}[&prop2={exact_value}&...] - search by any combination of field/value pairs
GET /serach?min={number}&max={number} - filtering by price from min price to max price
  min&max could be combined with query or props

POST /user - add new user
