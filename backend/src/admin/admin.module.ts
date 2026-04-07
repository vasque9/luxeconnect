import { Module, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.module';
import { RolesGuard, Roles } from '../auth/auth.module';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async dashboard() {
    const m = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const [users, listings, pending, reports, rev, revTotal, newU] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.listing.count({ where: { status: 'APPROVED' } }),
      this.prisma.listing.count({ where: { status: 'PENDING' } }),
      this.prisma.report.count({ where: { status: 'PENDING' } }),
      this.prisma.payment.aggregate({ where: { paid: true, createdAt: { gte: m } }, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: { paid: true }, _sum: { amount: true } }),
      this.prisma.user.count({ where: { createdAt: { gte: m } } }),
    ]);
    return { users, listings, pending, reports, monthlyEur: (rev._sum.amount || 0) / 100, totalEur: (revTotal._sum.amount || 0) / 100, newUsers: newU };
  }

  async pendingListings(page = 1) {
    const limit = 20;
    const [items, total] = await Promise.all([
      this.prisma.listing.findMany({
        where: { status: 'PENDING' },
        include: { profile: { include: { city: true, user: { select: { email: true, ageVerified: true } }, images: true, services: { include: { service: true } } } }, category: true, revisions: { take: 3, orderBy: { createdAt: 'desc' } } },
        orderBy: { createdAt: 'asc' }, skip: (page - 1) * limit, take: limit,
      }),
      this.prisma.listing.count({ where: { status: 'PENDING' } }),
    ]);
    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }

  async allUsers(page = 1, role?: string) {
    const where: any = {}; if (role) where.role = role;
    const limit = 30;
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where, select: { id: true, email: true, role: true, banned: true, emailVerified: true, ageVerified: true, createdAt: true, profile: { select: { alias: true, city: { select: { name: true } } } } },
        orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }

  async ban(adminId: string, userId: string, reason: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new NotFoundException();
    await this.prisma.user.update({ where: { id: userId }, data: { banned: true } });
    if (u.role === 'PROVIDER') await this.prisma.listing.updateMany({ where: { profile: { userId } }, data: { status: 'SUSPENDED' } });
    await this.prisma.session.deleteMany({ where: { userId } });
    await this.prisma.auditLog.create({ data: { userId: adminId, action: 'user.ban', entity: 'User', entityId: userId, metadata: { reason } } });
    return { ok: true };
  }

  async unban(adminId: string, userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { banned: false } });
    await this.prisma.auditLog.create({ data: { userId: adminId, action: 'user.unban', entity: 'User', entityId: userId } });
    return { ok: true };
  }

  async approveImage(adminId: string, id: string) {
    await this.prisma.profileImage.update({ where: { id }, data: { approved: true } });
    await this.prisma.auditLog.create({ data: { userId: adminId, action: 'image.approve', entity: 'ProfileImage', entityId: id } });
    return { ok: true };
  }

  async rejectImage(adminId: string, id: string) {
    await this.prisma.profileImage.delete({ where: { id } });
    await this.prisma.auditLog.create({ data: { userId: adminId, action: 'image.reject', entity: 'ProfileImage', entityId: id } });
    return { ok: true };
  }

  async logs(page = 1) {
    const limit = 50;
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, include: { user: { select: { email: true } } }, skip: (page - 1) * limit, take: limit }),
      this.prisma.auditLog.count(),
    ]);
    return { items, total, page };
  }

  async pendingReports(page = 1) {
    const limit = 20;
    const [items, total] = await Promise.all([
      this.prisma.report.findMany({ where: { status: 'PENDING' }, include: { listing: { include: { profile: { select: { alias: true } } } }, reporter: { select: { email: true } } }, orderBy: { createdAt: 'asc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.report.count({ where: { status: 'PENDING' } }),
    ]);
    return { items, total, page };
  }

  async updatePricing(type: string, priceEur: number, duration: number) {
    return this.prisma.promotionPricing.update({ where: { type: type as any }, data: { priceEur, duration } });
  }

  async categories() { return this.prisma.category.findMany({ orderBy: { order: 'asc' } }); }
  async services() { return this.prisma.service.findMany({ orderBy: { name: 'asc' } }); }
  async cities() { return this.prisma.city.findMany({ orderBy: { name: 'asc' } }); }

  async deleteUser(adminId: string, userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new NotFoundException('Usuario no encontrado');
    if (u.role === 'ADMIN') throw new ForbiddenException('No puedes eliminar a otro admin');

    // Delete in order to respect foreign keys
    if (u.role === 'PROVIDER') {
      const profile = await this.prisma.providerProfile.findUnique({ where: { userId } });
      if (profile) {
        await this.prisma.promotion.deleteMany({ where: { profileId: profile.id } });
        await this.prisma.review.deleteMany({ where: { profileId: profile.id } });
        await this.prisma.profileService.deleteMany({ where: { profileId: profile.id } });
        await this.prisma.profileImage.deleteMany({ where: { profileId: profile.id } });
        await this.prisma.listingRevision.deleteMany({ where: { listing: { profileId: profile.id } } });
        await this.prisma.report.deleteMany({ where: { listing: { profileId: profile.id } } });
        await this.prisma.listing.deleteMany({ where: { profileId: profile.id } });
        await this.prisma.favorite.deleteMany({ where: { profileId: profile.id } });
        await this.prisma.providerProfile.delete({ where: { id: profile.id } });
      }
    }

    await this.prisma.favorite.deleteMany({ where: { userId } });
    await this.prisma.review.deleteMany({ where: { authorId: userId } });
    await this.prisma.report.deleteMany({ where: { reporterId: userId } });
    await this.prisma.notification.deleteMany({ where: { userId } });
    await this.prisma.payment.deleteMany({ where: { userId } });
    await this.prisma.session.deleteMany({ where: { userId } });
    await this.prisma.user.delete({ where: { id: userId } });

    await this.prisma.auditLog.create({
      data: { userId: adminId, action: 'user.delete', entity: 'User', entityId: userId, metadata: { email: u.email, role: u.role } },
    });

    return { ok: true, message: 'Usuario eliminado' };
  }
}

@ApiTags('Admin') @Controller('api/admin') @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('ADMIN') @ApiBearerAuth()
export class AdminController {
  constructor(private svc: AdminService) {}
  @Get('dashboard') dashboard() { return this.svc.dashboard(); }
  @Get('listings/pending') pending(@Query('page') p?: string) { return this.svc.pendingListings(p ? +p : 1); }
  @Get('users') users(@Query('page') p?: string, @Query('role') r?: string) { return this.svc.allUsers(p ? +p : 1, r); }
  @Post('users/:id/ban') ban(@Req() r, @Param('id') id: string, @Body('reason') reason: string) { return this.svc.ban(r.user.userId, id, reason); }
  @Post('users/:id/unban') unban(@Req() r, @Param('id') id: string) { return this.svc.unban(r.user.userId, id); }
  @Delete('users/:id') deleteUser(@Req() r, @Param('id') id: string) { return this.svc.deleteUser(r.user.userId, id); }
  @Post('images/:id/approve') appImg(@Req() r, @Param('id') id: string) { return this.svc.approveImage(r.user.userId, id); }
  @Post('images/:id/reject') rejImg(@Req() r, @Param('id') id: string) { return this.svc.rejectImage(r.user.userId, id); }
  @Get('audit-logs') logs(@Query('page') p?: string) { return this.svc.logs(p ? +p : 1); }
  @Get('reports') reports(@Query('page') p?: string) { return this.svc.pendingReports(p ? +p : 1); }
  @Put('pricing/:type') pricing(@Param('type') t: string, @Body() b: { priceEur: number; duration: number }) { return this.svc.updatePricing(t, b.priceEur, b.duration); }
  @Get('categories') cats() { return this.svc.categories(); }
  @Get('services') svcs() { return this.svc.services(); }
  @Get('cities') cities() { return this.svc.cities(); }
}

@Module({ providers: [AdminService], controllers: [AdminController] })
export class AdminModule {}
