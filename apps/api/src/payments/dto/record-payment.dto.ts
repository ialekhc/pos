import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RecordPaymentDto {
  @IsString()
  saleId!: string;

  @IsString()
  method!: 'CASH' | 'CARD' | 'QR' | 'WALLET' | 'MANUAL';

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  currency?: string;
}
