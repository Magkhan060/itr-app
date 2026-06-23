import { z } from "zod";

export const acceptClientInviteSchema = z.object({
  pan: z
    .string()
    .transform((v) => v.toUpperCase().trim())
    .refine((v) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v), {
      message: "Invalid PAN format (e.g. ABCDE1234F)",
    }),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
});
