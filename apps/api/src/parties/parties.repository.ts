import { Injectable } from '@nestjs/common';
import { PartyType, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PartiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByTenant(params: {
    tenantId: string;
    type?: PartyType;
    search?: string;
    includeInactive?: boolean;
  }) {
    const search = params.search?.trim();

    return this.prisma.party.findMany({
      where: {
        tenantId: params.tenantId,
        deletedAt: null,
        ...(params.type ? { type: params.type } : {}),
        ...(params.includeInactive ? {} : { isActive: true }),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { province: { contains: search, mode: 'insensitive' } },
                { district: { contains: search, mode: 'insensitive' } },
                { taxId: { contains: search, mode: 'insensitive' } }
              ]
            }
          : {})
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }]
    });
  }

  findById(id: string) {
    return this.prisma.party.findUnique({
      where: { id }
    });
  }

  create(data: Prisma.PartyUncheckedCreateInput) {
    return this.prisma.party.create({ data });
  }

  update(id: string, data: Prisma.PartyUncheckedUpdateInput) {
    return this.prisma.party.update({
      where: { id },
      data
    });
  }

  softDelete(id: string) {
    return this.prisma.party.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date()
      }
    });
  }
}
