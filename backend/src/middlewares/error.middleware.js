export function notFoundHandler(req, res) {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
}

export function errorHandler(error, _req, res, _next) {
  const status = error.status || 500;

  if (status >= 500) {
    console.error("[Error]", error);
  }

  // Handle Prisma-specific errors with friendly messages
  let message = error.message || "Something went wrong";

  if (error.code === "P2002") {
    message = "An account with this email already exists.";
  } else if (error.code === "P1001" || error.code === "P1008") {
    message = "Database is temporarily unavailable. Please try again.";
  } else if (error.code && error.code.startsWith("P")) {
    // Other Prisma errors — don't leak internal code to client
    message = "A database error occurred. Please try again.";
  }

  // Always send a string — never let an object reach the client's error field
  res.status(status).json({
    error: typeof message === "string" ? message : "An unexpected error occurred",
    ...(error.details && { details: error.details }),
  });
}
