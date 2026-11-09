import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SearchInstrumentsQuery } from '../application/search-instruments/SearchInstrumentsQuery';
import { SearchInstrumentsResponseDto } from './dto/SearchInstrumentsResponseDto';

@ApiTags('instruments')
@Controller('instruments')
export class InstrumentController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por ticker o nombre' })
  @ApiOkResponse({ type: [SearchInstrumentsResponseDto] })
  search(@Query('search') search: string = '') {
    return this.queryBus.execute(new SearchInstrumentsQuery(search));
  }
}
