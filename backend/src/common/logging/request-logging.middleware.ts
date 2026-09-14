import { AuthRequest } from "../../modules/auth/auth.types";
import { Response } from "express";
import { randomUUID } from "node:crypto";

export function requestLogging(
  request: AuthRequest,
  response: Response,
  next: () => void,
) {
  request.requestId = randomUUID();
  response.setHeader("X-Request-ID", request.requestId);
  const start = Date.now();
  response.on("finish", () =>
    process.stdout.write(
      JSON.stringify({
        severity: response.statusCode >= 500 ? "ERROR" : "INFO",
        message: "HTTP request",
        request_id: request.requestId,
        endpoint: request.route?.path ?? "unmatched",
        operation: request.method,
        status: response.statusCode,
        duration_ms: Date.now() - start,
        user_id: request.user?.id,
        tenant_id: request.user?.tenant,
      }) + "\n",
    ),
  );
  next();
}
