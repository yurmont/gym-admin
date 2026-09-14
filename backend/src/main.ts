import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { configureApplication } from "./application";
import { JsonLogger } from "./common/logging/json.logger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: new JsonLogger() });
  const config = app.get(ConfigService);
  configureApplication(
    app,
    config
      .getOrThrow<string>("CORS_ORIGINS")
      .split(",")
      .map((s) => s.trim()),
  );
  await app.listen(config.getOrThrow<number>("PORT"), "0.0.0.0");
}
void bootstrap();
