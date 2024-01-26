const fs = require('fs')
const source = fs.readFileSync("./hygge-list.csv", 'utf-8')
console.log(source)
const [headers, ...records] = source.split('\r\n').map(line => line.split(';').slice(0, 7)).slice(0, -1)

const result = records.map(values => Object.fromEntries(values.map((value, i) => [headers[i], value])))
fs.writeFileSync('./data.json', JSON.stringify(result, null, 2))

