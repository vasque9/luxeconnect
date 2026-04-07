import { Module, Injectable, BadRequestException } from '@nestjs/common';
import { Controller, Post, Get, Body, Query, Req, Res, Headers, UseGuards, RawBodyRequest } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Response, Request } from 'express';
import { PrismaService } from '../prisma/prisma.module';
import { RolesGuard, Roles } from '../auth/auth.module';

@Injectable()
export class PaymentsService {
  private stripe: Stripe | null = null;
  constructor(private prisma: PrismaService, private config: ConfigService) {
    const key = this.config.get('STRIPE_SECRET_KEY');
    if (key) this.stripe = new Stripe(key, { apiVersion: '2023-10-16' as any });
  }

  async pricing() { return this.prisma.promotionPricing.findMany({ orderBy: { priceEur: 'asc' } }); }

  async checkout(userId: string, type: string) {
    if (!this.stripe) throw new BadRequestException('Stripe no configurado');
    const pr = await this.prisma.promotionPricing.findUnique({ where: { type: type as any } });
    if (!pr) throw new BadRequestException('Tipo inválido');
    const profile = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!profile) throw new BadRequestException('Necesitas perfil');
    const pay = await this.prisma.payment.create({ data: { userId, amount: pr.priceEur, description: pr.name, metadata: { type, profileId: profile.id } } });
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price_data: { currency: 'eur', unit_amount: pr.priceEur, product_data: { name: pr.name } }, quantity: 1 }],
      mode: 'payment',
      success_url: `${this.config.get('FRONTEND_URL')}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.config.get('FRONTEND_URL')}/payment/cancel`,
      metadata: { paymentId: pay.id, profileId: profile.id, promotionType: type },
    });
    await this.prisma.payment.update({ where: { id: pay.id }, data: { stripeSessionId: session.id } });
    return { sessionUrl: session.url, paymentId: pay.id };
  }

  async webhook(payload: Buffer, sig: string) {
    if (!this.stripe) return;
    const ev = this.stripe.webhooks.constructEvent(payload, sig, this.config.get('STRIPE_WEBHOOK_SECRET'));
    if (ev.type === 'checkout.session.completed') {
      const s = ev.data.object as Stripe.Checkout.Session;
      const { paymentId, profileId, promotionType } = s.metadata;
      await this.prisma.payment.update({ where: { id: paymentId }, data: { paid: true, stripePaymentId: s.payment_intent as string } });
      const pr = await this.prisma.promotionPricing.findUnique({ where: { type: promotionType as any } });
      await this.prisma.promotion.create({ data: { profileId, paymentId, type: promotionType as any, endsAt: new Date(Date.now() + pr.duration * 86400000) } });
      const p = await this.prisma.providerProfile.findUnique({ where: { id: profileId } });
      await this.prisma.notification.create({ data: { userId: p.userId, title: 'Promoción activada', body: `${pr.name} activa por ${pr.duration} días`, link: '/dashboard' } });
    }
  }

  async history(userId: string, page = 1) {
    const limit = 20;
    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, include: { promotion: true } }),
      this.prisma.payment.count({ where: { userId } }),
    ]);
    return { items, total, page };
  }
}

@ApiTags('Payments') @Controller('api/payments')
export class PaymentsController {
  constructor(private svc: PaymentsService) {}

  @Get('pricing') pricing() { return this.svc.pricing(); }

  @Post('checkout') @UseGuards(AuthGuard('jwt'), RolesGuard) @Roles('PROVIDER') @ApiBearerAuth()
  checkout(@Req() r, @Body('promotionType') t: string) { return this.svc.checkout(r.user.userId, t); }

  @Post('webhook') async webhook(@Req() r: RawBodyRequest<Request>, @Headers('stripe-signature') sig: string, @Res() res: Response) {
    try { await this.svc.webhook(r.rawBody, sig); res.sendStatus(200); } catch (e) { res.status(400).send(e.message); }
  }

  @Get('history') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  history(@Req() r, @Query('page') p?: string) { return this.svc.history(r.user.userId, p ? +p : 1); }
}

@Module({ providers: [PaymentsService], controllers: [PaymentsController] })
export class PaymentsModule {}
