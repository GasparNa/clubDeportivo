import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import {
  RegisterPersonaDto,
  LoginDto,
  UpdatePerfilDto,
  SolicitudPermisoDto,
  ResolverSolicitudDto,
} from './dto/usuarios.dto';

@Injectable()
export class UsuariosService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Registro de persona + usuario (autoregistro de socio).
   * Crea persona, contacto email, y usuario con rol SOCIO.
   */
  async register(dto: RegisterPersonaDto) {
    // Verificar que el email no esté ya registrado como contacto activo
    const emailExistente = await this.prisma.contactoPersona.findFirst({
      where: {
        tipo_contacto: 'EMAIL',
        valor_contacto: dto.email.toLowerCase().trim(),
        estado: 'ACTIVO',
      },
    });

    if (emailExistente) {
      throw new ConflictException('El email ya está registrado');
    }

    // Verificar DNI único
    const dniExistente = await this.prisma.persona.findUnique({
      where: { dni: dto.dni },
    });

    if (dniExistente) {
      throw new ConflictException('El DNI ya está registrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Crear persona, contacto, usuario y solicitud en una transacción
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Crear persona
      const persona = await tx.persona.create({
        data: {
          dni: dto.dni,
          cuil: dto.cuil,
          nombre: dto.nombre,
          apellido: dto.apellido,
          fecha_nacimiento: dto.fecha_nacimiento ? new Date(dto.fecha_nacimiento) : null,
        },
      });

      // 2. Crear contacto email
      const contacto = await tx.contactoPersona.create({
        data: {
          id_persona: persona.id_persona,
          tipo_contacto: 'EMAIL',
          valor_contacto: dto.email.toLowerCase().trim(),
          estado: 'ACTIVO',
        },
      });

      // 3. Crear teléfono si se proporciona
      if (dto.telefono) {
        await tx.contactoPersona.create({
          data: {
            id_persona: persona.id_persona,
            tipo_contacto: 'TELEFONO',
            valor_contacto: dto.telefono,
            estado: 'ACTIVO',
          },
        });
      }

      // 4. Crear usuario
      const usuario = await tx.usuario.create({
        data: {
          id_usuario: persona.id_persona,
          id_contacto_login: contacto.id_contacto,
          rol: 'SOCIO',
          estado: 'PENDIENTE',
          password_hash: passwordHash,
        },
      });

      // 5. Crear solicitud de permiso
      await tx.solicitudPermiso.create({
        data: {
          id_persona: persona.id_persona,
          origen: 'AUTOREGISTRO',
          estado: 'PENDIENTE',
        },
      });

      return { persona, usuario };
    });

    return {
      message: 'Registro exitoso. Su cuenta está pendiente de aprobación.',
      id_usuario: result.usuario.id_usuario,
    };
  }

  /**
   * Login: busca el email en contactos, verifica password, devuelve JWT.
   */
  async login(dto: LoginDto) {
    const contacto = await this.prisma.contactoPersona.findFirst({
      where: {
        tipo_contacto: 'EMAIL',
        valor_contacto: dto.email.toLowerCase().trim(),
        estado: 'ACTIVO',
      },
      include: {
        persona: {
          include: {
            usuario: true,
          },
        },
      },
    });

    if (!contacto || !contacto.persona.usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const usuario = contacto.persona.usuario;

    if (!usuario.password_hash) {
      throw new UnauthorizedException('La cuenta no tiene contraseña configurada');
    }

    const passwordValida = await bcrypt.compare(dto.password, usuario.password_hash);
    if (!passwordValida) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (usuario.estado === 'SUSPENDIDO') {
      throw new UnauthorizedException('Usuario suspendido. Contacte al administrador.');
    }

    const payload = {
      sub: usuario.id_usuario,
      email: dto.email,
      rol: usuario.rol,
    };

    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre: contacto.persona.nombre,
        apellido: contacto.persona.apellido,
        email: dto.email,
        rol: usuario.rol,
        estado: usuario.estado,
      },
    };
  }

  /**
   * Obtener perfil del usuario autenticado.
   */
  async getPerfil(id_usuario: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario },
      include: {
        persona: {
          include: {
            contactos: {
              where: { estado: 'ACTIVO' },
            },
            direcciones: {
              where: { estado: 'ACTIVO' },
            },
          },
        },
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      id_usuario: usuario.id_usuario,
      nombre: usuario.persona.nombre,
      apellido: usuario.persona.apellido,
      dni: usuario.persona.dni,
      cuil: usuario.persona.cuil,
      fecha_nacimiento: usuario.persona.fecha_nacimiento,
      rol: usuario.rol,
      estado: usuario.estado,
      contactos: usuario.persona.contactos.map((c) => ({
        tipo: c.tipo_contacto,
        valor: c.valor_contacto,
      })),
      direcciones: usuario.persona.direcciones.map((d) => ({
        tipo: d.tipo_direccion,
        calle: d.calle,
        numero: d.numero,
        localidad: d.localidad,
        provincia: d.provincia,
      })),
    };
  }

  /**
   * Actualizar perfil del usuario autenticado.
   */
  async updatePerfil(id_usuario: string, dto: UpdatePerfilDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario },
      include: { persona: true },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.prisma.$transaction(async (tx) => {
      // Actualizar persona
      if (dto.nombre || dto.apellido) {
        await tx.persona.update({
          where: { id_persona: id_usuario },
          data: {
            ...(dto.nombre && { nombre: dto.nombre }),
            ...(dto.apellido && { apellido: dto.apellido }),
          },
        });
      }

      // Actualizar email (inactivar anterior, crear nuevo)
      if (dto.email) {
        // Inactivar emails anteriores
        await tx.contactoPersona.updateMany({
          where: {
            id_persona: id_usuario,
            tipo_contacto: 'EMAIL',
            estado: 'ACTIVO',
          },
          data: { estado: 'INACTIVO', inactivated_at: new Date() },
        });

        await tx.contactoPersona.create({
          data: {
            id_persona: id_usuario,
            tipo_contacto: 'EMAIL',
            valor_contacto: dto.email.toLowerCase().trim(),
            estado: 'ACTIVO',
          },
        });
      }

      // Actualizar teléfono
      if (dto.telefono) {
        await tx.contactoPersona.updateMany({
          where: {
            id_persona: id_usuario,
            tipo_contacto: 'TELEFONO',
            estado: 'ACTIVO',
          },
          data: { estado: 'INACTIVO', inactivated_at: new Date() },
        });

        await tx.contactoPersona.create({
          data: {
            id_persona: id_usuario,
            tipo_contacto: 'TELEFONO',
            valor_contacto: dto.telefono,
            estado: 'ACTIVO',
          },
        });
      }
    });

    return this.getPerfil(id_usuario);
  }

  /**
   * Listar todas las solicitudes de permiso pendientes (Gerente/Admin).
   */
  async listarSolicitudes(estado?: string) {
    const where: any = {};
    if (estado) {
      where.estado = estado;
    }

    return this.prisma.solicitudPermiso.findMany({
      where,
      include: {
        persona: {
          include: {
            contactos: {
              where: { tipo_contacto: 'EMAIL', estado: 'ACTIVO' },
              take: 1,
            },
          },
        },
        gestorAprobador: {
          include: {
            persona: true,
          },
        },
      },
      orderBy: { fecha_solicitud: 'desc' },
    });
  }

  /**
   * Resolver solicitud de permiso (aprobar/rechazar) - Gerente/Admin.
   */
  async resolverSolicitud(id_solicitud: string, dto: ResolverSolicitudDto, id_gestor: string) {
    const solicitud = await this.prisma.solicitudPermiso.findUnique({
      where: { id_solicitud },
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    if (solicitud.estado !== 'PENDIENTE') {
      throw new BadRequestException('La solicitud ya fue resuelta');
    }

    return this.prisma.solicitudPermiso.update({
      where: { id_solicitud },
      data: {
        estado: dto.estado,
        id_gestor_aprobador: id_gestor,
        fecha_resolucion: new Date(),
        ...(dto.estado === 'APROBADA' && {
          id_usuario_generado: solicitud.id_persona,
        }),
      },
    });
  }

  /**
   * Listar usuarios (Admin).
   */
  async listarUsuarios(rol?: string, estado?: string) {
    const where: any = {};
    if (rol) where.rol = rol;
    if (estado) where.estado = estado;

    return this.prisma.usuario.findMany({
      where,
      include: {
        persona: {
          include: {
            contactos: {
              where: { estado: 'ACTIVO' },
            },
          },
        },
      },
      orderBy: { creado_en: 'desc' },
    });
  }

  /**
   * Cambiar estado de un usuario (suspender/reactivar) - Admin.
   */
  async cambiarEstadoUsuario(id_usuario: string, estado: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.prisma.usuario.update({
      where: { id_usuario },
      data: { estado },
    });
  }
}