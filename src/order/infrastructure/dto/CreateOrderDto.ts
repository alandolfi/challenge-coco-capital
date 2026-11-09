import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional } from 'class-validator';
import { ORDER_SIDES, OrderSide } from 'src/order/domain/OrderSide';
import { ORDER_TYPES, OrderType } from 'src/order/domain/OrderType';

export class CreateOrderDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  userId: number;

  @ApiProperty({ example: 34, description: 'ID del instrumento (ej: 34 = GGAL, 66 = ARS)' })
  @IsInt()
  instrumentId: number;

  @ApiProperty({ enum: ORDER_SIDES })
  @Transform(({ value }) => value?.toUpperCase())
  @IsIn(ORDER_SIDES)
  side: OrderSide;

  @ApiProperty({ enum: ORDER_TYPES })
  @Transform(({ value }) => value?.toUpperCase())
  @IsIn(ORDER_TYPES)
  type: OrderType;

  @ApiPropertyOptional({ example: 10, description: 'Cantidad de acciones' })
  @IsOptional()
  @IsInt()
  size?: number;

  @ApiPropertyOptional({ example: 8858, description: 'Monto total en pesos (alternativa a size). Ignorado si es 0.' })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ example: 885.8, description: 'Precio de ejecución. Requerido para LIMIT, ignorado en MARKET.' })
  @IsOptional()
  @IsNumber()
  price?: number;
}
