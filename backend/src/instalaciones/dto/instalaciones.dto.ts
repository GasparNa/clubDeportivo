import { IsString, IsOptional, IsNumber, IsEnum, Min, IsUUID } from 'class-validator';

export class CreateDisciplinaDto {
  @IsString()
  nombre!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}

export class UpdateDisciplinaDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}

export class CreateCanchaDto {
  @IsUUID()
  id_disciplina!: string;

  @IsString()
  nombre!: string;

  @IsOptional()
  @IsString()
  superficie?: string;

  @IsNumber()
  @Min(0)
  precio_base!: number;
}

export class UpdateCanchaDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  superficie?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precio_base?: number;

  @IsOptional()
  @IsEnum(['DISPONIBLE', 'MANTENIMIENTO'])
  estado?: string;
}

export class CreateFranjaHorariaDto {
  @IsUUID()
  id_cancha!: string;

  @IsNumber()
  dia_semana!: number; // 0=Domingo, 1=Lunes, ..., 6=Sábado

  @IsString()
  hora_inicio!: string; // HH:mm

  @IsString()
  hora_fin!: string; // HH:mm
}