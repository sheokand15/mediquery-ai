import { z } from "zod";
export const questionSchema = z.object({ question: z.string().trim().min(3).max(2000), documentIds: z.array(z.string().uuid()).max(50).optional() });
export const authSchema = z.object({ email: z.string().email().max(320), password: z.string().min(8).max(128) });

