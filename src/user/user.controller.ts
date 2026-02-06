import { Controller, Post, Body, UseGuards, Get, Req } from '@nestjs/common';
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
 
}
