import { config } from 'dotenv';
import { resolve } from 'path';

// Cargar .env antes de cualquier import de NestJS/Prisma
config({ path: resolve(__dirname, '..', '.env'), quiet: true });

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { validarJwtSecret } from './auth/jwt.config';
import { JsonLogger } from './common/json-logger';

const esProduccion = process.env.NODE_ENV === 'production';
const logger = new Logger('Bootstrap');

export function validarEntorno(): void {
  const obligatorias = ['JWT_SECRET', 'DATABASE_URL'];
  const faltantes = obligatorias.filter((clave) => !process.env[clave]?.trim());
  const problemas = [...faltantes];

  if (!faltantes.includes('JWT_SECRET')) {
    const motivo = validarJwtSecret(process.env.JWT_SECRET);

    if (motivo) {
      problemas.push(`JWT_SECRET inválido: ${motivo}`);
    }
  }

  if (!problemas.length) {
    return;
  }

  const mensaje = `Variables de entorno obligatorias faltantes o inválidas: ${problemas.join(', ')}`;

  if (!esProduccion) {
    throw new Error(mensaje);
  }

  process.stderr.write(
    `${JSON.stringify({
      time: new Date().toISOString(),
      level: 'fatal',
      context: 'Bootstrap',
      message: mensaje,
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

  app.getHttpAdapter().getInstance().set('trust proxy', 1);

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

if (require.main === module) {
  void bootstrap();
}
