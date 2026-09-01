import {
  ExceptionFilter,
  Catch,
  NotFoundException,
  ArgumentsHost,
} from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';

@Catch(NotFoundException)
export class SpaFilter implements ExceptionFilter {
  catch(exception: NotFoundException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<any>();

    if (request.url.startsWith('/api')) {
      // If it's an API route, send the standard 404 JSON response
      return response.status(404).json(exception.getResponse());
    }

    // Otherwise, serve the SPA index.html
    response.sendFile(join(process.cwd(), 'frontend', 'dist', 'index.html'));
  }
}
