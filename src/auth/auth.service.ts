import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { UserRegistrationDto } from '../user/dto/userregister.dto';
import { UserRole } from '../user/enum/userrole.enum';
import { UserUpdateDto } from '../user/dto/user-update.dto';
import * as bcrypt from 'bcrypt';
@Injectable()
export class AuthService {
    constructor(
        private userService: UserService,
        private jwtService: JwtService
    ) { }

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
                secret: process.env.JWT_REFRESH_SECRET_KEY,
                expiresIn: '7d'
            })
        ]);

        return {
            accessToken: at,
            refreshToken: rt
        }
    }
    async login(email: string, password: string) {
        const user = await this.userService.validateUser(email, password);

        if (!user) {
            throw new BadRequestException('Invalid credentials');
        }
        const tokens = await this.getTokens(user.id, user.email, user.role as UserRole);
        await this.userService.updateRefreshToken(user.id, tokens.refreshToken);
        return {
            user: {
                id: user.id,
            },
            backendTokens: tokens
        };
    }
    async forgotPasswordOtp(email: string) {

        const res = await this.userService.sendOtpToEmail(email);
        if (!res) {
            throw new BadRequestException('Failed to send OTP');
        }
        const token = await this.jwtService.signAsync({ email }, {
            secret: process.env.JWT_SECRET_KEY,
            expiresIn: '15m'
        });
        return {
            token,
            message: 'OTP sent to registered email if user exists'
        }
    }
    async verifyOtp(email: string, otp: string) {
        const isValid = await this.userService.verifyOtp(email, otp);

        if (!isValid) {
            throw new UnauthorizedException('Invalid or expired OTP');
        }
        const verifiedToken = await this.jwtService.signAsync({ email }, {
            secret: process.env.JWT_SECRET_KEY,
            expiresIn: '15m'
        });
        return {
            message: 'OTP verified successfully',
            verifiedToken
        };
    }

    async resetPassword(email: string, newPassword: string) {
        await this.userService.updatePassword(email, newPassword);
        return { message: 'Password reset successfully' };
    }

    async updateUser(id: string, updateDto: UserUpdateDto) {
        const updatedUser = await this.userService.updateUser(id, updateDto);
        if (!updatedUser) {
            throw new BadRequestException('Failed to update user');
        }
        return { message: 'User updated successfully' };
    }
    async refreshTokens(userId: string, refreshToken: string) {

        const user = await this.userService.findOne(userId);
        if (!user) throw new UnauthorizedException('User not found');

        const userWithToken = await this.userService.findByEmail(user.email!);
        if (!userWithToken?.refreshToken) throw new UnauthorizedException('No refresh token found');

        const isMatch = await bcrypt.compare(refreshToken, userWithToken.refreshToken);
        if (!isMatch) throw new UnauthorizedException('Invalid refresh token');

        const tokens = await this.getTokens(user.id!, user.email!, user.role!);

        await this.userService.updateRefreshToken(user.id, tokens.refreshToken);

        return tokens;
    }
    async logOut(userId: string) {
        const user = await this.userService.findOne(userId);
        if (!user) throw new UnauthorizedException('User not found');
        await this.userService.updateRefreshToken(user.id, "");
        return { message: 'User logged out successfully' };
    }

}
