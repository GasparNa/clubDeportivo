// Stub CJS para @prisma/client - compatible con Jest 29
"use strict";

class PrismaClient {
  constructor() {
    // Mock de todos los modelos
    this.persona = mockModel();
    this.usuario = mockModel();
    this.rol = mockModel();
    this.permiso = mockModel();
    this.usuarioRol = mockModel();
    this.rolPermiso = mockModel();
    this.disciplina = mockModel();
    this.canchas = mockModel();
    this.franjaHoraria = mockModel();
    this.reserva = mockModel();
    this.alquilerEquipamiento = mockModel();
    this.pago = mockModel();
    this.auditoria = mockModel();
    this.notificacion = mockModel();
    this.$connect = jest.fn().mockResolvedValue(undefined);
    this.$disconnect = jest.fn().mockResolvedValue(undefined);
    this.$transaction = jest.fn((fn) => fn(this));
  }
}

function mockModel() {
  const model = {};
  const methods = [
    'findMany', 'findUnique', 'findFirst', 'findFirstOrThrow',
    'create', 'createMany', 'update', 'updateMany',
    'delete', 'deleteMany', 'upsert', 'count', 'aggregate',
    'groupBy',
  ];
  for (const method of methods) {
    model[method] = jest.fn().mockResolvedValue(method.startsWith('find') || method === 'count' ? [] : {});
  }
  return model;
}

module.exports = { PrismaClient };