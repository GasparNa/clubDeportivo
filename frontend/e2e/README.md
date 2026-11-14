# Frontend E2E Tests - Club Deportivo

## Descripción
Tests end-to-end (e2e) usando Playwright para validar el flujo completo del frontend del Club Deportivo.
Los tests verificación el flujo de autenticación, creación de reservas y cancelación de reservas.

## Requisitos previos

1. **Stack local corriendo**: el frontend debe estar en `http://localhost:3000` y la API NestJS en `http://localhost:3001/api/v1`.
   - Levantar desde la raíz con `docker compose up -d --build`.
   - También se puede iniciar cada servicio por separado durante el desarrollo.
   - Requiere PostgreSQL con el schema `esquema-final.sql` migrado

2. **Variables de entorno**: Copiar `.env.example` y configurar:

   ```env
   # URL base de la API (usada por el frontend y Playwright)
   NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1

   # Credenciales de un socio ACTIVO (necesario para los tests e2e)
   # Nota: el seed actual no incluye un socio con estado ACTIVO.
   # Para crear uno, se puede registrar un nuevo usuario y aprobarlo manualmente en la BD,
   # o insertar directamente un usuario con estado ACTIVO.
   SOCIO_EMAIL=usuario@ejemplo.com
   SOCIO_PASSWORD=contraseña_segura

   # Opcional: puertos personalizados
   # DEPLOY_HOST=...
   # JWT_SECRET=...
   ```

3. **Navegadores de Playwright**: Ya instalados (`pnpm exec playwright install` en `frontend/`)

## Instalación

```bash
# 1. Instalar dependencias del frontend (ya incluye @playwright/test)
pnpm install

# 2. Verificar que los browsers de Playwright estén descargados
pnpm exec playwright install

# 3. Asegurarse de que el backend esté corriendo en localhost:3001
```

## Ejecución de tests

```bash
# Ejecutar todos los tests e2e
pnpm test:e2e:playwright

# Ejecutar en modo headless (predeterminado)
pnpm test:e2e

# Ejecutar en modo debug (abre el browser)
pnpm test:e2e:playwright:ui

# Ver reporte HTML después de ejecutar
pnpm test:e2e:show
```

## Estructura de tests

```
frontend/e2e/
├── playwright.config.ts    # Configuración de Playwright
├── fixtures/               # Helpers y utilidades para tests
│   ├── login.ts           # Login via API + inyección de token en localStorage
│   ├── reservation.ts     # Helpers para crear reservas (fechas >24h, slots, etc.)
│   └── cleanup.ts         # Limpieza de datos de prueba
└── tests/
    ├── login-socio.test.ts        # Test de login de socio
    ├── reserva-cancha.test.ts   # Test: reserva de cancha >24h
    └── cancelacion-reserva.test.ts # Test: cancelación con >24h anticipación
```

## Flujo de cada test

### 1. Login de socio (`login-socio.test.ts`)
- Intenta autenticar via API usando `SOCIO_EMAIL` y `SOCIO_PASSWORD`
- Si las credenciales no están definidas o el usuario no es ACTIVE, el test se hace skip con mensaje explicativo
- Inyecta el token en `localStorage` del browser
- Recarga la página y verifica que la UI muestra el estado autenticado
  (menú "Mis reservas", enlace "Cuenta", etc.)

### 2. Reserva de cancha (`reserva-cancha.test.ts`)
- Requiere autenticación previa (mismo patrón que login-socio)
- Navega a `/reservations/new`
- Obtiene disciplinas activas via API y selecciona una
- Selecciona una cancha de la disciplina elegida
- Calcula una fecha con más de 24h de anticipación (`reservationDateOffset(2)`)
- Carga franjas horarias disponibles para esa cancha/fecha
- Selecciona una franja disponible
- Marca el checkbox de confirmación
- Envía el formulario de reserva
- Verifica que la reserva aparece en `/my-reservations` con estado `CONFIRMADA`
- **Cada test crea su propia reserva** (autocontenido), por lo que pueden ejecutarse en cualquier orden y repetirse

### 3. Cancelación de reserva (`cancelacion-reserva.test.ts`)
- Requiere autenticación previa
- Navega a `/my-reservations`
- Crea una reserva nueva (mismo flujo que `reserva-cancha.test.ts`) con fecha >24h
- Verifica que el botón "Cancelar" es visible (solo para CONFIRMADA + AUTOGESTIONADA)
- Hace clic en "Cancelar"
- Verifica que el estado cambia a `CANCELADA` o la reserva es removida de la lista
- **Autocontenido**: crea y cancela su propia reserva, independiente del test de reserva

## Limitaciones importantes

1. **Seed sin socio ACTIVO**: El estado actual de la base de datos (seed) no incluye un usuario con `estado = ACTIVO`.
   - Los tests utilizan variables de entorno `SOCIO_EMAIL` y `SOCIO_PASSWORD`
   - Si estas no están definidas O el usuario no tiene estado ACTIVE, los tests se omiten (`test.skip`) con un mensaje documentando la limitación
   - Para ejecutar los tests: crear un socio ACTIVO en la BD o definir credenciales de uno existente

2. **Dependencia del backend**: Los tests hacen llamadas reales a la API REST (`/auth/login`, `/disciplines`, `/courts`, `/time-slots/availability`, `/reservations`, `/my-reservations`).
   - El backend debe estar corriendo y accesible en la URL configurada en `NEXT_PUBLIC_API_URL`

3. **Tests autocontenidos**: Cada test (reserva y cancelación) crea su propia datos de prueba y los limpia al finalizar.
   - Los tests pueden repetirse dos veces seguidas (`pnpm test:e2e` && `pnpm test:e2e`)
   - No dependen de datos pre-existentes en la BD

4. **No se modifican tablas ni triggers de BD**: Los tests solo usan la API pública del frontend.
   - No se ejecutan SQLs directos contra la base de datos
   - La cancelación aprovecha los triggers existentes del backend (`trg_actualizar_reserva`)

## Comandos útiles

```bash
# Ver qué tests se ejecutarán (lista de files)
pnpm exec playwright test --list-tests

# Ejecutar un test específico por nombre
pnpm exec playwright test -g "debería reservar una cancha"

# Ejecutar con más traza/debug
pnpm test:e2e:debug

# Ver el reporte HTML generado
pnpm test:e2e:show
# (abre ./playwright-report/index.html)
```