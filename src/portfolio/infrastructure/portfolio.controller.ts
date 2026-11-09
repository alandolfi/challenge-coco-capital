import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { GetPortfolioQuery } from '../application/get-portfolio/GetPortfolioQuery';
import { PortfolioResponseDto } from './dto/PortfolioResponseDto';

@ApiTags('portfolio')
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':userId')
  @ApiOkResponse({ type: PortfolioResponseDto })
  get(@Param('userId', ParseIntPipe) userId: number) {
    return this.queryBus.execute(new GetPortfolioQuery(userId));
  }
}
