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
    if (!token) {
      res.status(400).send('Invalid verification link');
      return;
    }

    const snapshot = await this.userService.findByVerificationToken(token);

    if (!snapshot) {
      res.status(400).send('Verification link is invalid or expired');
      return;
    }

    await this.userService.verifyUser(snapshot.id);

    res.send(`
      <h2>Email verified successfully 🎉</h2>
      <p>You can now log in to SalonStore.</p>
    `);
  }

 
}
