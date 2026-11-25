import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { ActiveUserGuard } from './active-user.guard';
import type { PrismaService } from '../prisma/prisma.service';

const ID_USUARIO = '550e8400-e29b-41d4-a716-446655440000';

function contextoConUsuario(id_usuario?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: id_usuario ? { id_usuario } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

describe('ActiveUserGuard', () => {
  let prisma: { usuario: { findUnique: jest.Mock } };
  let guard: ActiveUserGuard;

  beforeEach(() => {
    prisma = { usuario: { findUnique: jest.fn() } };
    guard = new ActiveUserGuard(prisma as unknown as PrismaService);
  });

  it.each(['PENDIENTE', 'INACTIVO', 'SUSPENDIDO'])(
    'rechaza a usuario %s',
    async (estado) => {
      prisma.usuario.findUnique.mockResolvedValue({ estado, rol: 'SOCIO' });

      await expect(
        guard.canActivate(contextoConUsuario(ID_USUARIO)),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.usuario.findUnique).toHaveBeenCalledWith({
        where: { id_usuario: ID_USUARIO },
        select: { estado: true, rol: true },
      });
    },
  );

  it('permite a usuario ACTIVO', async () => {
    prisma.usuario.findUnique.mockResolvedValue({ estado: 'ACTIVO', rol: 'SOCIO' });

    await expect(
      guard.canActivate(contextoConUsuario(ID_USUARIO)),
    ).resolves.toBe(true);
  });

  it('rechaza una request sin usuario autenticado', async () => {
    await expect(guard.canActivate(contextoConUsuario())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
  });
});
