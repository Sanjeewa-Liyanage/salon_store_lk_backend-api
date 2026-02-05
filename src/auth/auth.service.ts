import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { UserRegistrationDto } from '../user/dto/userregister.dto';
import { UserRole } from '../user/enum/userrole.enum';

@Injectable()
export class AuthService {
    constructor(
        private userService: UserService,
        private jwtService: JwtService
    ) {}

    async register(dto: UserRegistrationDto) {
        // 1. Create User
        const newUser = await this.userService.createUser(dto);

        if (!newUser.id || !newUser.email) {
            throw new Error('User creation failed: Missing ID or Email');
        }

        // 2. Generate Tokens
        const tokens = await this.getTokens(newUser.id, newUser.email, newUser.role as UserRole);

        // 3. Update Refresh Token
        await this.userService.updateRefreshToken(newUser.id, tokens.refreshToken);

        return {
            user: newUser,
            backendTokens: tokens
        }
    }

    async getTokens(userId: string, email: string, role: string) {
        const payload = {
            sub: userId,
            email: email,
            role: role
        };

        const [at, rt] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: process.env.JWT_SECRET_KEY, 
                expiresIn: '15m'
            }),
            this.jwtService.signAsync(payload, {
                secret: process.env.JWT_SECRET_KEY, 
                expiresIn: '7d'
            })
        ]);

        return {
            accessToken: at,
            refreshToken: rt
        }
    }
}
