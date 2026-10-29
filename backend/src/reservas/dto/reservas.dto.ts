import { IsUUID, IsDateString, IsOptional, IsNumber, Min, IsEnum, IsIn } from 'class-validator';

export class CreateReservaDto {
  @IsUUID()
  id_franja!: string;

  @IsDateString()
  fecha!: string; // YYYY-MM-DD

  @IsUUID()
  id_persona!: string;

  @IsOptional()
  @IsEnum(['AUTOGESTIONADA', 'MANUAL_GERENCIA'])
  origen?: string;
}

export class UpdateReservaEstadoDto {
  @IsEnum(['CONFIRMADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA'])
  estado!: string;
}

/**
 * Cancelación por el propio socio (autoservicio).
 * Solo se permite pasar a CANCELADA; el resto del flujo lo maneja gerencia.
 */
export class CancelarReservaDto {
  @IsIn(['CANCELADA'])
  estado!: 'CANCELADA';
}

export class CreateAlquilerEquipamientoDto {
  @IsUUID()
  id_reserva!: string;

  @IsUUID()
  id_equipamiento!: string;

  @IsNumber()
  @Min(1)
  cantidad!: number;
}

export class UpdateDevolucionDto {
  @IsEnum(['DEVUELTO', 'DEVUELTO_TARDE', 'NO_DEVUELTO'])
  estado_devolucion!: string;
}