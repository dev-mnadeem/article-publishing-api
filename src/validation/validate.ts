import { Schema, ValidationError } from 'yup';

import { BadRequestError } from '../errors/apiError';

/**
 * Yup is used in `strict`-ish mode here: unknown keys are stripped and the
 * parsed value is what the caller gets back. The first version validated the
 * raw body and then read the *unvalidated* body, so coercion and trimming
 * silently did nothing.
 */
export const validate = async <T>(schema: Schema<T>, value: unknown): Promise<T> => {
  try {
    return await schema.validate(value, { abortEarly: true, stripUnknown: true });
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new BadRequestError(error.errors[0] ?? error.message);
    }
    throw error;
  }
};
