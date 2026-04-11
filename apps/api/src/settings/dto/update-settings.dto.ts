import { IsNumber, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @IsOptional()
  @IsString()
  receiptFooter?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsObject()
  paymentConfig?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  receiptConfig?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  brandingConfig?: Record<string, unknown>;
}
