import { Module, Injectable, NotFoundException } from '@nestjs/common';
import { Controller, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.module';
import { RolesGuard, Roles } from '../auth/auth.module';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}
  async create(reporterId: string, listingId: string, reason: string, description?: string) {
    const l = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!l) throw new NotFoundException();
    return this.prisma.report.create({ data: { listingId, reporterId, reason, description } });
  }
  async review(adminId: string, id: string, status: string, notes?: string) {
    const r = await this.prisma.report.findUnique({ where: { id } });
    if (!r) throw new NotFoundException();
    await this.prisma.auditLog.create({ data: { userId: adminId, action: `report.${status.toLowerCase()}`, entity: 'Report', entityId: id, metadata: { notes } } });
    return this.prisma.report.update({ where: { id }, data: { status: status as any, reviewedBy: adminId, reviewNotes: notes } });
  }
}

@ApiTags('Reports') @Controller('api/reports')
export class ReportsController {
  constructor(private svc: ReportsService) {}
  @Post() @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  create(@Req() r, @Body('listingId') lid: string, @Body('reason') reason: string, @Body('description') desc?: string) { return this.svc.create(r.user.userId, lid, reason, desc); }
  @Post(':id/review') @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('ADMIN') @ApiBearerAuth()
  review(@Req() r, @Param('id') id: string, @Body('status') s: string, @Body('notes') n?: string) { return this.svc.review(r.user.userId, id, s, n); }
}

@Module({ providers: [ReportsService], controllers: [ReportsController] })
export class ReportsModule {}
