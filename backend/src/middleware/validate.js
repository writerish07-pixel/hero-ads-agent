'use strict';

/**
 * Factory that returns an Express middleware which validates req.body
 * against the supplied Joi schema.
 *
 * @param {import('joi').ObjectSchema} schema - Joi schema to validate against
 * @param {'body'|'query'|'params'} [target='body'] - Request property to validate
 * @returns {import('express').RequestHandler}
 */
const validate = (schema, target = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[target], {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      details: error.details.map((d) => d.message),
    });
  }

  // Replace the original value with the sanitised / coerced value from Joi
  req[target] = value;
  next();
};

module.exports = validate;
