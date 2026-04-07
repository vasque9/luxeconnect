import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @MinLength(8) password: string;
  @ApiProperty({ enum: ['PROVIDER', 'CLIENT'] }) @IsString() role: 'PROVIDER' | 'CLIENT';
  @ApiProperty({ required: false }) @IsOptional() @IsString() phone?: string;
}

export class LoginDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() password: string;
}

export class RefreshDto {
  @ApiProperty() @IsString() refreshToken: string;
}
