import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  // Evita el error de tipos con 'beforeExit'
  async enableShutdownHooks(app: INestApplication): Promise<void> {
    // @ts-expect-error – forzamos el tipo por incompatibilidad entre versiones
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }
}
