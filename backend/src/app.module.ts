import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { configuracionThrottle } from './auth/throttle.config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { InstalacionesModule } from './instalaciones/instalaciones.module';
import { ReservasModule } from './reservas/reservas.module';
import { PagosModule } from './pagos/pagos.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([configuracionThrottle()]),
    PrismaModule,
    AuthModule,
    UsuariosModule,
    InstalacionesModule,
    ReservasModule,
    PagosModule,
    HealthModule,
  ],
})
export class AppModule {}