// MongoDB Playground
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.

// The current database to use.
use("itr-app");

db.users.updateOne(
  { pan: "BIGPK1248H" },
  { $set: { role: "platform_admin" } }
)

