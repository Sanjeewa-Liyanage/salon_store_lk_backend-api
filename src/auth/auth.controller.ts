import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserRegistrationDto } from '../user/dto/userregister.dto';
import { loginDto } from '../user/dto/login.dto';
import { ForgetPasswordDto } from '../user/dto/forgetPaswword.dto';
import { Auth } from 'firebase-admin/auth';
import { AuthGuard } from '@nestjs/passport';
import { ForgotPasswordGuard } from './guards/forgotpw.guard';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}

    @Post('register')
    register(@Body() dto: UserRegistrationDto) {
        return this.authService.register(dto);
    }
    @Post('login')
    login(@Body() loginDto: loginDto) {
        return this.authService.login(loginDto.email, loginDto.password);
    }
    @Post('forgot-password')
    forgotPassword(@Body() dto: ForgetPasswordDto) {
        return this.authService.forgotPasswordOtp(dto.email);
    }
    @Post('verify-otp')
    @UseGuards(ForgotPasswordGuard)
    verifyOtp(@Req() req: Request, @Body() body: { otp: string }) {
        const email = req['user']['email'];
        return this.authService.verifyOtp(email, body.otp);
    }
    @Post('reset-password')
    @UseGuards(ForgotPasswordGuard)
    resetPassword(@Req() req: Request, @Body() body: { newPassword: string }) {
        const email = req['user']['email'];
        return this.authService.resetPassword(email, body.newPassword);
    }

    
}
