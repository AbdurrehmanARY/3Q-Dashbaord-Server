import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().url(),
  // JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  CORS_ORIGIN: z.string().default("*"),
  // SUPABASE_URL: z.string().refine((val) => val === "" || z.string().url().safeParse(val).success, {
  //   message: "Invalid url",
  // }).optional().default(""),
  // SUPABASE_ANON_KEY: z.string().optional().default(""),
  // JWT_AUD: z.string().optional().default(""),
  // JWT_ISS: z.string().optional().default(""),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;

export const isDevelopment = env.NODE_ENV === "development";
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
