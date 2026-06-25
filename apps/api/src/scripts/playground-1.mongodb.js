// MongoDB Playground
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.

// The current database to use.
use("itr-app");

db.users.find(
  { pan: "BIGPK1248H" }  
)

db.cafirms.find(
  { firmName: 'ABC' }  
)

db.cafirms.insertMany([
  {
    firmName: "ABC",
    pan: "BIGPK1248H"
  },
  {
    firmName: "XYZ",
    pan: "BIGPK1248H"
  }, 
  {
    firmName: "DEF",
    pan: "BIGPK1248H"
  }

])

// db.users.updateOne(
//   { pan: "BIGPK1248H" },
//   { $set: { role: "platform_admin" } }
// )

