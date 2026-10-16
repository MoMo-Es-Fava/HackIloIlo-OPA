import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { Role, type UserDto } from '@irpc/types';
import { CurrentUser, Roles } from '../../common/auth.decorators';
import { BadInputDto, BatchDamageDto, CompleteMillingDto, CreateBatchDto, StartMillingDto } from './batches.dto';
import { BatchesService } from './batches.service';

@Roles(Role.ADMIN, Role.PLANT_STAFF)
@Controller('admin/batches')
export class BatchesController {
  constructor(private readonly batches: BatchesService) {}

  @Get('eligible-orders')
  eligibleOrders() { return this.batches.eligibleOrders(); }

  @Get('bad-inputs')
  badInputs() { return this.batches.list(true); }

  @Get()
  list() { return this.batches.list(false); }

  @Post()
  create(@Body() dto: CreateBatchDto, @CurrentUser() actor: UserDto) {
    return this.batches.create(dto.orderIds, actor.id);
  }

  @Post(':id/items')
  addOrders(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateBatchDto, @CurrentUser() actor: UserDto) {
    return this.batches.addOrders(id, dto.orderIds, actor.id);
  }

  @Post(':id/start-drying')
  startDrying(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: UserDto) {
    return this.batches.startDrying(id, actor.id);
  }

  @Post(':id/start-milling')
  startMilling(@Param('id', ParseIntPipe) id: number, @Body() dto: StartMillingDto, @CurrentUser() actor: UserDto) {
    return this.batches.startMilling(id, dto, actor.id);
  }

  @Post(':id/complete-milling')
  completeMilling(@Param('id', ParseIntPipe) id: number, @Body() dto: CompleteMillingDto, @CurrentUser() actor: UserDto) {
    return this.batches.completeMilling(id, dto, actor.id);
  }

  @Post(':id/damages')
  damage(@Param('id', ParseIntPipe) id: number, @Body() dto: BatchDamageDto, @CurrentUser() actor: UserDto) {
    return this.batches.recordDamage(id, dto, actor.id);
  }

  @Post(':id/bad-input')
  badInput(@Param('id', ParseIntPipe) id: number, @Body() dto: BadInputDto, @CurrentUser() actor: UserDto) {
    return this.batches.flagBadInput(id, dto, actor.id);
  }

  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: UserDto) {
    return this.batches.restoreBadInput(id, actor.id);
  }

  @Get(':id')
  one(@Param('id', ParseIntPipe) id: number) { return this.batches.get(id); }
}
