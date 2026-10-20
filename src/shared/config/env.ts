import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().url(),
  // JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  CORS_ORIGIN: z.string().default("*"),
  SMTP_HOST: z.string().default("mail.3qfacility.com"),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_SECURE: z.coerce.boolean().default(true),
  SMTP_USER: z.string().default("info@3qfacility.com"),
  SMTP_PASS: z.string().default("2021@g8021A"),
  SMTP_FROM: z.string().default('"3Q Facility" <info@3qfacility.com>'),
  CEO_EMAIL: z.string().default("ceo@3qfacility.com"),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;

export const isDevelopment = env.NODE_ENV === "development";
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
