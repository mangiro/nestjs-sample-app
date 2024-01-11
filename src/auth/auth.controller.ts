import {
  Controller,
  Post,
  Body,
  HttpCode,
  Res,
  Req,
  Get,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserEntity } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() { email, password }: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken } = await this.authService.login(email, password);
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: true,
    });
  }

  @Get('user')
  @UseGuards(JwtAuthGuard)
  async findOne(@Req() req: any) {
    return new UserEntity(await this.usersService.findOne({ id: req.user.id }));
  }
}
