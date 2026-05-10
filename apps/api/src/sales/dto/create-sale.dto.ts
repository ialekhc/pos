import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

class SaleItemInputDto {
  @IsString()
  productId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;
}

class SalePaymentInputDto {
  @IsString()
  method!: 'CASH' | 'CARD' | 'QR' | 'WALLET' | 'MANUAL';

  @IsNumber()
  @Min(0.01)
  amount!: number;
}

export class CreateSaleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemInputDto)
  items!: SaleItemInputDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalePaymentInputDto)
  payments!: SalePaymentInputDto[];

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  counterId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @IsString()
  partyId?: string;

  @IsOptional()
  @IsIn(['VENDOR', 'CLIENT'])
  partyType?: 'VENDOR' | 'CLIENT';

  @IsOptional()
  @IsString()
  partyName?: string;

  @IsOptional()
  @IsString()
  partyPhone?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  partyPercent?: number;
}

export type SaleItemInput = SaleItemInputDto;
export type SalePaymentInput = SalePaymentInputDto;
