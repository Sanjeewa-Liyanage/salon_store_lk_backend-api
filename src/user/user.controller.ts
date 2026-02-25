import { Controller, Post, Body, UseGuards, Get, Req, Query, Res, Patch } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './schema/user.schema';
import { UserRegistrationDto } from './dto/userregister.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './enum/userrole.enum';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Req() req: Request) {
    return this.userService.findOne(req['user']['sub']);
  }

  //todo need to move this to auth controller

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string, @Res() res: any) {
    if (!token) return res.redirect('https://salonstore.lk/verify-failed');

    const user = await this.userService.findByVerificationToken(token);
    if (!user) return res.redirect('https://salonstore.lk/verify-failed');

    await this.userService.verifyUser(user.id);

    return res.redirect('https://salonstore.lk/verify-success');
  }



  @Patch('suspend/:id')
  @UseGuards(AuthGuard('jwt'))
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Suspend a user (Admin only)' })
  @ApiResponse({ status: 200, description: 'The user has been successfully suspended.'})
  @ApiResponse({ status: 403, description: 'Access denied. Admin role required.'})
  async suspendUser(@Req() req: any, @Query('id') id: string) {
    return this.userService.suspendUser(id);
  }

  @Patch('unsuspend/:id')
  @UseGuards(AuthGuard('jwt'))
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Unsuspend a user (Admin only)' })
  @ApiResponse({ status: 200, description: 'The user has been successfully unsuspended.'})
  @ApiResponse({ status: 403, description: 'Access denied. Admin role required.'})
  async unsuspendUser(@Query('id') id: string) {
    return this.userService.unsuspendUser(id);
  }


 
}
