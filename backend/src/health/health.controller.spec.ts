import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reporta db up cuando SELECT 1 responde', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    const controller = new HealthController(prisma as any);

    const result = await controller.check();

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ status: 'ok', db: 'up' });
  });

  it('responde 503 cuando la base de datos no responde', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('connection refused')),
    };
    const controller = new HealthController(prisma as any);

    await expect(controller.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
