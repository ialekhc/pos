import { IsOptional, IsString } from 'class-validator';

export class ReconcilePaymentDto {
  @IsString()
  paymentId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
