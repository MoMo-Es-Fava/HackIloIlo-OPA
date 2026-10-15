import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { AdminOrderDto, OrderDto, UserDto } from '@irpc/types';
import { CurrentUser, Roles } from '../../common/auth.decorators';
import {
  AcceptOrderDto,
  AdminOrdersQuery,
  CreateOrderDto,
  MyOrdersQuery,
  OrderIdParam,
  RejectOrderDto,
  UpdateStatusDto,
  WeighInDto,
} from './orders.dto';
import { OrdersService } from './orders.service';

// Farmers and buyers (one dashboard). Every route only touches the caller's own orders.
@Roles('USER')
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  create(
    @CurrentUser() user: UserDto,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderDto> {
    return this.orders.create(user, dto);
  }

  @Get('mine')
  mine(
    @CurrentUser() user: UserDto,
    @Query() query: MyOrdersQuery,
  ): Promise<OrderDto[]> {
    return this.orders.listMine(user.id, query.active);
  }

  @Get(':id')
  one(
    @CurrentUser() user: UserDto,
    @Param() { id }: OrderIdParam,
  ): Promise<OrderDto> {
    return this.orders.getMine(user.id, id);
  }

  @Post(':id/confirm-weight')
  @HttpCode(200)
  confirmWeight(
    @CurrentUser() user: UserDto,
    @Param() { id }: OrderIdParam,
  ): Promise<OrderDto> {
    return this.orders.confirmWeight(user, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(
    @CurrentUser() user: UserDto,
    @Param() { id }: OrderIdParam,
  ): Promise<OrderDto> {
    return this.orders.cancel(user, id);
  }
}

// IRPC staff: review, accept/reject, weigh, and move orders through the plant.
@Roles('ADMIN', 'PLANT_STAFF')
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(@Query() query: AdminOrdersQuery): Promise<OrderDto[]> {
    return this.orders.adminList(query);
  }

  @Get(':id')
  one(@Param() { id }: OrderIdParam): Promise<AdminOrderDto> {
    return this.orders.adminGet(id);
  }

  @Patch(':id/accept')
  accept(
    @CurrentUser() user: UserDto,
    @Param() { id }: OrderIdParam,
    @Body() dto: AcceptOrderDto,
  ): Promise<OrderDto> {
    return this.orders.accept(user, id, dto);
  }

  @Patch(':id/reject')
  reject(
    @CurrentUser() user: UserDto,
    @Param() { id }: OrderIdParam,
    @Body() dto: RejectOrderDto,
  ): Promise<OrderDto> {
    return this.orders.reject(user, id, dto.reason);
  }

  @Patch(':id/status')
  status(
    @CurrentUser() user: UserDto,
    @Param() { id }: OrderIdParam,
    @Body() dto: UpdateStatusDto,
  ): Promise<OrderDto> {
    return this.orders.setStatus(user, id, dto.status, dto.note);
  }

  @Post(':id/weigh-in')
  @HttpCode(200)
  weighIn(
    @CurrentUser() user: UserDto,
    @Param() { id }: OrderIdParam,
    @Body() dto: WeighInDto,
  ): Promise<OrderDto> {
    return this.orders.weighIn(user, id, dto);
  }
}
