import { z } from "zod";

export const registerSchema = z.object({
  pan: z
    .string()
    .transform((v) => v.toUpperCase().trim())
    .refine((v) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v), {
      message: "Invalid PAN format (e.g. ABCDE1234F)",
    }),
  fullName: z.string().min(3, "Full name must be at least 3 characters").trim(),
  email: z.string().email("Invalid email address"),
  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
  dateOfBirth: z.string().optional(),
  role:        z.enum(["user", "ca"]).default("user"),
  caFirmName:  z.string().trim().optional(),
  caMemberNo:  z.string().trim().optional(),
});

export const loginSchema = z.object({
  pan: z
    .string()
    .transform((v) => v.toUpperCase().trim())
    .refine((v) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v), {
      message: "Invalid PAN format",
    }),
  password: z.string().min(1, "Password is required"),
});
