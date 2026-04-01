import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/enum/userrole.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Auth } from 'firebase-admin/auth';
import { AuthGuard } from '@nestjs/passport';


@Controller('dashboard')

export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

    @Get('admin/overview')
    @Roles(UserRole.ADMIN)
    async getAdminOverview() {
        const data = await this.dashboardService.getAdminOverview();
        return {
            message: 'Admin dashboard overview retrieved successfully',
            data
        };
    }

    @Get('owner/overview')
    @UseGuards(AuthGuard('jwt'))
    @Roles(UserRole.SALON_OWNER)
    async getOwnerOverview(@Req() req: any) {
        const ownerId = req.user.sub;
        const data = await this.dashboardService.getOwnerOverview(ownerId);
        return {
            message: 'Salon owner dashboard overview retrieved successfully',
            data
        };
    }

}