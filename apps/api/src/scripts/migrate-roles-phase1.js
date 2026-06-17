/**
 * One-time Phase 1 migration: rename roles and introduce CAFirm.
 *
 *   user  -> taxpayer
 *   ca    -> ca_admin   (+ create a CAFirm document; move firm/ITD fields off User)
 *   admin -> platform_admin
 *
 * Idempotent — safe to run multiple times.
 * Run:  node apps/api/src/scripts/migrate-roles-phase1.js
 */

import mongoose from "mongoose";
import { env }  from "../config/env.js";
import CAFirm   from "../modules/ca/ca-firm.model.js";

await mongoose.connect(env.mongoUri);
const users = mongoose.connection.db.collection("users");

// 1. Rename simple roles
const renames = [
  { from: "user",  to: "taxpayer" },
  { from: "admin", to: "platform_admin" },
];
for (const { from, to } of renames) {
  const res = await users.updateMany({ role: from }, { $set: { role: to } });
  console.log(`  ${from} -> ${to}: ${res.modifiedCount} updated`);
}

// 2. Migrate CA users: role "ca" -> "ca_admin" + create a CAFirm per CA
const caUsers = await users.find({ role: "ca" }).toArray();
let firmsCreated = 0;

for (const u of caUsers) {
  let firm = await CAFirm.findOne({ adminUserId: u._id });
  if (!firm) {
    firm = await CAFirm.create({
      adminUserId:        u._id,
      firmName:            u.caFirmName        || null,
      icaiMemberNo:        u.caMemberNo        || null,
      itdApiBaseUrl:       u.caItdApiBaseUrl   || null,
      itdApiKeyEncrypted:  u.caItdApiKeyEncrypted || null,
    });
    firmsCreated++;
  }

  await users.updateOne(
    { _id: u._id },
    {
      $set:   { role: "ca_admin", caFirmId: firm._id },
      $unset: { caFirmName: "", caMemberNo: "", caItdApiBaseUrl: "", caItdApiKeyEncrypted: "" },
    }
  );
}
console.log(`  ca -> ca_admin: ${caUsers.length} updated, ${firmsCreated} CAFirm document(s) created`);

console.log("Migration complete.");
await mongoose.disconnect();
