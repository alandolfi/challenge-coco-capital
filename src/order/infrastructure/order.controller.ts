import { Body, Controller, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { CreateOrderCommand } from '../application/create-order/CreateOrderCommand';
import { CreateOrderDto } from './dto/CreateOrderDto';

@ApiTags('orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @ApiCreatedResponse({ description: 'Orden creada. Status: FILLED | NEW | REJECTED' })
  create(@Body() dto: CreateOrderDto) {
    return this.commandBus.execute(
      new CreateOrderCommand(dto.userId, dto.instrumentId, dto.side, dto.type, dto.size, dto.amount, dto.price),
    );
  }
}
