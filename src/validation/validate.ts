import { Schema, ValidationError } from 'yup';

import { BadRequestError } from '../errors/apiError';

/**
 * Unknown keys are stripped and the parsed value is what the caller gets back,
 * so trimming, lower-casing and number coercion actually reach the handlers.
 *
 * Express 5 leaves `req.body` undefined when a request carries no JSON body,
 * and yup passes `undefined` through an optional object schema without
 * checking its required fields, so a missing value is validated as `{}`.
 */
export const validate = async <T>(schema: Schema<T>, value: unknown): Promise<T> => {
  try {
    return await schema.validate(value ?? {}, { abortEarly: true, stripUnknown: true });
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new BadRequestError(error.errors[0] ?? error.message);
    }
    throw error;
  }
};
