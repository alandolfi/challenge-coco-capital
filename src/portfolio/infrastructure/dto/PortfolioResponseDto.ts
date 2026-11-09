import { ApiProperty } from '@nestjs/swagger';

export class PositionDto {
  @ApiProperty({ example: 47 })
  instrumentId: number;

  @ApiProperty({ example: 'PAMP' })
  ticker: string;

  @ApiProperty({ example: 'Pampa Holding S.A.' })
  name: string;

  @ApiProperty({ example: 40 })
  quantity: number;

  @ApiProperty({ example: 921.8 })
  lastPrice: number;

  @ApiProperty({ example: 36872, description: 'Valor total de la posición en pesos' })
  marketValue: number;

  @ApiProperty({ example: 3.16, description: 'Rendimiento diario %' })
  dailyReturn: number;
}

export class PortfolioResponseDto {
  @ApiProperty({ example: 753000, description: 'Valor total de la cuenta en pesos' })
  totalValue: number;

  @ApiProperty({ example: 712713.5, description: 'Pesos disponibles para operar' })
  availableCash: number;

  @ApiProperty({ type: [PositionDto] })
  positions: PositionDto[];
}
