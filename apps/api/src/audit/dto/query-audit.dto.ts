import { IsOptional, IsString } from 'class-validator';

export class QueryAuditDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  entity?: string;

  @IsOptional()
  @IsString()
  action?: string;
}
