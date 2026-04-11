import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePlanDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  monthlyPrice!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  yearlyPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxProducts?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxOrdersPerYear?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxStaffAccounts?: number;

  @IsBoolean()
  domainIncluded!: boolean;

  @IsString()
  hostingPackage!: string;

  @IsBoolean()
  maintenanceIncluded!: boolean;
}
