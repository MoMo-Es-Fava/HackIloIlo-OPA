import {
  DeliveryMethod,
  OrderStatus,
  OrderType,
  PalayCondition,
  ServiceType,
} from '@irpc/types';
import {
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  IsDateString,
  IsInt,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateOrderDto {
  @IsIn(Object.values(OrderType))
  type!: OrderType;

  @IsNumberString()
  requestedKg!: string;

  @IsDateString()
  preferredDate!: string;

  @IsString()
  @MaxLength(100)
  contactName!: string;

  @IsString()
  @MaxLength(20)
  @Matches(/^\+639\d{9}$/)
  contactPhone!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  riceTypeId?: number;

  @IsOptional()
  @IsIn(Object.values(PalayCondition))
  palayCondition?: PalayCondition;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  variety?: string;

  @IsOptional()
  @IsIn(Object.values(DeliveryMethod))
  deliveryMethod?: DeliveryMethod;

  @IsOptional()
  @IsIn(Object.values(ServiceType))
  serviceType?: ServiceType;
}

export class OrderFiltersDto {
  @IsOptional()
  @IsIn(Object.values(OrderStatus))
  status?: OrderStatus;

  @IsOptional()
  @IsIn(Object.values(OrderType))
  type?: OrderType;
}

export class AcceptOrderDto {
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;
}

export class RejectOrderDto {
  @IsString()
  @MaxLength(300)
  reason!: string;
}

export class UpdateOrderStatusDto {
  @IsIn(Object.values(OrderStatus))
  status!: OrderStatus;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class WeighInOrderDto {
  @IsOptional()
  @IsNumberString()
  wetKg?: string;

  @IsOptional()
  @IsNumberString()
  dryKg?: string;

  @IsOptional()
  @IsNumberString()
  riceKg?: string;
}
