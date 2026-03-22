import { Body, Controller, Post, UseGuards, Req, Param, Patch, Get, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { SalonService } from './salon.service';
import { SalonCreateDto } from './dto/salon-create.dto';
import { SalonUpdateDto } from './dto/salon-update.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SalonStatus } from './enum/salonstatus.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/enum/userrole.enum';

@ApiBearerAuth()
@Controller('salon')
export class SalonController {
    constructor(private salonService: SalonService) {}

    @Post('create')
    @UseGuards(AuthGuard('jwt')) 
    @ApiOperation({ summary: 'Create a new salon' })
    @ApiResponse({ status: 201, description: 'The salon has been successfully created.'})
    async createSalon(@Body() dto: SalonCreateDto, @Req() req: any) {
        return this.salonService.createSalon(dto, req.user.sub);
    }
    
    @Patch('update/:id')
    @UseGuards(AuthGuard('jwt'))
    @ApiOperation({ summary: 'Update an existing salon' })
    @ApiResponse({ status: 200, description: 'The salon has been successfully updated.'})
    async updateSalon(@Param('id') id: string, @Body() dto: SalonUpdateDto) {
        return this.salonService.updateSalon(id, dto);
    }

    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(UserRole.ADMIN)
    @Get('all')
    @ApiOperation({ summary: 'Get all salons (Admin only)' })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiResponse({ status: 200, description: 'List of all salons.'})
    @ApiResponse({ status: 403, description: 'Access denied. Admin role required.'})
    async getAllSalons(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    ) {
        return this.salonService.getAllSalons(page, limit);
    }

    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(UserRole.ADMIN)
    @Get('pending')
    @ApiOperation({ summary: 'Get pending salons (Admin only)' })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiResponse({ status: 200, description: 'List of pending salons.'})
    @ApiResponse({ status: 403, description: 'Access denied. Admin role required.'})
    async getPendingSalons(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    ) {
        return this.salonService.getPendingSalons(page, limit);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get salon details by ID' })
    @ApiResponse({ status: 200, description: 'The salon details.'})
    async getSalonById(@Param('id') id: string) {
        return this.salonService.getSalonById(id);
    }

    @Post('delete/:id')
    @UseGuards(AuthGuard('jwt'))
    @ApiOperation({ summary: 'Delete an existing salon' })
    @ApiResponse({ status: 200, description: 'The salon has been successfully deleted.'})
    async deleteSalon(@Param('id') id: string, @Req() req: any) {
        return this.salonService.deleteSalon(id, req.user.sub);
    }

    @Patch('suspend/:id')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Suspend a salon (Admin only)' })
    @ApiResponse({ status: 200, description: 'The salon has been successfully suspended.'})
    @ApiResponse({ status: 403, description: 'Access denied.Admin role required.'})
    async suspendSalon(@Req() req: any, @Param('id') id: string, @Body('reason') reason: string) {
        console.log(`User ${req.user} is attempting to suspend salon with ID: ${id}`);
        
        return this.salonService.suspendSalon(id, reason);
    }

    @Patch('unsuspend/:id')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Unsuspend a salon (Admin only)' })
    @ApiResponse({ status: 200, description: 'The salon has been successfully unsuspended.'})
    @ApiResponse({ status: 403, description: 'Access denied. Admin role required.'})
    async unsuspendSalon(@Param('id') id: string) {
        return this.salonService.unsuspendSalon(id);
    }

    @Patch('status/:id')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Update salon status (Admin only)' })
    @ApiResponse({ status: 200, description: 'The salon status has been successfully updated.'})
    @ApiResponse({ status: 403, description: 'Access denied. Admin role required.'})
    async updateSalonStatus(@Param('id') id: string, @Body('status') status: SalonStatus) {

        return this.salonService.updateSalonStatus(id, status);
    }

    @Patch('activate/:id')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Activate a salon (Admin only)' })
    @ApiResponse({ status: 200, description: 'The salon has been successfully activated.'})
    @ApiResponse({ status: 403, description: 'Access denied. Admin role required.'})
    async activateSalon(@Param('id') id: string) {
        return this.salonService.activateSalon(id);
    }

    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(UserRole.ADMIN)
    @Patch('reject/:id')
    @ApiOperation({ summary: 'Reject a salon (Admin only)' })
    @ApiResponse({ status: 200, description: 'The salon has been successfully rejected.'})
    @ApiResponse({ status: 403, description: 'Access denied. Admin role required.'})
    async rejectSalon(@Param('id') id: string, @Body('reason') reason: string) {
        return this.salonService.rejectSalon(id, reason);
    }
    
}
