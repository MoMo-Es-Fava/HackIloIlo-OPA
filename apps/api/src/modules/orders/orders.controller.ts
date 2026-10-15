import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { OrderStatus, Role, type UserDto } from '@irpc/types';
import { CurrentUser, Roles } from '../../common/auth.decorators';
import { AcceptOrderDto, CreateOrderDto, OrderFiltersDto, RejectOrderDto, UpdateOrderStatusDto, WeighInOrderDto } from './orders.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
@Roles(Role.USER)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  create(@Body() body: CreateOrderDto, @CurrentUser() user: UserDto) {
    return this.orders.create(body, user);
  }

  @Get('mine')
  mine(@Query('active') active: string | undefined, @CurrentUser() user: UserDto) {
    return this.orders.mine(user.id, active === 'true');
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: UserDto) {
    return this.orders.mineById(id, user.id);
  }

  @Post(':id/confirm-weight')
  confirmWeight(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: UserDto) {
    return this.orders.confirmWeight(id, user);
  }

  @Post(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: UserDto) {
    return this.orders.cancel(id, user);
  }
}

@Controller('admin')
@Roles(Role.ADMIN, Role.PLANT_STAFF)
export class AdminOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get('summary')
  summary() {
    return this.orders.summary();
  }

  @Get('orders')
  list(@Query() filters: OrderFiltersDto) {
    return this.orders.adminList(filters);
  }

  @Get('orders/:id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.orders.adminGet(id);
  }

  @Patch('orders/:id/accept')
  accept(@Param('id', ParseIntPipe) id: number, @Body() body: AcceptOrderDto, @CurrentUser() user: UserDto) {
    return this.orders.accept(id, body, user);
  }

  @Patch('orders/:id/reject')
  reject(@Param('id', ParseIntPipe) id: number, @Body() body: RejectOrderDto, @CurrentUser() user: UserDto) {
    return this.orders.reject(id, body.reason, user);
  }

  @Patch('orders/:id/status')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateOrderStatusDto, @CurrentUser() user: UserDto) {
    return this.orders.updateStatus(id, body.status, body.note, user);
  }

  @Post('orders/:id/weigh-in')
  weighIn(@Param('id', ParseIntPipe) id: number, @Body() body: WeighInOrderDto, @CurrentUser() user: UserDto) {
    return this.orders.weighIn(id, body, user);
  }

  @Roles(Role.ADMIN)
  @Get('money')
  money(@Query('from') from?: string, @Query('to') to?: string) {
    return this.orders.moneySummary(from, to);
  }

  @Roles(Role.ADMIN)
  @Get('sms-logs')
  smsLogs() {
    return this.orders.smsLogs();
  }
}
