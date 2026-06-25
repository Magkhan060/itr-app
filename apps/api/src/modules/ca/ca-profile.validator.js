import { z } from "zod";

// Every field is optional and emailConfig/smsConfig are intentionally
// `.partial()` — the service merges whatever's submitted with the firm's
// previously-stored decrypted config (see ca-profile.service.js), so a CA
// can rotate just the SMTP password without retyping host/user/fromAddress
// every time, the same "leave blank = unchanged" ergonomics as the
// pre-existing caItdApiKey field. The service enforces that the merged
// result has every required field before encrypting+storing it — that's
// where "host is actually required when provider=smtp" gets checked, not
// here. Nothing here was validated at all before (the route passed
// req.body straight through); this is additive safety, not a behavior change.

const smtpConfigSchema = z.object({
  host:        z.string().min(1).optional(),
  port:        z.coerce.number().int().min(1).max(65535).optional(),
  secure:      z.boolean().optional(),
  user:        z.string().min(1).optional(),
  pass:        z.string().min(1).optional(),
  fromAddress: z.string().email("Invalid from-address").optional(),
  fromName:    z.string().optional(),
});

const msg91ConfigSchema = z.object({
  apiKey:   z.string().min(1).optional(),
  senderId: z.string().min(1).optional(),
  route:    z.string().optional(),
});

export const updateCAProfileSchema = z.object({
  caFirmName:      z.string().optional(),
  caMemberNo:      z.string().optional(),
  caItdApiBaseUrl: z.string().optional(),
  caItdApiKey:     z.string().optional(),

  emailProvider: z.enum(["platform", "smtp"]).optional(),
  emailConfig:   smtpConfigSchema.optional(),

  smsProvider: z.enum(["platform", "msg91"]).optional(),
  smsConfig:   msg91ConfigSchema.optional(),
});
