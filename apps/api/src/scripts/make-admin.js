import mongoose from "mongoose";
import User     from "../modules/auth/auth.model.js";
import { env }  from "../config/env.js";

await mongoose.connect(env.mongoUri);
const pan = process.argv[2];
if (!pan) { console.log("Usage: node make-admin.js YOURPAN"); process.exit(1); }
const user = await User.findOneAndUpdate({ pan }, { $set: { role: "admin" } }, { new: true });
console.log(user ? `✅ ${user.fullName} is now admin` : "❌ User not found");
process.exit(0);
