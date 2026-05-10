import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PartyType } from '@prisma/client';
import { ActiveUser } from '../common/types/active-user.type';
import { CreatePartyDto } from './dto/create-party.dto';
import { ListPartiesDto } from './dto/list-parties.dto';
import { UpdatePartyDto } from './dto/update-party.dto';
import { PartiesRepository } from './parties.repository';

@Injectable()
export class PartiesService {
  constructor(private readonly partiesRepository: PartiesRepository) {}

  list(actor: ActiveUser, query: ListPartiesDto) {
    if (!actor.tenantId) {
      throw new ForbiddenException('Tenant context required.');
    }

    return this.partiesRepository.listByTenant({
      tenantId: actor.tenantId,
      type: query.type,
      search: query.search,
      includeInactive: query.includeInactive === 'true'
    });
  }

  async create(actor: ActiveUser, dto: CreatePartyDto) {
    if (!actor.tenantId) {
      throw new ForbiddenException('Tenant context required.');
    }

    return this.partiesRepository.create({
      tenantId: actor.tenantId,
      type: dto.type,
      name: dto.name.trim(),
      phone: dto.phone?.trim() || null,
      email: dto.email?.trim() || null,
      address: dto.address?.trim() || null,
      taxId: dto.taxId?.trim() || null,
      defaultPercent: dto.defaultPercent ?? 0,
      notes: dto.notes?.trim() || null,
      isActive: dto.isActive ?? true
    });
  }

  async update(actor: ActiveUser, partyId: string, dto: UpdatePartyDto) {
    if (!actor.tenantId) {
      throw new ForbiddenException('Tenant context required.');
    }

    const existing = await this.partiesRepository.findById(partyId);

    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Party not found.');
    }

    if (existing.tenantId !== actor.tenantId) {
      throw new ForbiddenException('Cross-tenant update denied.');
    }

    return this.partiesRepository.update(partyId, {
      ...(dto.type ? { type: dto.type as PartyType } : {}),
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
      ...(dto.email !== undefined ? { email: dto.email.trim() || null } : {}),
      ...(dto.address !== undefined ? { address: dto.address.trim() || null } : {}),
      ...(dto.taxId !== undefined ? { taxId: dto.taxId.trim() || null } : {}),
      ...(dto.defaultPercent !== undefined ? { defaultPercent: dto.defaultPercent } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes.trim() || null } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {})
    });
  }

  async remove(actor: ActiveUser, partyId: string) {
    if (!actor.tenantId) {
      throw new ForbiddenException('Tenant context required.');
    }

    const existing = await this.partiesRepository.findById(partyId);

    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Party not found.');
    }

    if (existing.tenantId !== actor.tenantId) {
      throw new ForbiddenException('Cross-tenant delete denied.');
    }

    return this.partiesRepository.softDelete(partyId);
  }
}
