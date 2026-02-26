import { Body, Controller, Patch, Post, Req, UseGuards,Get } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AdsService } from './ads.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdsCreateDto } from './dto/adscreate.dto';
import { UserRole } from '../user/enum/userrole.enum';
import { AuthGuard } from '@nestjs/passport';



@ApiBearerAuth()
@Controller('ads')

export class AdsController {
    constructor(private adsService: AdsService) {}

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
    
    @Get('all')
    async getAllAds(@Req()req: any){
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        return this.adsService.getAdsByPriority(page, limit);
    }

}
