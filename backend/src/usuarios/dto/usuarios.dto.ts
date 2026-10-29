import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsEnum, IsDateString } from 'class-validator';

export class RegisterPersonaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nombre!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  apellido!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(20)
  dni!: string;

  @IsOptional()
  @IsString()
  cuil?: string;

  @IsOptional()
  @IsDateString()
  fecha_nacimiento?: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password!: string;

  @IsOptional()
  @IsString()
  telefono?: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class UpdatePerfilDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  apellido?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefono?: string;
}

export class SolicitudPermisoDto {
  @IsString()
  id_persona!: string;

  @IsEnum(['AUTOREGISTRO', 'GESTIONADA_POR_PERSONAL'])
  origen!: string;
}

export class ResolverSolicitudDto {
  @IsEnum(['APROBADA', 'RECHAZADA'])
  estado!: string;
}