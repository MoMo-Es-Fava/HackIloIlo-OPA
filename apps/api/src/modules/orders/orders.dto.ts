import {
  DeliveryMethod,
  OrderStatus,
  OrderType,
  PalayCondition,
  ServiceType,
  normalizePhPhone,
  type CreateOrderRequest,
} from '@irpc/types';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

// Positive kg/amount with at most 2 decimals and a sane upper bound (1,000,000 kg).
const KG = /^(?!0+(\.0+)?$)\d{1,7}(\.\d{1,2})?$/;
const KG_MESSAGE = 'Enter a weight above 0 kg, with at most 2 decimals.';
const toPhone = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? (normalizePhPhone(value) ?? value) : value;
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const toBool = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;

export class CreateOrderDto implements CreateOrderRequest {
  @IsIn(Object.values(OrderType))
  type!: OrderType;

  @IsString()
  @Matches(KG, { message: KG_MESSAGE })
  requestedKg!: string;

  @IsDateString({}, { message: 'Choose a valid date.' })
  preferredDate!: string;

  @Transform(trim)
  @IsString()
  @Length(2, 100)
  contactName!: string;

  @Transform(toPhone)
  @IsString()
  @Matches(/^\+639\d{9}$/, {
    message: 'Enter a Philippine mobile number, e.g. 0917 123 4567.',
  })
  contactPhone!: string;

  @ValidateIf((o: CreateOrderDto) => o.type === OrderType.BUY_RICE)
  @IsInt({ message: 'Choose a rice type.' })
  @Min(1)
  riceTypeId?: number;

  @ValidateIf((o: CreateOrderDto) => o.type !== OrderType.BUY_RICE)
  @IsIn(Object.values(PalayCondition), {
    message: 'Choose fresh or dry palay.',
  })
  palayCondition?: PalayCondition;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  variety?: string;

  @ValidateIf((o: CreateOrderDto) => o.type === OrderType.SELL_PALAY)
  @IsIn(Object.values(DeliveryMethod), {
    message: 'Choose whether you will deliver or need pickup.',
  })
  deliveryMethod?: DeliveryMethod;

  @ValidateIf((o: CreateOrderDto) => o.type === OrderType.SERVICE)
  @IsIn(Object.values(ServiceType), { message: 'Choose a service.' })
  serviceType?: ServiceType;
}

export class AcceptOrderDto {
  @IsOptional()
  @IsDateString({}, { message: 'Choose a valid date.' })
  scheduledDate?: string;
}

export class RejectOrderDto {
  @Transform(trim)
  @IsString()
  @Length(3, 300, { message: 'Give a short reason (3 to 300 characters).' })
  reason!: string;
}

export class UpdateStatusDto {
  @IsIn(Object.values(OrderStatus))
  status!: OrderStatus;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class WeighInDto {
  @IsOptional()
  @IsString()
  @Matches(KG, { message: KG_MESSAGE })
  wetKg?: string;

  @IsOptional()
  @IsString()
  @Matches(KG, { message: KG_MESSAGE })
  dryKg?: string;

  @IsOptional()
  @IsString()
  @Matches(KG, { message: KG_MESSAGE })
  riceKg?: string;
}

export class MyOrdersQuery {
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  active?: boolean;
}

export class AdminOrdersQuery {
  @IsOptional()
  @IsIn(Object.values(OrderStatus))
  status?: OrderStatus;

  @IsOptional()
  @IsIn(Object.values(OrderType))
  type?: OrderType;
}

export class OrderIdParam {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id!: number;
}
