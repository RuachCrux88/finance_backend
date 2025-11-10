import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get() // GET /api
  root() {
    return { ok: true, service: 'finance-backend' };
  }

  @Get('health') // GET /api/health
  health() {
    return { status: 'ok' };
  }
}
