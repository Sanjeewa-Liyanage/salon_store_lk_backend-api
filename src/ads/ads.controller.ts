import { Body, Controller, Patch, Post, Req, UseGuards, Get, Param, BadRequestException, Query } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AdsService } from './ads.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdsCreateDto } from './dto/adscreate.dto';
import { UserRole } from '../user/enum/userrole.enum';
import { AuthGuard } from '@nestjs/passport';
import { SalonService } from '../salon/salon.service';
import { AdsPaginationQueryDto } from './dto/ads-pagination-query.dto';



@ApiBearerAuth()
@Controller('ads')

export class AdsController {
    constructor(
        private adsService: AdsService,
        private salonService: SalonService
    ) {}

    @Post('create')
    @UseGuards(AuthGuard('jwt'))
    @Roles(UserRole.SALON_OWNER)
    async createAd(@Body()dto: AdsCreateDto, @Req()req: any){
        return this.adsService.createAd(dto, req.user.sub); 
    }

    @Patch('approve/:id')
    @UseGuards(AuthGuard('jwt'))
    @Roles(UserRole.ADMIN)
    async approveAd(@Req()req: any){
        return this.adsService.approveAd(req.params.id); 
    }

    @Patch('reject/:id')
    @UseGuards(AuthGuard('jwt'))
    @Roles(UserRole.ADMIN)
    async rejectAd(@Req()req: any, @Body('reason') reason: string){
        return this.adsService.rejectAd(req.params.id, reason); 
    }
    
    @Get('all-priority')
    async getAllAds(@Req()req: any){
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        return this.adsService.getAdsByPriority(page, limit);
    }

    

    @Get('admin/all')
    @UseGuards(AuthGuard('jwt'))
    @Roles(UserRole.ADMIN)
    async getAllAdsAdmin(@Query() query: AdsPaginationQueryDto) {
        return this.adsService.getAllAds(query.page, query.limit, query.type);
    }

    @Get('status/:status')
    @UseGuards(AuthGuard('jwt'))
    @Roles(UserRole.ADMIN)
    async getAdsByStatus(@Param('status') status: string, @Query() query: AdsPaginationQueryDto) {
        return this.adsService.getAdsByStatus(status, query.page, query.limit);
    }

    @Get('active/:id')
    async getActiveAdById(@Param('id') id: string) {
        return this.adsService.getActiveAdById(id);
    }
    //todo change if needed

    @Get(':id/payment')
    @UseGuards(AuthGuard('jwt'))
    async getAdsAndPayment(@Param('id') adId: string, @Req() req: any) {
        const userRole = req.user.role;
        const userId = req.user.sub;

        // Get the ad details to check ownership
        const ad = await this.adsService.getAdById(adId);

        if (!ad.salonId) {
            throw new BadRequestException('Ad does not have a valid salon association');
        }

        // Check authorization: allow admin or salon owner (with ownership verification)
        if (userRole === UserRole.ADMIN) {
            // Admin can see any ad's payment details
            return this.adsService.getAdsAndPayment(adId);
        } else if (userRole === UserRole.SALON_OWNER) {
            // Salon owner can only see their own salon's ad payments
            await this.salonService.checkOwnership(ad.salonId, userId);
            return this.adsService.getAdsAndPayment(adId);
        } else {
            throw new BadRequestException('Unauthorized: Only admin or salon owner can access this resource');
        }
    }

    @Get('salon/:salonId')
    async getAdsBySalonId(@Req()req: any){
        return this.adsService.getAdsBySalonId(req.params.salonId);
    }

    @Get(':id')
    async getAdById(@Param('id') id: string) {
        return this.adsService.getAdById(id);
    }

}
