import { Module, Injectable, BadRequestException } from '@nestjs/common';
import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private s3: S3Client | null = null;
  private bucket: string;
  constructor(private config: ConfigService) {
    const r = config.get('AWS_REGION'), a = config.get('AWS_ACCESS_KEY_ID'), s = config.get('AWS_SECRET_ACCESS_KEY');
    if (r && a && s) this.s3 = new S3Client({ region: r, credentials: { accessKeyId: a, secretAccessKey: s } });
    this.bucket = config.get('AWS_S3_BUCKET') || 'luxeconnect-uploads';
  }
  async presign(userId: string, contentType: string) {
    if (!this.s3) throw new BadRequestException('S3 no configurado');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) throw new BadRequestException('Tipo no permitido');
    const key = `profiles/${userId}/${uuidv4()}.${contentType.split('/')[1]}`;
    const url = await getSignedUrl(this.s3, new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }), { expiresIn: 300 });
    return { uploadUrl: url, key, publicUrl: `https://${this.bucket}.s3.amazonaws.com/${key}`, expiresIn: 300 };
  }
}

@ApiTags('Upload') @Controller('api/upload')
export class UploadController {
  constructor(private svc: UploadService) {}
  @Post('presigned-url') @UseGuards(AuthGuard('jwt')) @ApiBearerAuth()
  url(@Req() r, @Body('contentType') ct: string) { return this.svc.presign(r.user.userId, ct); }
}

@Module({ providers: [UploadService], controllers: [UploadController] })
export class UploadModule {}
