import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const isProduction = process.env.NODE_ENV === "production";

    const publicMessage = isHttp ? exception.message : "Internal server error";
    const details = exception instanceof Error ? exception.message : "unknown error";

    this.logger.error(`${request.method} ${request.url} -> ${status} ${publicMessage}`);
    if (!isHttp) {
      this.logger.error(details);
    }

    response.status(status).json({
      statusCode: status,
      message: publicMessage,
      path: request.url,
      ...(isProduction || isHttp
        ? {}
        : { error: details }),
    });
  }
}
