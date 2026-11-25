import { PrismaClient } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import { Actor } from '../../src/auth/actor';
import { PagosService } from '../../src/pagos/pagos.service';
import { ReservasService } from '../../src/reservas/reservas.service';
import { assertTestDatabase, dateOffset, dowOf, pool, testDatabaseUrl } from './db';
import { Fixtures } from './fixtures';

jest.mock('@nestjs/common', () =>
  jest.requireActual('../../stubs/@nestjs_common.js'),
);

const prisma = new PrismaClient({
  datasources: { db: { url: testDatabaseUrl() } },
});
const reservasService = new ReservasService(prisma as any);
const pagosService = new PagosService(prisma as any);
const fixtures = new Fixtures(pool);

describe('titularidad de reservas y pagos contra PostgreSQL', () => {
  let socioA: string;
  let socioB: string;
  let gerente: string;
  let reservaA: { id: string; montoTotal: number };
  let reservaB: { id: string; montoTotal: number };

  beforeEach(async () => {
    await assertTestDatabase(pool);

    const disciplina = await fixtures.disciplina();
    const cancha = await fixtures.cancha(disciplina);

    const fechaA = await dateOffset(7);
    const franjaA = await fixtures.franja(cancha.id, await dowOf(fechaA));

    const fechaB = await dateOffset(14);
    const franjaB = await fixtures.franja(cancha.id, await dowOf(fechaB), {
      horaInicio: '10:00',
      horaFin: '11:00',
    });

    socioA = await fixtures.usuarioActivo();
    socioB = await fixtures.usuarioActivo();
    gerente = await fixtures.usuarioActivo({ rol: 'GERENTE' });

    reservaA = await fixtures.reserva({
      idPersona: socioA,
      idFranja: franjaA,
      fecha: fechaA,
    });
    reservaB = await fixtures.reserva({
      idPersona: socioB,
      idFranja: franjaB,
      fecha: fechaB,
    });

    await pagosService.crearPago({
      id_reserva: reservaA.id,
      monto: reservaA.montoTotal,
      metodo_pago: 'EFECTIVO',
    });
    await pagosService.crearPago({
      id_reserva: reservaB.id,
      monto: reservaB.montoTotal,
      metodo_pago: 'TRANSFERENCIA',
    });
  });

  afterEach(async () => {
    await fixtures.cleanup();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  function actor(idPersona: string, rol = 'SOCIO'): Actor {
    return { id_persona: idPersona, rol };
  }

  describe('GET /reservations', () => {
    it('cada SOCIO ve solo sus reservas', async () => {
      const deA = await reservasService.listarReservas({}, actor(socioA));
      const deB = await reservasService.listarReservas({}, actor(socioB));

      expect(deA.map((reserva) => reserva.id_reserva)).toEqual([reservaA.id]);
      expect(deB.map((reserva) => reserva.id_reserva)).toEqual([reservaB.id]);
    });

    it('un SOCIO que fuerza person_id ajeno recibe 403', async () => {
      await expect(
        reservasService.listarReservas(
          { id_persona: socioB },
          actor(socioA),
        ),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('la gerencia ve las reservas CONFIRMADA de todos los socios', async () => {
      const todas = await reservasService.listarReservas(
        { estado: 'CONFIRMADA' },
        actor(gerente, 'GERENTE'),
      );

      expect(todas.map((reserva) => reserva.id_reserva).sort()).toEqual(
        [reservaA.id, reservaB.id].sort(),
      );
    });
  });

  describe('GET /reservations/:id', () => {
    it('un SOCIO ve su reserva y recibe 404 para la ajena', async () => {
      const propia = await reservasService.getReserva(
        reservaA.id,
        actor(socioA),
      );

      expect(propia.id_reserva).toBe(reservaA.id);

      await expect(
        reservasService.getReserva(reservaB.id, actor(socioA)),
      ).rejects.toMatchObject({
        status: 404,
        message: 'Reserva no encontrada',
      });
    });

    it('la gerencia ve el detalle de una reserva ajena', async () => {
      const ajena = await reservasService.getReserva(
        reservaB.id,
        actor(gerente, 'ADMINISTRADOR'),
      );

      expect(ajena.id_reserva).toBe(reservaB.id);
    });
  });

  describe('GET /payments', () => {
    it('cada SOCIO ve solo los pagos asociados a su titularidad', async () => {
      const deA = await pagosService.listarPagos({}, actor(socioA));
      const deB = await pagosService.listarPagos({}, actor(socioB));

      expect(deA).toHaveLength(1);
      expect(deA[0].id_usuario).toBe(socioA);
      expect(deA[0].id_entidad).toBe(reservaA.id);
      expect(deB).toHaveLength(1);
      expect(deB[0].id_usuario).toBe(socioB);
      expect(deB[0].id_entidad).toBe(reservaB.id);
    });

    it('la gerencia ve todos los pagos', async () => {
      const todos = await pagosService.listarPagos(
        {},
        actor(gerente, 'GERENTE'),
      );

      expect(todos).toHaveLength(2);
    });

    it('crearPago guarda el titular de la reserva, no a la gerencia que registra', async () => {
      const registros = await pool.query<{ id_usuario: string }>(
        `SELECT id_usuario FROM registros_auditoria
         WHERE evento = 'PAGO_REGISTRADO' AND id_entidad = ANY($1::uuid[])`,
        [[reservaA.id, reservaB.id]],
      );

      expect(registros.rows.map((fila) => fila.id_usuario).sort()).toEqual(
        [socioA, socioB].sort(),
      );
      expect(registros.rows.map((fila) => fila.id_usuario)).not.toContain(
        gerente,
      );
    });
  });

  describe('GET /payments/reservation/:id', () => {
    it('un SOCIO ve los pagos de su reserva y recibe 404 para la ajena', async () => {
      const propios = await pagosService.getPagosReserva(
        reservaA.id,
        actor(socioA),
      );

      expect(propios.id_reserva).toBe(reservaA.id);
      expect(propios.pagos).toHaveLength(1);

      await expect(
        pagosService.getPagosReserva(reservaB.id, actor(socioA)),
      ).rejects.toMatchObject({
        status: 404,
        message: 'Reserva no encontrada',
      });
    });

    it('la gerencia ve los pagos de una reserva ajena', async () => {
      const ajenos = await pagosService.getPagosReserva(
        reservaB.id,
        actor(gerente, 'ADMINISTRADOR'),
      );

      expect(ajenos.id_reserva).toBe(reservaB.id);
      expect(ajenos.pagos).toHaveLength(1);
    });
  });

  describe('fail-closed sin actor', () => {
    it('rechaza reservas y pagos sin actor', async () => {
      await expect(
        reservasService.listarReservas({}, undefined as any),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        pagosService.listarPagos({}, undefined as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
