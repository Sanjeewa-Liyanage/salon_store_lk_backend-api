// payment/payment.controller.ts
import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RejectPaymentDto } from './dto/reject-payment.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/enum/userrole.enum';

@ApiBearerAuth()
@Controller('payments')
export class PaymentController {
    constructor(private paymentService: PaymentService) {}

    // salon owner submits or resubmits slip
    @Post()
    @UseGuards(AuthGuard('jwt'))
    @Roles(UserRole.SALON_OWNER)
    async submitPayment(@Body() dto: CreatePaymentDto, @Req() req: any) {
        return this.paymentService.submitPayment(dto, req.user.sub);
    }

    // admin: list all pending slips
    @Get('pending')
    @UseGuards(AuthGuard('jwt'))
    @Roles(UserRole.ADMIN)
    async getPendingPayments() {
        return this.paymentService.getPendingPayments();
    }

    // admin or owner: get payment for a specific ad
    @Get('ad/:adId')
    @UseGuards(AuthGuard('jwt'))
    async getPaymentByAdId(@Param('adId') adId: string) {
        return this.paymentService.getPaymentByAdId(adId);
    }

    // admin: verify payment
    @Patch(':id/verify')
    @UseGuards(AuthGuard('jwt'))
    @Roles(UserRole.ADMIN)
    async verifyPayment(@Param('id') id: string) {
        return this.paymentService.verifyPayment(id);
    }

    // admin: reject payment
    @Patch(':id/reject')
    @UseGuards(AuthGuard('jwt'))
    @Roles(UserRole.ADMIN)
    async rejectPayment(@Param('id') id: string, @Body() dto: RejectPaymentDto) {
        return this.paymentService.rejectPayment(id, dto.reason);
    }
}