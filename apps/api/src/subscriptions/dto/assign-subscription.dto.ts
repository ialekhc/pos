import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class AssignSubscriptionDto {
  @IsString()
  tenantId!: string;

  @IsString()
  planId!: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}
