import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError,
    host: ArgumentsHost
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof Prisma.PrismaClientValidationError) {
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid request payload.'
      });
      return;
    }

    const { statusCode, message } = this.mapKnownError(exception);

    if (statusCode >= 500) {
      this.logger.error(exception.message, exception.stack);
    }

    response.status(statusCode).json({
      statusCode,
      message
    });
  }

  private mapKnownError(exception: Prisma.PrismaClientKnownRequestError) {
    switch (exception.code) {
      case 'P2002': {
        const target = Array.isArray(exception.meta?.target)
          ? exception.meta?.target.join(', ')
          : (exception.meta?.target as string | undefined);

        return {
          statusCode: HttpStatus.CONFLICT,
          message: target
            ? `A record with the same ${target} already exists.`
            : 'A record with the same unique fields already exists.'
        };
      }
      case 'P2003':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Related record is missing or invalid.'
        };
      case 'P2011':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'A required field is missing.'
        };
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Record not found.'
        };
      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error'
        };
    }
  }
}
