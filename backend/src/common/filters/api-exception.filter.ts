import {
  Injectable,
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import { AuthRequest } from "../../modules/auth/auth.types";
import { Response } from "express";

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
