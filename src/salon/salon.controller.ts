import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { SalonService } from './salon.service';
import { SalonCreateDto } from './dto/salon-create.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('salon')
export class SalonController {
    constructor(private salonService: SalonService) {}

    @Post('create')
    @UseGuards(AuthGuard('jwt')) 
    async createSalon(@Body() dto: SalonCreateDto, @Req() req: any) {
        return this.salonService.createSalon(dto, req.user.sub);
    }
}
