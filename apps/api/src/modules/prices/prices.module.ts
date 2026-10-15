import { Module } from '@nestjs/common';
import type { DynamicModule, ModuleMetadata, Type } from '@nestjs/common';
import { PricesController } from './prices.controller';
import { PricesRepository } from './prices.repository';

@Module({})
export class PricesModule {
  /** Both providers must be exported by the supplied modules. No permissive defaults. */
  static register(options: {
    imports: NonNullable<ModuleMetadata['imports']>;
    repository: Type<PricesRepository>;
  }): DynamicModule {
    return {
      module: PricesModule,
      imports: options.imports,
      controllers: [PricesController],
      providers: [
        { provide: PricesRepository, useExisting: options.repository },
      ],
    };
  }
}
