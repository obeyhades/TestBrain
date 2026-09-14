import { z } from 'zod';

export const registerSchema = z.object({
  email: z.email().max(255),
  name: z.string().trim().min(1).max(100),
  // Long passphrases beat short complex passwords, so the only rule is length.
  // The upper bound exists so nobody can make the server hash a megabyte of text.
  password: z.string().min(12, 'Password must be at least 12 characters').max(200),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email(),
  // No length rule here: the only thing that matters is whether it matches.
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
