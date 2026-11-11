import { UsuariosService } from './usuarios.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

// Mock @nestjs/jwt para evitar problemas ESM
jest.mock('@nestjs/jwt', () => ({
  JwtService: jest.fn().mockImplementation(() => ({
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  })),
}));

describe('UsuariosService', () => {
  let service: UsuariosService;
  let mockPrisma: any;
  let mockJwtService: any;

  beforeEach(() => {
    mockPrisma = {
      persona: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      contactoPersona: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      usuario: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      solicitudPermiso: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    service = new UsuariosService(mockPrisma as any, mockJwtService as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      nombre: 'Juan',
      apellido: 'Pérez',
      dni: '12345678',
      email: 'juan@test.com',
      password: 'password123',
    };

    it('debe registrar un nuevo usuario correctamente', async () => {
      mockPrisma.contactoPersona.findFirst.mockResolvedValue(null);
      mockPrisma.persona.findUnique.mockResolvedValue(null);

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          persona: {
            create: jest.fn().mockResolvedValue({
              id_persona: 'uuid-persona-1',
              nombre: 'Juan',
              apellido: 'Pérez',
              dni: '12345678',
            }),
          },
          contactoPersona: {
            create: jest.fn()
              .mockResolvedValueOnce({ id_contacto: 'uuid-contacto-1', valor_contacto: 'juan@test.com' })
              .mockResolvedValueOnce({ id_contacto: 'uuid-contacto-2', valor_contacto: '123456789' }),
          },
          usuario: {
            create: jest.fn().mockResolvedValue({
              id_usuario: 'uuid-usuario-1',
              rol: 'SOCIO',
              estado: 'PENDIENTE',
            }),
          },
          solicitudPermiso: {
            create: jest.fn().mockResolvedValue({
              id_solicitud: 'uuid-solicitud-1',
              estado: 'PENDIENTE',
            }),
          },
        });
      });

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('id_usuario', 'uuid-usuario-1');
      expect(result).toHaveProperty('message', 'Registro exitoso. Su cuenta está pendiente de aprobación.');
    });

    it('debe lanzar ConflictException si el email ya existe', async () => {
      mockPrisma.contactoPersona.findFirst.mockResolvedValue({ id_contacto: 'existing' });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('debe lanzar ConflictException si el DNI ya existe', async () => {
      mockPrisma.contactoPersona.findFirst.mockResolvedValue(null);
      mockPrisma.persona.findUnique.mockResolvedValue({ id_persona: 'existing' });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const loginDto = { email: 'juan@test.com', password: 'password123' };

    it('debe retornar token JWT con credenciales válidas', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      mockPrisma.contactoPersona.findFirst.mockResolvedValue({
        id_contacto: 'uuid-contacto-1',
        valor_contacto: 'juan@test.com',
        persona: {
          nombre: 'Juan',
          apellido: 'Pérez',
          usuario: {
            id_usuario: 'uuid-usuario-1',
            password_hash: hashedPassword,
            rol: 'SOCIO',
            estado: 'ACTIVO',
          },
        },
      });

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('access_token', 'mock-jwt-token');
      expect(result.usuario).toHaveProperty('rol', 'SOCIO');
      expect(result.usuario).toHaveProperty('email', 'juan@test.com');
    });

    it('debe lanzar UnauthorizedException con credenciales inválidas', async () => {
      mockPrisma.contactoPersona.findFirst.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar UnauthorizedException si el usuario está suspendido', async () => {
      mockPrisma.contactoPersona.findFirst.mockResolvedValue({
        id_contacto: 'uuid-contacto-1',
        persona: {
          nombre: 'Juan',
          apellido: 'Pérez',
          usuario: {
            id_usuario: 'uuid-usuario-1',
            password_hash: await bcrypt.hash('password123', 10),
            rol: 'SOCIO',
            estado: 'SUSPENDIDO',
          },
        },
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getPerfil', () => {
    it('debe retornar el perfil del usuario', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({
        id_usuario: 'uuid-usuario-1',
        rol: 'SOCIO',
        estado: 'ACTIVO',
        persona: {
          nombre: 'Juan',
          apellido: 'Pérez',
          dni: '12345678',
          cuil: '20-12345678-7',
          fecha_nacimiento: new Date('1990-01-15'),
          contactos: [
            { valor_contacto: 'juan@test.com', tipo_contacto: 'EMAIL' },
          ],
          direcciones: [],
        },
      });

      const result = await service.getPerfil('uuid-usuario-1');

      expect(result).toHaveProperty('nombre', 'Juan');
      expect(result).toHaveProperty('dni', '12345678');
      expect(result).toHaveProperty('rol', 'SOCIO');
    });

    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(null);

      await expect(service.getPerfil('no-existe')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUsuarioDetalle', () => {
    const usuarioBase = {
      id_usuario: 'uuid-usuario-1',
      rol: 'SOCIO',
      estado: 'ACTIVO',
      password_hash: 'hash-secreto',
      id_contacto_login: 'uuid-contacto-email',
      incumplimientos_equipamiento: 2,
      creado_en: new Date('2026-01-10T10:00:00Z'),
      actualizado_en: new Date('2026-02-10T10:00:00Z'),
      persona: {
        nombre: 'Juan',
        apellido: 'Pérez',
        dni: '12345678',
        cuil: '20-12345678-7',
        fecha_nacimiento: new Date('1990-01-15'),
        contactos: [
          { tipo_contacto: 'EMAIL', valor_contacto: 'juan@test.com', estado: 'ACTIVO' },
          { tipo_contacto: 'TELEFONO', valor_contacto: '123456789', estado: 'ACTIVO' },
        ],
      },
    };

    it('debe retornar el detalle plano con contactos activos', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(usuarioBase);

      const result = await service.getUsuarioDetalle('uuid-usuario-1');

      expect(result).toMatchObject({
        id: 'uuid-usuario-1',
        id_usuario: 'uuid-usuario-1',
        nombre: 'Juan',
        apellido: 'Pérez',
        email: 'juan@test.com',
        telefono: '123456789',
        dni: '12345678',
        cuil: '20-12345678-7',
        rol: 'SOCIO',
        estado: 'ACTIVO',
        infracciones_equipamiento: 2,
      });
      expect(result).not.toHaveProperty('password_hash');
      expect(result).not.toHaveProperty('id_contacto_login');
      expect(result).not.toHaveProperty('persona');
    });

    it('debe devolver email vacío y teléfono null cuando no hay contactos activos', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({
        ...usuarioBase,
        persona: { ...usuarioBase.persona, contactos: [] },
      });

      const result = await service.getUsuarioDetalle('uuid-usuario-1');

      expect(result.email).toBe('');
      expect(result.telefono).toBeNull();
    });

    it('debe ignorar contactos inactivos del mismo tipo', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({
        ...usuarioBase,
        persona: {
          ...usuarioBase.persona,
          contactos: [
            { tipo_contacto: 'EMAIL', valor_contacto: 'viejo@test.com', estado: 'INACTIVO' },
            { tipo_contacto: 'TELEFONO', valor_contacto: '000', estado: 'INACTIVO' },
          ],
        },
      });

      const result = await service.getUsuarioDetalle('uuid-usuario-1');

      expect(result.email).toBe('');
      expect(result.telefono).toBeNull();
    });

    it('debe lanzar NotFoundException con el mensaje esperado si el usuario no existe', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(null);

      await expect(service.getUsuarioDetalle('no-existe')).rejects.toThrow(
        'Usuario no encontrado',
      );
    });
  });

  describe('listarUsuarios', () => {
    const usuarioListado = {
      id_usuario: 'uuid-usuario-1',
      rol: 'SOCIO',
      estado: 'ACTIVO',
      password_hash: 'hash-secreto',
      id_contacto_login: 'uuid-contacto-email',
      incumplimientos_equipamiento: 0,
      creado_en: new Date('2026-01-10T10:00:00Z'),
      actualizado_en: new Date('2026-02-10T10:00:00Z'),
      persona: {
        nombre: 'Juan',
        apellido: 'Pérez',
        dni: '12345678',
        cuil: null,
        fecha_nacimiento: null,
        contactos: [
          { tipo_contacto: 'EMAIL', valor_contacto: 'juan@test.com', estado: 'ACTIVO' },
          { tipo_contacto: 'TELEFONO', valor_contacto: '123456789', estado: 'ACTIVO' },
        ],
      },
    };

    it('debe devolver una lista plana sin credenciales ni relaciones anidadas', async () => {
      mockPrisma.usuario.findMany.mockResolvedValue([usuarioListado]);

      const result = await service.listarUsuarios();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'uuid-usuario-1',
        id_usuario: 'uuid-usuario-1',
        nombre: 'Juan',
        apellido: 'Pérez',
        email: 'juan@test.com',
        telefono: '123456789',
        rol: 'SOCIO',
        estado: 'ACTIVO',
      });
      expect(result[0]).not.toHaveProperty('password_hash');
      expect(result[0]).not.toHaveProperty('id_contacto_login');
      expect(result[0]).not.toHaveProperty('persona');
      expect(result[0]).not.toHaveProperty('contactos');
    });

    it('debe aplicar los filtros de rol y estado en la consulta', async () => {
      mockPrisma.usuario.findMany.mockResolvedValue([]);

      await service.listarUsuarios('SOCIO', 'ACTIVO');

      expect(mockPrisma.usuario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { rol: 'SOCIO', estado: 'ACTIVO' },
        }),
      );
    });

    it('debe consultar sin filtros cuando no se reciben', async () => {
      mockPrisma.usuario.findMany.mockResolvedValue([]);

      await service.listarUsuarios();

      expect(mockPrisma.usuario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });
  });
});