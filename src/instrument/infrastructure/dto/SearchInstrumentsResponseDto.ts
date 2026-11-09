import { ApiProperty } from '@nestjs/swagger';

export class SearchInstrumentsResponseDto {
  @ApiProperty({ example: 34 })
  id: number;

  @ApiProperty({ example: 'GGAL' })
  ticker: string;

  @ApiProperty({ example: 'Grupo Financiero Galicia' })
  name: string;

  @ApiProperty({ example: 'ACCIONES', enum: ['ACCIONES', 'MONEDA'] })
  type: string;

  @ApiProperty({ example: 341.5, nullable: true })
  lastPrice: number | null;

  @ApiProperty({ example: 1.94, nullable: true, description: 'Rendimiento diario %' })
  dailyReturn: number | null;
}
