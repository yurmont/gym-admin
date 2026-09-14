import {
  INestApplication,
  UnprocessableEntityException,
  ValidationPipe,
} from "@nestjs/common";
import helmet from "helmet";
import { ApiExceptionFilter } from "./common/filters/api-exception.filter";
import { requestLogging } from "./common/logging/request-logging.middleware";

export function configureApplication(app: INestApplication, origins: string[]) {
  app.use(helmet());
  app.enableCors({
    origin: origins,
    allowedHeaders: ["Authorization", "Content-Type"],
    exposedHeaders: ["X-Request-ID"],
  });
  app.use(requestLogging);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: () =>
        new UnprocessableEntityException("Revisa los datos enviados."),
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
}
