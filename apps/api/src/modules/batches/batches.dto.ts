import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

const KG = /^(?!0+(\.0+)?$)\d{1,7}(\.\d{1,2})?$/;
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  orderIds!: number[];
}

export class StartMillingDto {
  // Required only when this batch was dried at IRPC.
  @IsOptional()
  @IsString()
  @Matches(KG, { message: 'Enter a dried weight above 0 kg.' })
  dryKg?: string;
}

export class CompleteMillingDto {
  @IsString()
  @Matches(KG, { message: 'Enter a milled rice weight above 0 kg.' })
  riceKg!: string;
}

export class BadInputDto {
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  reason!: string;
}

export class BatchDamageDto {
  @IsString()
  @Matches(KG, { message: 'Enter a damaged weight above 0 kg.' })
  kg!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  note?: string;
}
