import { config } from 'dotenv';
import { resolve } from 'path';

// Cargar .env antes de cualquier import de NestJS/Prisma
config({ path: resolve(__dirname, '..', '.env'), quiet: true });

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { JsonLogger } from './common/json-logger';

const esProduccion = process.env.NODE_ENV === 'production';
const logger = new Logger('Bootstrap');

/**
 * En producción el proceso no debe arrancar con configuración incompleta.
 * Falla rápido con un mensaje JSON para que el orquestador lo muestre.
 */
function validarEntorno(): void {
  if (!esProduccion) {
    return;
  }

  const obligatorias = ['JWT_SECRET', 'DATABASE_URL'];
  const faltantes = obligatorias.filter((clave) => !process.env[clave]?.trim());

  if (!faltantes.length) {
    return;
  }

  process.stderr.write(
    `${JSON.stringify({
      time: new Date().toISOString(),
      level: 'fatal',
      context: 'Bootstrap',
      message: `Variables de entorno obligatorias faltantes: ${faltantes.join(', ')}`,
    })}\n`,
  );

  process.exit(1);
}

/**
 * Orígenes permitidos para CORS.
 * Se configuran con CORS_ORIGINS (lista separada por comas) para poder
 * habilitar el frontend desplegado (ej. Vercel) sin tocar el código.
 */
function corsOrigins(): string[] {
  const configured = process.env.CORS_ORIGINS?.trim();

  if (!configured) {
    return ['http://localhost:3000', 'http://localhost:3001'];
  }

  return configured
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap() {
  validarEntorno();

  const app = await NestFactory.create(
    AppModule,
    esProduccion ? { logger: new JsonLogger() } : {},
  );

  // Cierra Prisma y los recursos de Nest ante SIGTERM/SIGINT (App Runner, Docker).
  app.enableShutdownHooks();

  // Headers de seguridad y compresión de respuestas.
  app.use(helmet());
  app.use(compression());

  // Habilitar CORS para los orígenes configurados
  const origins = corsOrigins();
  app.enableCors({
    origin: origins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Validación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Prefijo global (los controladores ya definen api/v1)
  const port = process.env.PORT || 3000;

  // 0.0.0.0 para que funcione en contenedores/plataformas de deploy
  await app.listen(port, '0.0.0.0');

  logger.log(`Backend corriendo en el puerto ${port}`);
  logger.log(`Orígenes CORS permitidos: ${origins.join(', ')}`);
  logger.debug(
    'Endpoints: auth, profile, disciplines, courts, time-slots, reservations, equipment, equipment-rentals, payments, audit-logs',
  );
}

bootstrap();
