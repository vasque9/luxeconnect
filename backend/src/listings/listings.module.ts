import { Module, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Controller, Get, Post, Put, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.module';
import { RolesGuard, Roles } from '../auth/auth.module';

// ── DTOs ──────────────────────────────────────────────────────
export class CreateListingDto {
  @ApiProperty() @IsString() @MaxLength(120) title: string;
  @ApiProperty() @IsString() @MaxLength(5000) description: string;
  @ApiProperty() @IsUUID() categoryId: string;
}
export class UpdateListingDto {
  @IsOptional() @IsString() @MaxLength(120) title?: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @IsUUID() categoryId?: string;
}
export class ModerateListingDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] }) @IsString() status: 'APPROVED' | 'REJECTED';
  @IsOptional() @IsString() reason?: string;
}

// ── Service ───────────────────────────────────────────────────
@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateListingDto) {
    const profile = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!profile) throw new ForbiddenException('Crea tu perfil primero');
    const existing = await this.prisma.listing.findUnique({ where: { profileId: profile.id } });
    if (existing) throw new ForbiddenException('Ya tienes un anuncio');
    return this.prisma.listing.create({ data: { profileId: profile.id, ...dto, status: 'PENDING' } });
  }

  async update(userId: string, id: string, dto: UpdateListingDto) {
    const l = await this.prisma.listing.findUnique({ where: { id }, include: { profile: true } });
    if (!l) throw new NotFoundException();
    if (l.profile.userId !== userId) throw new ForbiddenException();
    await this.prisma.listingRevision.create({ data: { listingId: id, snapshot: l as any, changedBy: userId } });
    return this.prisma.listing.update({ where: { id }, data: { ...dto, status: 'PENDING' } });
  }

  async moderate(adminId: string, id: string, dto: ModerateListingDto) {
    const l = await this.prisma.listing.findUnique({ where: { id } });
    if (!l) throw new NotFoundException();
    const data: any = { status: dto.status };
    if (dto.status === 'APPROVED') data.publishedAt = new Date();
    if (dto.status === 'REJECTED') data.rejectReason = dto.reason;
    await this.prisma.auditLog.create({
      data: { userId: adminId, action: `listing.${dto.status.toLowerCase()}`, entity: 'Listing', entityId: id, metadata: { reason: dto.reason } },
    });
    return this.prisma.listing.update({ where: { id }, data });
  }

  async search(p: { categoryId?: string; cityId?: string; q?: string; minPrice?: number; maxPrice?: number; sort?: string; page?: number }) {
    const { categoryId, cityId, q, minPrice, maxPrice, sort = 'featured', page = 1 } = p;
    const limit = 20;
    const where: any = { status: 'APPROVED' };
    if (categoryId) where.categoryId = categoryId;
    if (cityId) where.profile = { ...where.profile, cityId };
    if (minPrice || maxPrice) where.profile = { ...where.profile, pricePerHour: { ...(minPrice && { gte: minPrice }), ...(maxPrice && { lte: maxPrice }) } };
    if (q) where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { profile: { alias: { contains: q, mode: 'insensitive' } } },
    ];
    const orderBy: any = sort === 'price_asc' ? { profile: { pricePerHour: 'asc' } }
      : sort === 'price_desc' ? { profile: { pricePerHour: 'desc' } }
      : { publishedAt: 'desc' };
    const [items, total] = await Promise.all([
      this.prisma.listing.findMany({
        where, orderBy, skip: (page - 1) * limit, take: limit,
        include: {
          profile: { include: { city: true, services: { include: { service: true } }, images: { where: { approved: true }, take: 3 }, promotions: { where: { status: 'ACTIVE', endsAt: { gt: new Date() } } } } },
          category: true,
        },
      }),
      this.prisma.listing.count({ where }),
    ]);
    if (sort === 'featured') items.sort((a, b) => (b.profile.promotions.length) - (a.profile.promotions.length));
    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const l = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        profile: { include: { city: true, services: { include: { service: true } }, images: { where: { approved: true } }, reviews: { where: { approved: true }, take: 10 }, promotions: { where: { status: 'ACTIVE', endsAt: { gt: new Date() } } } } },
        category: true,
      },
    });
    if (!l || l.status !== 'APPROVED') throw new NotFoundException();
    await this.prisma.providerProfile.update({ where: { id: l.profileId }, data: { viewCount: { increment: 1 } } });
    return l;
  }
}

// ── Controller ────────────────────────────────────────────────
@ApiTags('Listings')
@Controller('api/listings')
export class ListingsController {
  constructor(private svc: ListingsService) {}

  @Get() search(@Query('category') cat?: string, @Query('city') city?: string, @Query('q') q?: string,
    @Query('minPrice') min?: string, @Query('maxPrice') max?: string, @Query('sort') sort?: string, @Query('page') page?: string) {
    return this.svc.search({ categoryId: cat, cityId: city, q, minPrice: min ? +min : undefined, maxPrice: max ? +max : undefined, sort, page: page ? +page : 1 });
  }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findById(id); }

  @Post() @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('PROVIDER') @ApiBearerAuth()
  create(@Req() req, @Body() dto: CreateListingDto) { return this.svc.create(req.user.userId, dto); }

  @Put(':id') @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('PROVIDER') @ApiBearerAuth()
  update(@Req() req, @Param('id') id: string, @Body() dto: UpdateListingDto) { return this.svc.update(req.user.userId, id, dto); }

  @Post(':id/moderate') @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('ADMIN') @ApiBearerAuth()
  moderate(@Req() req, @Param('id') id: string, @Body() dto: ModerateListingDto) { return this.svc.moderate(req.user.userId, id, dto); }
}

// ── Reference Data (public) ───────────────────────────────────
@Injectable()
export class ReferenceService {
  constructor(private prisma: PrismaService) {}
  categories() { return this.prisma.category.findMany({ orderBy: { order: 'asc' } }); }
  services() { return this.prisma.service.findMany({ orderBy: { name: 'asc' } }); }
  cities() { return this.prisma.city.findMany({ orderBy: { name: 'asc' } }); }
}

@ApiTags('Reference') @Controller('api/reference')
export class ReferenceController {
  constructor(private svc: ReferenceService) {}
  @Get('categories') cats() { return this.svc.categories(); }
  @Get('services') svcs() { return this.svc.services(); }
  @Get('cities') cities() { return this.svc.cities(); }
}

// ── Module ────────────────────────────────────────────────────
@Module({ providers: [ListingsService, ReferenceService], controllers: [ListingsController, ReferenceController], exports: [ListingsService] })
export class ListingsModule {}
