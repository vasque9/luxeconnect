import { Module, Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { IsString, IsOptional, IsUUID, IsInt, IsArray, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.module';
import { RolesGuard, Roles } from '../auth/auth.module';

// ── DTOs ──────────────────────────────────────────────────────
export class CreateProfileDto {
  @ApiProperty() @IsString() @MaxLength(50) alias: string;
  @IsOptional() @IsString() @MaxLength(2000) bio?: string;
  @ApiProperty() @IsUUID() cityId: string;
  @ApiProperty() @IsInt() @Min(1) @Type(() => Number) pricePerHour: number;
  @IsOptional() @IsString() availability?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) languages?: string[];
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) serviceIds?: string[];
}
export class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(50) alias?: string;
  @IsOptional() @IsString() @MaxLength(2000) bio?: string;
  @IsOptional() @IsUUID() cityId?: string;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) pricePerHour?: number;
  @IsOptional() @IsString() availability?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) languages?: string[];
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) serviceIds?: string[];
}
export class AddImageDto {
  @ApiProperty() @IsString() url: string;
  @ApiProperty() @IsString() s3Key: string;
  @IsOptional() @IsInt() @Min(0) @Type(() => Number) order?: number;
}

// ── Service ───────────────────────────────────────────────────
@Injectable()
export class ProfilesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateProfileDto) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (u.role !== 'PROVIDER') throw new ForbiddenException('Solo proveedores');
    if (await this.prisma.providerProfile.findUnique({ where: { userId } })) throw new ConflictException('Ya tienes perfil');
    const { serviceIds, ...data } = dto;
    const p = await this.prisma.providerProfile.create({ data: { userId, ...data, languages: data.languages || ['ES'] } });
    if (serviceIds?.length) await this.prisma.profileService.createMany({ data: serviceIds.map(s => ({ profileId: p.id, serviceId: s })) });
    return this.getMe(userId);
  }

  async update(userId: string, dto: UpdateProfileDto) {
    const p = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!p) throw new NotFoundException();
    const { serviceIds, ...data } = dto;
    await this.prisma.providerProfile.update({ where: { userId }, data });
    if (serviceIds !== undefined) {
      await this.prisma.profileService.deleteMany({ where: { profileId: p.id } });
      if (serviceIds.length) await this.prisma.profileService.createMany({ data: serviceIds.map(s => ({ profileId: p.id, serviceId: s })) });
    }
    await this.prisma.listing.updateMany({ where: { profileId: p.id }, data: { status: 'PENDING' } });
    return this.getMe(userId);
  }

  async getMe(userId: string) {
    const p = await this.prisma.providerProfile.findUnique({
      where: { userId },
      include: { city: true, services: { include: { service: true } }, images: true, listing: { include: { category: true } }, promotions: { where: { status: 'ACTIVE', endsAt: { gt: new Date() } } }, reviews: { where: { approved: true }, take: 5, orderBy: { createdAt: 'desc' } } },
    });
    if (!p) throw new NotFoundException('Crea tu perfil primero');
    return p;
  }

  async stats(userId: string) {
    const p = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!p) throw new NotFoundException();
    const r = await this.prisma.review.aggregate({ where: { profileId: p.id, approved: true }, _avg: { rating: true }, _count: true });
    return { views: p.viewCount, contacts: p.contactCount, avgRating: r._avg.rating || 0, reviews: r._count, conversion: p.viewCount > 0 ? ((p.contactCount / p.viewCount) * 100).toFixed(1) + '%' : '0%' };
  }

  async addImage(userId: string, dto: AddImageDto) {
    const p = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!p) throw new NotFoundException();
    return this.prisma.profileImage.create({ data: { profileId: p.id, url: dto.url, s3Key: dto.s3Key, order: dto.order || 0, isBlurred: true, approved: false } });
  }

  async deleteImage(userId: string, imageId: string) {
    const p = await this.prisma.providerProfile.findUnique({ where: { userId } });
    const img = await this.prisma.profileImage.findUnique({ where: { id: imageId } });
    if (!img || img.profileId !== p?.id) throw new ForbiddenException();
    return this.prisma.profileImage.delete({ where: { id: imageId } });
  }

  async toggleOnline(userId: string) {
    const p = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!p) throw new NotFoundException();
    return this.prisma.providerProfile.update({ where: { userId }, data: { isOnline: !p.isOnline }, select: { isOnline: true } });
  }

  async contact(clientId: string, profileId: string) {
    const c = await this.prisma.user.findUnique({ where: { id: clientId } });
    if (!c?.ageVerified) throw new ForbiddenException('Verificación de edad requerida');
    await this.prisma.providerProfile.update({ where: { id: profileId }, data: { contactCount: { increment: 1 } } });
    const p = await this.prisma.providerProfile.findUnique({ where: { id: profileId }, include: { user: { select: { phone: true } } } });
    const ph = p?.user?.phone;
    return { phone: ph ? ph.slice(0, 4) + '***' + ph.slice(-2) : null };
  }
}

// ── Controller ────────────────────────────────────────────────
@ApiTags('Profiles') @Controller('api/profiles')
export class ProfilesController {
  constructor(private svc: ProfilesService) {}

  @Post() @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('PROVIDER') @ApiBearerAuth()
  create(@Req() r, @Body() d: CreateProfileDto) { return this.svc.create(r.user.userId, d); }

  @Put() @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('PROVIDER') @ApiBearerAuth()
  update(@Req() r, @Body() d: UpdateProfileDto) { return this.svc.update(r.user.userId, d); }

  @Get('me') @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('PROVIDER') @ApiBearerAuth()
  me(@Req() r) { return this.svc.getMe(r.user.userId); }

  @Get('me/stats') @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('PROVIDER') @ApiBearerAuth()
  stats(@Req() r) { return this.svc.stats(r.user.userId); }

  @Post('me/images') @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('PROVIDER') @ApiBearerAuth()
  addImg(@Req() r, @Body() d: AddImageDto) { return this.svc.addImage(r.user.userId, d); }

  @Delete('me/images/:id') @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('PROVIDER') @ApiBearerAuth()
  delImg(@Req() r, @Param('id') id: string) { return this.svc.deleteImage(r.user.userId, id); }

  @Post('me/toggle-online') @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('PROVIDER') @ApiBearerAuth()
  toggle(@Req() r) { return this.svc.toggleOnline(r.user.userId); }

  @Post(':profileId/contact') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  contact(@Req() r, @Param('profileId') id: string) { return this.svc.contact(r.user.userId, id); }
}

@Module({ providers: [ProfilesService], controllers: [ProfilesController], exports: [ProfilesService] })
export class ProfilesModule {}
