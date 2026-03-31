import { Controller, Post, Body, UseGuards, Get, Req, Query, Res, Patch, Param } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './schema/user.schema';
import { UserRegistrationDto } from './dto/userregister.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './enum/userrole.enum';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserStatus } from './enum/userstatus.enum';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }



  @Get('all')
  @UseGuards(AuthGuard('jwt'))
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all users with pagination (Admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated users list returned successfully.' })
  @ApiResponse({ status: 403, description: 'Access denied. Admin role required.' })
  async getAllUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: UserStatus,
    @Query('role') role?: UserRole,
  ) {
    return this.userService.getUsersWithPagination(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      status,
      role,
    );
  }

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

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'The user has been successfully retrieved.' })
  @ApiResponse({ status: 403, description: 'Access denied. Admin role required.' })
  async getUserById(@Req() req: any, @Param('id') id: string) {
    return this.userService.getById(id);
  }



  @Patch('suspend/:id')
  @UseGuards(AuthGuard('jwt'))
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Suspend a user (Admin only)' })
  @ApiResponse({ status: 200, description: 'The user has been successfully suspended.' })
  @ApiResponse({ status: 403, description: 'Access denied. Admin role required.' })
  async suspendUser(@Req() req: any, @Param('id') id: string) {
    return this.userService.suspendUser(id);
  }

  @Patch('unsuspend/:id')
  @UseGuards(AuthGuard('jwt'))
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Unsuspend a user (Admin only)' })
  @ApiResponse({ status: 200, description: 'The user has been successfully unsuspended.' })
  @ApiResponse({ status: 403, description: 'Access denied. Admin role required.' })
  async unsuspendUser(@Req() req: any, @Param('id') id: string) {
    return this.userService.unsuspendUser(id);
  }



}
