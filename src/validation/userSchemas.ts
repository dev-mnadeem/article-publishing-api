import { InferType, object, string } from 'yup';

export const signupSchema = object({
  name: string().trim().required().min(3).max(80),
  email: string().trim().lowercase().email().required(),
  password: string().required().min(8).max(72),
}).noUnknown();

export const loginSchema = object({
  email: string().trim().lowercase().email().required(),
  password: string().required(),
}).noUnknown();

export type SignupInput = InferType<typeof signupSchema>;
export type LoginInput = InferType<typeof loginSchema>;
