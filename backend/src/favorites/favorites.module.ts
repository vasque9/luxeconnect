import { Module, Injectable } from '@nestjs/common';
import { Controller, Get, Post, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}
  async toggle(userId: string, profileId: string) {
    const ex = await this.prisma.favorite.findUnique({ where: { userId_profileId: { userId, profileId } } });
    if (ex) { await this.prisma.favorite.delete({ where: { id: ex.id } }); return { favorited: false }; }
    await this.prisma.favorite.create({ data: { userId, profileId } });
    return { favorited: true };
  }
  async list(userId: string) {
    const favs = await this.prisma.favorite.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { profileId: true } });
    return this.prisma.providerProfile.findMany({
      where: { id: { in: favs.map(f => f.profileId) } },
      include: { city: true, images: { where: { approved: true }, take: 1 }, listing: { where: { status: 'APPROVED' }, select: { id: true, title: true } } },
    });
  }
}

@ApiTags('Favorites') @Controller('api/favorites') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
export class FavoritesController {
  constructor(private svc: FavoritesService) {}
  @Get() list(@Req() r) { return this.svc.list(r.user.userId); }
  @Post(':profileId/toggle') toggle(@Req() r, @Param('profileId') id: string) { return this.svc.toggle(r.user.userId, id); }
}

@Module({ providers: [FavoritesService], controllers: [FavoritesController] })
export class FavoritesModule {}
