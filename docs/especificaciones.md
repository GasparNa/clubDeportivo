# Especificaciones del Proyecto - Club Deportivo

Análisis completo del estado actual del proyecto y lo que falta para comenzar el desarrollo.

## 1. Descripción General

**Proyecto:** Sistema de Reservas - Club Deportivo  
**Objetivo:** MVP para plataforma de reservas de canchas deportivas (Tenis, Fútbol, Pádel)  
**Enfoque:** API-First con OpenSpec para contratos de API  
**Estado actual:** Etapa inicial - Estructura definida, especificaciones en preparación

---

## 2. Stack Tecnológico Definido

| Capa | Tecnología | Estado |
|------|------------|--------|
| Frontend | Next.js, TypeScript | **No instalado** |
| Backend | NestJS, TypeScript | **No instalado** |
| Base de datos | PostgreSQL (Supabase) | **Esquema definido** |
| Especificación | OpenSpec | **Configurado** |
| CI/CD | GitHub Actions | **Configuración básica** |
| Gestor de paquetes | pnpm | **Instalado** |

---

## 3. Lo que Ya está Instalado/Configurado

### 3.1 Dependencias Principales
- **OpenSpec** (`@fission-ai/openspec: ^1.12.0`): Instalado en `package.json`
- **pnpm**: Gestor de paquetes configurado (ver `pnpm-lock.yaml`)

### 3.2 Estructura del Repositorio
```
club-deportivo/
├── backend/                    # Solo contiene db/ con esquemas SQL
├── docs/                       # Documentación del modelo de datos
├── openspec/                   # Especificaciones OpenSpec
├── .github/workflows/          # CI/CD básico
└── package.json                # Dependencias raíz
```

### 3.3 Base de Datos (Esquemas SQL Completos)
**Archivo principal:** `backend/db/esquema-final.sql` (1968 líneas)

**Tablas implementadas:**
- `personas` - Entidad raíz de identidad
- `contactos_persona` - Emails y teléfonos
- `direcciones_persona` - Direcciones físicas
- `usuarios` - Cuentas del sistema (socios, gerentes, administradores)
- `solicitudes_permiso` - Altas de socios
- `registros_auditoria` - Eventos del sistema (append-only)
- `disciplinas` - Catálogo deportivo
- `canchas` - Canchas por disciplina
- `franjas_horarias` - Grilla de turnos
- `equipamientos` - Artículos deportivos
- `reservas` - Reservas de canchas
- `detalle_alquiler_equipamiento` - Alquileres asociados

**Triggers implementados:**
- Validación de reserva (día de semana, estado cancha, usuario activo, máximo 2 reservas)
- Actualización de reservas (transiciones de estado, cancelación)
- Validación de alquiler de equipamiento (stock, disciplina, usuario)
- Gestión de devoluciones (incumplimientos, suspensiones)
- Auditoría automática de reservas
- Cancelación por mantenimiento de cancha

**Vistas:**
- `v_reservas_detalle` - Vista completa de reservas con información de canchas y personas

**Seguridad:**
- Row Level Security (RLS) habilitado en todas las tablas (políticas pendientes)
- `REVOKE UPDATE, DELETE ON registros_auditoria` (append-only)

### 3.4 Especificaciones OpenSpec
**Configuración:** `openspec/config.yaml` con schema spec-driven

**Cambios definidos (2 propuestas paralelas):**
1. `sports-club-reservation-api` - Propuesta API-First
2. `club-deportivo-reservas` - Propuesta completa

**Módulos especificados:**
- `gestion-usuarios-personas` - Registro, autenticación, perfil
- `gestion-instalaciones-horarios` - Disciplinas, canchas, franjas
- `gestion-reservas-turnos` - Reservas, alquiler equipamiento
- `pagos-auditoria-notificaciones` - Pagos, auditoría, notificaciones

### 3.5 Documentación
- `docs/modelo-datos.md` - Modelo conceptual y físico detallado
- `docs/bbdd.md` - Diagrama ER en Mermaid
- `backend/db/Auditoria.md` - Auditoría comparativa de esquemas

### 3.6 CI/CD
**Archivo:** `.github/workflows/ci.yml` (configuración básica)
- Trigger en push a main/develop
- Trigger en PR hacia main
- **Pendiente:** Definir pasos de validación

---

## 4. Lo que Falta Instalar/Configurar

### 4.1 Backend (NestJS)
**Estado:** No inicializado

**Acciones requeridas:**
```bash
# 1. Inicializar proyecto NestJS
cd backend
pnpm init
pnpm add @nestjs/core @nestjs/common @nestjs/platform-express rxjs reflect-metadata

# 2. Instalar dependencias de desarrollo
pnpm add -D typescript @types/node ts-node @nestjs/cli

# 3. Configurar TypeScript
npx tsc --init

# 4. Instalar cliente de base de datos
pnpm add @nestjs/config @nestjs/typeorm typeorm pg

# 5. Instalar validación y DTOs
pnpm add class-validator class-transformer

# 6. Instalar autenticación
pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt
pnpm add -D @types/passport-jwt
```

**Estructura sugerida:**
```
backend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── courts/
│   │   ├── reservations/
│   │   └── equipment/
│   ├── common/
│   │   ├── guards/
│   │   ├── decorators/
│   │   └── interceptors/
│   ├── config/
│   └── main.ts
├── db/
│   └── esquema-final.sql
├── nest-cli.json
├── tsconfig.json
└── package.json
```

### 4.2 Frontend (Next.js)
**Estado:** No inicializado

