export function notFoundHandler(req, res) {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
}

export function errorHandler(error, _req, res, _next) {
  const status = error.status || 500;

  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({
    error: error.message || "Something went wrong",
    details: error.details || undefined,
  });
}
