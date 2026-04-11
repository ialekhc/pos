import { IsOptional, IsString, MinLength } from 'class-validator';

export class RefundSaleDto {
  @IsString()
  saleId!: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  reason?: string;
}
