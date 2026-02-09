import { Controller, Post, Body, UseGuards, Get, Req, Query, Res } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './schema/user.schema';
import { UserRegistrationDto } from './dto/userregister.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Req() req: Request) {
    return this.userService.findOne(req['user']['sub']);
  }

 
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string, @Res() res: any) {
    if (!token) return res.redirect('https://salonstore.lk/verify-failed');

    const user = await this.userService.findByVerificationToken(token);
    if (!user) return res.redirect('https://salonstore.lk/verify-failed');

    await this.userService.verifyUser(user.id);

    return res.redirect('https://salonstore.lk/verify-success');
  }


 
}
