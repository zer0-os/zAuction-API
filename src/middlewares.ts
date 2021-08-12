import express from "express";
import { isProduction } from "./util";

export function notFound(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  res.status(404);
  const error = new Error(`🔍 - Not Found - ${req.originalUrl}`);
  next(error);
}

/* eslint-disable no-unused-vars */
export function errorHandler(
  err: Error,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  /* eslint-enable no-unused-vars */
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  console.error(err.message, err.stack);
  res.status(statusCode).json({
    message: err.message,
    stack: isProduction() ? undefined : err.stack,
  });
}
