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
});