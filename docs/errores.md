# Análisis de Principios SOLID — Backend Club Deportivo
## Evaluación General: Cumplimiento Parcial — Buena estructura modular a nivel NestJS, pero violaciones significativas en la capa de servicios.
### 1. Principio de Responsabilidad Única (SRP) ⚠️ Violado

| Componente | Problema |
| --- | --- |
| UsuariosService (396 líneas) | Maneja: registro, login, perfil CRUD, solicitudes de permiso (listar/resolver), listado de usuarios (admin), cambio de estado (admin) — 6+ responsabilidades |
| ReservasService (514 líneas) | Maneja: reservas (CRUD + transiciones de estado + reglas de cancelación) + alquileres de equipamiento (CRUD + stock + devoluciones + infracciones) — 2 dominios distintos |
| PagosService (249 líneas) | Maneja: pagos (simulados) + logs de auditoría (consultas + reportes) + notificaciones (email simulado) — 3 preocupaciones no relacionadas |
| InstalacionesService (227 líneas) | Maneja: disciplinas + canchas + franjas horarias (lógica de disponibilidad) — 3 entidades, se podría separar |

**Positivo:** Controladores, DTOs, Guards y PrismaService tienen responsabilidades enfocadas.

### 2. Principio Abierto/Cerrado (OCP) ⚠️ Violado
| Problema | Ubicación | Por qué viola OCP |
| --- | --- | --- |
| Transiciones de estado hardcodeadas | ReservasService.actualizarEstadoReserva:190-199 | Agregar nuevos estados/transiciones requiere modificar el servicio
| Métodos de pago hardcodeados | PagosService.crearPago:45 | Solo EFECTIVO soportado; agregar gateway requiere modificar servicio |
| Reglas de validación hardcodeadas | ReservasService.crearReserva:145-158 | Máx 2 reservas, 24h cancelación — cambiar reglas = modificar servicio
| Sin patrón strategy para servicios externos | PagosService.enviarNotificacion | Integración email/payment gateway requeriría modificar código existente |
| Lógica de stock embebida | ReservasService.crearAlquiler:402-409 | Decremento/incremento de stock no abstraído |

**Positivo:** Patrón Guard/Decorator permite agregar reglas de auth sin tocar controladores.

### 3. Principio de Sustitución de Liskov (LSP) ➖ No Aplicable / Sin Violaciones
- No hay jerarquías de herencia en servicios/controladores
- Guards implementan correctamente interfaz CanActivate
- No hay subtipos que rompan sustituibilidad

**Nota:** PrismaService extends PrismaClient — podría ser problemático al cambiar ORM, pero actualmente no se intenta sustitución.

### 4. Principio de Segregación de Interfaces (ISP) ⚠️ Violado
| Violación | Descripción |
| --- | --- |
| Interfaces de servicio gordas | UsuariosService expone getPerfil() (usuario) Y listarUsuarios() (admin) — consumidores dependen de métodos que no usan |
|Sin separación lectura/escritura | No hay ReservaReadService / ReservaWriteService — CQRS no aplicado |
| Preocupaciones mezcladas en un servicio | PagosService obliga a consumidores de auditoría a depender de métodos de pago y viceversa |
| Alquiler de equipamiento mezclado con reservas | Consumidores que solo necesitan lógica de equipamiento dependen de métodos de reserva |

### 5. Principio de Inversión de Dependencias (DIP) ❌ Severamente Violado

| Dependencia Concreta | Debería Depender de Abstracción |
| --- | --- |
| UsuariosService → PrismaService | UsuarioRepository interface |
| ReservasService → PrismaService | ReservaRepository, EquipamientoRepository |
InstalacionesService → PrismaService | DisciplinaRepository, CanchaRepository, FranjaRepository |
| PagosService → PrismaService | PagoRepository, AuditoriaRepository, NotificacionService |
| JwtStrategy → PrismaService | UsuarioRepository |
| SuspendedUserGuard → PrismaService | UsuarioRepository |

**Impacto:**
- No se puede cambiar Prisma por otro ORM o implementación en memoria para tests
- Tests unitarios requieren base de datos (no hay fácil mocking de repositorios)
- Lógica de negocio fuertemente acoplada a implementación de acceso a datos

### Matriz Resumen
| Principio | Puntuación | Prioridad |
| --- | --- | --- | 
| SRP | 4/10 | 🔴 Alta — Dividir god services |
| OCP |	3/10 | 🔴 Alta — Introducir strategies/interfaces
| LSP | N/A | — |
| ISP | 4/10 | 🟡 Media — Separar lectura/escritura, dividir servicios |
| DIP | 2/10 | 🔴 Crítica — Agregar interfaces de repositorio |


### Plan de Refactor Recomendado
1. Introducir Interfaces de Repositorio (DIP)
    - UsuarioRepository, ReservaRepository, EquipamientoRepository, etc.
    - Implementar con Prisma, permitir mocks para tests
2. Dividir God Services (SRP + ISP)
    - UsuarioService → AuthService + PerfilService + AdminUsuarioService + SolicitudPermisoService
    - ReservasService → ReservaService + AlquilerEquipamientoService
    - PagosService → PagoService + AuditoriaService + NotificacionService
3. Extraer Reglas de Negocio a Strategies (OCP)
    - EstadoReservaTransitionStrategy
    - PagoStrategy (EFECTIVO, TARJETA, MERCADOPAGO, etc.)
    - NotificacionStrategy (EMAIL, PUSH, SMS)
    - CancelacionPolicyStrategy
4. Aplicar CQRS (ISP)
    - Separar servicios de consulta/lectura de servicios de comando/escritura
5. Agregar Abstracción para Servicios Externos
    - Interfaces EmailService, PaymentGateway