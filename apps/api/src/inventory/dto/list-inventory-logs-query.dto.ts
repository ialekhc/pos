import { Type } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, Min } from 'class-validator';

const INVENTORY_ACTION_FILTERS = ['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'SALE', 'REFUND'] as const;

export class ListInventoryLogsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsIn(INVENTORY_ACTION_FILTERS)
  action?: (typeof INVENTORY_ACTION_FILTERS)[number];

  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  take?: number;
}
