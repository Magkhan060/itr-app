/**
 * One-time migration: drop the stale 3-field unique index on the filings collection.
 *
 * The old index  { userId, assessmentYear, itrType }  was created before the CA portal
 * was added.  It blocks CA filings for more than one client because all CA-prepared
 * returns share the same userId (the CA's own user ID).
 *
 * The correct 4-field index { userId, caClientId, assessmentYear, itrType } is defined
 * in filing.model.js and will be (re-)created automatically by Mongoose on next server
 * start — so no manual re-creation is needed here.
 *
 * Run once:
 *   node apps/api/src/scripts/fix-filing-index.js
 */

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/itr-app";
const STALE_INDEX = "userId_1_assessmentYear_1_itrType_1";

await mongoose.connect(MONGODB_URI);
const db = mongoose.connection.db;

const indexes = await db.collection("filings").indexes();
const exists  = indexes.some((idx) => idx.name === STALE_INDEX);

if (!exists) {
  console.log(`ℹ️  Index "${STALE_INDEX}" not found — nothing to do.`);
} else {
  await db.collection("filings").dropIndex(STALE_INDEX);
  console.log(`✅ Dropped stale index "${STALE_INDEX}" from filings collection.`);
  console.log("   Mongoose will recreate the correct 4-field index on next server start.");
}

await mongoose.disconnect();
