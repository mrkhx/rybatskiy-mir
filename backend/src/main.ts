import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { RequestLoggingInterceptor } from "./common/interceptors/request-logging.interceptor";
import { APP_ENV, type AppEnv } from "./config/env";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const env = app.get<AppEnv>(APP_ENV);

  app.enableCors({
    origin: [env.frontendOrigin, env.adminOrigin],
    credentials: false,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new RequestLoggingInterceptor());

  await app.listen(env.port, "0.0.0.0");
  const logger = new Logger("Bootstrap");
  logger.log(`Backend listening on ${env.port} (${env.nodeEnv})`);
}

void bootstrap();
