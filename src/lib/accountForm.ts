import { z } from "zod";

/**
 * Shared validation for the account name/email used by both the signup and
 * settings forms. Messages are passed in so they can be localized at the call
 * site (next-intl `t`). Email is optional but must be valid when provided.
 */
export function accountSchema(msg: { nameRequired: string; emailInvalid: string }) {
  return z.object({
    name: z.string().trim().min(1, { message: msg.nameRequired }),
    email: z
      .string()
      .trim()
      .refine((v) => v === "" || z.email().safeParse(v).success, { message: msg.emailInvalid }),
  });
}

export type AccountFormValues = z.infer<ReturnType<typeof accountSchema>>;
