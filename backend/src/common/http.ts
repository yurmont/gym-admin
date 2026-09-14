import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Injectable,
  LoggerService,
  UnprocessableEntityException,
} from "@nestjs/common";
import type { Response } from "express";
import { randomUUID } from "node:crypto";
import type { ZodTypeAny, output } from "zod";
import type { AuthRequest } from "../auth/auth";

export class JsonLogger implements LoggerService {
  log(message: unknown) {
    this.write("INFO", message);
  }
  error(message: unknown) {
    this.write("ERROR", message);
  }
  warn(message: unknown) {
    this.write("WARNING", message);
  }
  debug(message: unknown) {
    this.write("DEBUG", message);
  }
  verbose(message: unknown) {
    this.write("DEBUG", message);
  }
  private write(severity: string, message: unknown) {
    process.stdout.write(
      JSON.stringify({
        severity,
        message: typeof message === "string" ? message : "Application event",
      }) + "\n",
    );
  }
}
export function success<T>(data: T, message = "Operación completada") {
  return { success: true, message, data };
}
export function parse<T extends ZodTypeAny>(
  schema: T,
  input: unknown,
): output<T> {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new UnprocessableEntityException({
      message: "Revisa los datos enviados.",
      errors: result.error.flatten().fieldErrors,
    });
  return result.data;
}

@Catch()
@Injectable()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const request = host.switchToHttp().getRequest<AuthRequest>();
    const response = host.switchToHttp().getResponse<Response>();
    const kind = (error as { type?: string; code?: string } | null)?.type;
    const code = (error as { code?: string } | null)?.code;
    const status =
      error instanceof HttpException
        ? error.getStatus()
        : kind === "entity.parse.failed"
          ? 400
          : kind === "entity.too.large"
            ? 413
            : code === "23505"
              ? 409
              : 500;
    const detail = error instanceof HttpException ? error.getResponse() : null;
    const body =
      typeof detail === "object" && detail !== null
        ? (detail as { message?: string; errors?: unknown })
        : null;
    response.status(status).json({
      success: false,
      message:
        status >= 500
          ? "No se pudo completar la operación. Intenta nuevamente."
          : status === 409
            ? "Ya existe un registro con esos datos"
            : (body?.message ?? detail ?? "Solicitud no válida"),
      data: null,
      ...(body?.errors ? { errors: body.errors } : {}),
    });
    if (status >= 500)
      process.stdout.write(
        JSON.stringify({
          severity: "ERROR",
          message: "Request failed",
          request_id: request.requestId,
          operation: request.method,
          endpoint: request.route?.path ?? "unmatched",
          user_id: request.user?.id,
          tenant_id: request.user?.tenant,
          error_type: error instanceof Error ? error.name : "UnknownError",
        }) + "\n",
      );
  }
}

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
