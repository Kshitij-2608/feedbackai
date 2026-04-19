import { HttpError } from "../lib/http-error.js";

export function validate(schema, picker = (req) => req.body) {
  return function validationMiddleware(req, _res, next) {
    const result = schema.safeParse(picker(req));

    if (!result.success) {
      return next(new HttpError(400, "Validation failed", result.error.flatten()));
    }

    req.validated = result.data;
    next();
  };
}
