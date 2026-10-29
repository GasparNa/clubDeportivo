import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/v1')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        servicio: 'club-deportivo-api',
        db: 'down',
        timestamp: new Date().toISOString(),
      });
    }

    return {
      status: 'ok',
      servicio: 'club-deportivo-api',
      db: 'up',
      timestamp: new Date().toISOString(),
    };
  }
}
