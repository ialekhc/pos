import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdatePlanFeatureDto {
  @IsString()
  featureKey!: string;

  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsNumber()
  limitValue?: number;
}
