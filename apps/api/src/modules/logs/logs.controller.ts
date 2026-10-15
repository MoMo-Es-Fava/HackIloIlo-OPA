import { Controller, Get } from '@nestjs/common';
import { Role } from '@irpc/types';
import { Roles } from '../../common/auth.decorators';
import { LogsService } from './logs.service';

@Roles(Role.ADMIN, Role.PLANT_STAFF)
@Controller('admin/logs')
export class LogsController {
  constructor(private readonly logs: LogsService) {}

  @Get()
  list() { return this.logs.list(); }
}
