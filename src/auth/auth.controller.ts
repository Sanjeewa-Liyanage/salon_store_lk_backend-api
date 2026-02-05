import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserRegistrationDto } from '../user/dto/userregister.dto';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}

    @Post('register')
    register(@Body() dto: UserRegistrationDto) {
        return this.authService.register(dto);
    }
}