**Acciones requeridas:**
```bash
# 1. Crear proyecto Next.js
npx create-next-app@latest frontend --typescript --tailwind --eslint

# 2. Instalar dependencias adicionales
cd frontend
pnpm add axios @tanstack/react-query zustand

# 3. Configurar variables de entorno
# Crear .env.local con URLs de API
```

**Estructura sugerida:**
```
frontend/
├── src/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── services/
│   ├── stores/
│   └── types/
├── public/
├── next.config.js
├── tailwind.config.js
└── package.json
```

### 4.3 Base de datos (Supabase)
**Estado:** Esquema listo, pero no desplegado

**Acciones requeridas:**
1. **Crear proyecto en Supabase**
   - Ir a https://supabase.com
   - Crear nuevo proyecto
   - Anotar URL y keys

2. **Ejecutar esquema SQL**
   ```bash
   # Opción 1: Usar SQL Editor de Supabase
   # Pegar contenido de backend/db/esquema-final.sql

   # Opción 2: Usar CLI
   npx supabase db push
   ```

3. **Configurar variables de entorno**
   ```bash
   # Crear backend/.env
   DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
   SUPABASE_URL=https://[project-ref].supabase.co
   SUPABASE_ANON_KEY=[anon-key]
   SUPABASE_SERVICE_KEY=[service-key]
   ```

4. **Configurar RLS policies** (pendiente en esquema)
   ```sql
   -- Ejemplo para tabela reservas
   CREATE POLICY "Usuarios pueden ver sus propias reservas"
   ON reservas FOR SELECT
   USING (auth.uid() = id_persona);

   CREATE POLICY "Usuarios autenticados pueden crear reservas"
   ON reservas FOR INSERT
   WITH CHECK (auth.role() = 'authenticated');
   ```

### 4.4 Autenticación
**Estado:** No implementada

**Opciones:**
1. **Supabase Auth** (recomendado)
   - Integración nativa con PostgreSQL
   - Soporte para JWT
   - Gestión de sesiones

2. **NestJS + Passport**
   - Mayor control personalizado
   - Requiere más configuración

### 4.5 CI/CD (GitHub Actions)
**Estado:** Configuración básica incompleta

**Acciones requeridas:**
```yaml
# Actualizar .github/workflows/ci.yml
name: Integración Continua (CI)

on:
  push:
    branches: ["main", "develop"]
  pull_request:
    branches: ["main"]

jobs:
  validate-spec:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - run: pnpm install
      - run: npx openspec validate --strict

  test-backend:
    runs-on: ubuntu-latest
    needs: validate-spec
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: cd backend && pnpm install
      - run: cd backend && pnpm run test

  test-frontend:
    runs-on: ubuntu-latest
    needs: validate-spec
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: cd frontend && pnpm install
      - run: cd frontend && pnpm run test
```

### 4.6 Herramientas de Desarrollo
**Recomendadas:**
- **IDE:** VS Code con extensiones:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - PostgreSQL (para consultas directas)
- **API Testing:** Postman o Insomnia
- **Documentación:** Swagger/OpenAPI para endpoints

### 4.7 Variables de Entorno
**Archivos .env necesarios:**

```bash
# backend/.env
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...
JWT_SECRET=tu-secreto-seguro
JWT_EXPIRATION=24h
PORT=3000

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## 5. Próximos Pasos Recomendados

### Fase 1: Configuración Base (1-2 días)
1. ✅ Verificar Node.js >= 18 instalado
2. ✅ Inicializar backend NestJS
3. ✅ Inicializar frontend Next.js
4. ✅ Crear proyecto Supabase y ejecutar esquema
5. ✅ Configurar variables de entorno

### Fase 2: Desarrollo Backend (1-2 semanas)
1. Implementar módulo de autenticación
2. Crear CRUD para personas y usuarios
3. Implementar gestión de disciplinas y canchas
4. Desarrollar sistema de reservas
5. Implementar alquiler de equipamiento
6. Agregar auditoría y logging

### Fase 3: Desarrollo Frontend (2-3 semanas)
1. Configurar layout base y navegación
2. Implementar páginas de autenticación
3. Crear dashboard de usuario
4. Desarrollar interfaz de reservas
5. Implementar gestión de canchas (admin)
6. Agregar reportes y auditoría

### Fase 4: Integración y Testing (1 semana)
1. Integrar frontend con backend
2. Implementar tests unitarios
3. Configurar tests de integración
4. Validar flujos completos
5. Documentar API con Swagger

### Fase 5: Despliegue (2-3 días)
1. Configurar Vercel para frontend
2. Desplegar backend (Railway/Render)
3. Configurar dominio y SSL
4. Implementar monitoreo
5. Documentar proceso de despliegue

---

## 6. Comandos Útiles

```bash
# Instalar pnpm (si no está instalado)
npm install -g pnpm

# Instalar dependencias del proyecto
pnpm install

# Iniciar backend en desarrollo
cd backend && pnpm run start:dev

# Iniciar frontend en desarrollo
cd frontend && pnpm run dev

# Ejecutar tests
pnpm run test

# Validar especificaciones OpenSpec
npx openspec validate --strict

# Ejecutar linting
pnpm run lint

# Formatear código
pnpm run format
```

---

## 7. Referencias

- **Documentación NestJS:** https://docs.nestjs.com
- **Documentación Next.js:** https://nextjs.org/docs
- **Supabase Docs:** https://supabase.com/docs
- **OpenSpec:** https://github.com/anomalyco/opencode/tree/main/packages/openspec
- **TypeScript:** https://www.typescriptlang.org/docs

---

*Documento generado el 2026-09-24*
*Estado: Análisis inicial completo*
