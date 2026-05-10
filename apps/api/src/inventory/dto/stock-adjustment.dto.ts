import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class StockAdjustmentDto {
  @IsString()
  productId!: string;

  @IsIn(['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT'])
  action!: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT';

  @IsInt()
  @Min(0)
  quantity!: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  partyId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  partyPercent?: number;
}
