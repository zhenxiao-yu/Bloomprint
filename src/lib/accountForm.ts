import { z } from "zod";
import { ACCOUNT_ROLES, MAX_BIO_LENGTH } from "@/lib/accountStore";

/**
 * Shared validation for the account profile used by both the signup and settings
 * forms. Messages are passed in so they can be localized at the call site (next-intl
 * `t`). Email is optional but must be valid when provided; role and bio are optional
 * (the settings form collects them, signup leaves them blank).
 */
export function accountSchema(msg: { nameRequired: string; emailInvalid: string }) {
  return z.object({
    name: z.string().trim().min(1, { message: msg.nameRequired }),
    email: z
      .string()
      .trim()
      .refine((v) => v === "" || z.email().safeParse(v).success, { message: msg.emailInvalid }),
    role: z.enum(ACCOUNT_ROLES).or(z.literal("")).optional(),
    bio: z.string().trim().max(MAX_BIO_LENGTH).optional(),
  });
}

export type AccountFormValues = z.infer<ReturnType<typeof accountSchema>>;
