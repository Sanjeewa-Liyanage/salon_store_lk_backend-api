import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
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
    


}
