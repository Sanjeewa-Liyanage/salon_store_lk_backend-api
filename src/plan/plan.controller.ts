import { Body, Controller, Post, UseGuards, Req, Param, Patch, Get, Delete, Query } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { PlanService } from './plan.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/enum/userrole.enum';
import { PlanCreateDto } from './dto/plancreate.dto';
import { PlanUpdateDto } from './dto/plan-update.dto';


@ApiBearerAuth()
@Controller('plan')

export class PlanController {
    constructor(private planService: PlanService){}

    @Post('create')
    @UseGuards(AuthGuard('jwt'))
    @Roles(UserRole.ADMIN)
    async createPlan(@Body()dto: PlanCreateDto){
    return this.planService.createPlan(dto);
   
    }
    
    @Get()
    async getPlans(){
        return this.planService.getPlans();
    }

    @Get('all')
    async getAllPlans(
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10'
    ) {
        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);
        return this.planService.getAllPlans(pageNumber, limitNumber);
    }

    @Patch('update/:id')
    @UseGuards(AuthGuard('jwt'))
    @Roles(UserRole.ADMIN)
    async updatePlan(@Param('id') id: string, @Body() dto: PlanUpdateDto) {
        return this.planService.updatePlan(id, dto);
    }

    @Delete('delete/:id')
    @UseGuards(AuthGuard('jwt'))
    @Roles(UserRole.ADMIN)
    async deletePlan(@Param('id') id: string) {
        return this.planService.deletePlan(id);
    }

    @Get(':id')
    async getPlanById(@Param('id') id: string) {
        return this.planService.getPlanById(id);
    }

}