import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ActiveUser } from '../common/types/active-user.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  private getAccessSecret() {
    return this.configService.getOrThrow<string>('jwt.accessSecret');
  }

  private getRefreshSecret() {
    return this.configService.getOrThrow<string>('jwt.refreshSecret');
  }

  private getAccessExpiresIn() {
    return this.configService.getOrThrow<string>('jwt.accessExpiresIn') as unknown as number;
  }

  private getRefreshExpiresIn() {
    return this.configService.getOrThrow<string>('jwt.refreshExpiresIn') as unknown as number;
  }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      include: { role: true, tenant: true }
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (loginDto.tenantSlug && user.tenant?.slug !== loginDto.tenantSlug) {
      throw new ForbiddenException('Tenant mismatch.');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const payload: ActiveUser = {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role.code
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.getAccessSecret(),
      expiresIn: this.getAccessExpiresIn()
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.getRefreshSecret(),
      expiresIn: this.getRefreshExpiresIn()
    });

    await this.persistRefreshToken(user, refreshToken);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.code,
        tenantId: user.tenantId,
        tenantSlug: user.tenant?.slug ?? null
      }
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<ActiveUser>(refreshToken, {
        secret: this.getRefreshSecret()
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        include: { role: true }
      });

      if (!user || !user.refreshTokenHash || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token.');
      }

      const tokenMatches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
      if (!tokenMatches) {
        throw new UnauthorizedException('Invalid refresh token.');
      }

      const nextPayload: ActiveUser = {
        userId: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role.code
      };

      const accessToken = await this.jwtService.signAsync(nextPayload, {
        secret: this.getAccessSecret(),
        expiresIn: this.getAccessExpiresIn()
      });

      return { accessToken };
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null }
    });

    return { success: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, tenant: true }
    });

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role.code,
      tenantId: user.tenantId,
      tenantSlug: user.tenant?.slug ?? null,
      tenantName: user.tenant?.name ?? null
    };
  }

  private async persistRefreshToken(user: User, refreshToken: string) {
    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash }
    });
  }
}
