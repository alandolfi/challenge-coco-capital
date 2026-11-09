import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateOrderHandler } from '../application/create-order/CreateOrderHandler';
import { OrderRepository } from '../domain/OrderRepository';
import { OrderController } from './order.controller';
import { TypeOrmOrderRepository } from './persistence/TypeOrmOrderRepository';
import { TypeOrmOrder } from './persistence/typeorm/TypeOrmOrder';

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([TypeOrmOrder])],
  controllers: [OrderController],
  providers: [
    { provide: OrderRepository, useClass: TypeOrmOrderRepository },
    CreateOrderHandler,
  ],
})
export class OrderModule {}
