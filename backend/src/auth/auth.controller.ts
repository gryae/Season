import { Controller, Post, Body, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() body: Record<string, any>) {
    return this.authService.login(body.username, body.password);
  }

  @Public()
  @Get('seed')
  seedAdmin() {
    return this.authService.seedAdmin();
  }
}
