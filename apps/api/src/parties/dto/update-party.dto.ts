import { PartyType } from '@prisma/client';
import { IsBoolean, IsEmail, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdatePartyDto {
  @IsOptional()
  @IsEnum(PartyType)
  type?: PartyType;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  defaultPercent?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
