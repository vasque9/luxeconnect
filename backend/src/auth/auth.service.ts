import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.module';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email ya registrado');
    const hash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash: hash, role: dto.role as any, phone: dto.phone },
    });
    return this.tokens(user.id, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash)))
      throw new UnauthorizedException('Credenciales inválidas');
    if (user.banned) throw new UnauthorizedException('Cuenta suspendida');
    return this.tokens(user.id, user.role);
  }

  async refresh(refreshToken: string) {
    const s = await this.prisma.session.findUnique({ where: { refreshToken } });
    if (!s || s.expiresAt < new Date()) throw new UnauthorizedException('Token expirado');
    const user = await this.prisma.user.findUnique({ where: { id: s.userId } });
    await this.prisma.session.delete({ where: { id: s.id } });
    return this.tokens(user.id, user.role);
  }

  async logout(refreshToken: string) {
    await this.prisma.session.deleteMany({ where: { refreshToken } });
    return { ok: true };
  }

  private async tokens(userId: string, role: string) {
    const accessToken = this.jwt.sign({ sub: userId, role });
    const refreshToken = uuidv4();
    await this.prisma.session.create({
      data: { userId, refreshToken, expiresAt: new Date(Date.now() + 7 * 86400000) },
    });
    return { accessToken, refreshToken, expiresIn: 900 };
  }
}
