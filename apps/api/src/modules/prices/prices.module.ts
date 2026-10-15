import { Module } from '@nestjs/common';
import type {
  CanActivate,
  DynamicModule,
  ModuleMetadata,
  Type,
} from '@nestjs/common';
import { PricesController } from './prices.controller';
import { PRICES_ADMIN_GUARD, PricesAdminGuard } from './prices.guard';
import { PricesRepository } from './prices.repository';

@Module({})
export class PricesModule {
  /** Both providers must be exported by the supplied modules. No permissive defaults. */
  static register(options: {
    imports: NonNullable<ModuleMetadata['imports']>;
    repository: Type<PricesRepository>;
    adminGuard: Type<CanActivate>;
  }): DynamicModule {
    return {
      module: PricesModule,
      imports: options.imports,
      controllers: [PricesController],
      providers: [
        { provide: PricesRepository, useExisting: options.repository },
        { provide: PRICES_ADMIN_GUARD, useExisting: options.adminGuard },
        PricesAdminGuard,
      ],
    };
  }
}
