import {
  IsUUID,
  IsNumber,
  IsOptional,
  IsEnum,
  IsString,
  IsDateString,
  IsNotEmpty,
  Min,
} from 'class-validator';

export class CreatePagoDto {
  @IsUUID()
  id_reserva!: string;

  @IsNumber()
  @Min(0)
  monto!: number;

  @IsOptional()
  @IsString()
  metodo_pago?: string;
}

export class UpdatePagoEstadoDto {
  @IsEnum(['PENDIENTE', 'COMPLETADO', 'FALLIDO', 'REEMBOLSADO'])
  estado!: string;
}

export class CreateNotificacionDto {
  @IsUUID()
  id_usuario!: string;

  @IsString()
  @IsNotEmpty()
  asunto!: string;

  @IsString()
  @IsNotEmpty()
  mensaje!: string;

  @IsOptional()
  @IsEnum(['INFO', 'WARNING', 'ERROR', 'SUCCESS'])
  tipo?: string;

  @IsOptional()
  @IsUUID()
  id_reserva?: string;
}

export class AuditoriaQueryDto {
  @IsOptional()
  @IsDateString()
  fecha_desde?: string;

  @IsOptional()
  @IsDateString()
  fecha_hasta?: string;

  @IsOptional()
  @IsUUID()
  id_usuario?: string;

  @IsOptional()
  @IsString()
  entidad?: string;

  @IsOptional()
  @IsString()
  evento?: string;
}