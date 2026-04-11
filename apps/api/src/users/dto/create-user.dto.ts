import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRoleCode } from '@prisma/client';

export class CreateUserDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  role!: UserRoleCode;
}
