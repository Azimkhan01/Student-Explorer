import { Body, Controller, Get, Post, Query, QueryMethod, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service.js';
import { MakeCreatorCodeDTO } from './dto/makeCreatorCode.DTO.js';
import { signupUserDTO } from './dto/signupUserDTO.js';
import { CheckCreatorCodeDTO } from './dto/checkCreatorCode.DTO.js';
import { LoginUserDTO } from './dto/LoginUser.dto.js';
import { verifyOTPDTO } from './dto/verifyotp.dto.js';
import { checkFrogotPasswordOTP, ForgotPasswordOTPDTO } from './dto/forgotpasswordotp.dto.js';
import { ResetPasswordDTO } from './dto/reset-password.dto.js';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService
    ) { }

    @Post('creator-code/send')
    async createCreatorCode(@Body() makeCreatorCodedto: MakeCreatorCodeDTO) {
        console.log(makeCreatorCodedto)
        return await this.authService.makeCreatorCode(makeCreatorCodedto);
    }

    @QueryMethod('creator-code/check')
    async checkCreatorCode(@Body() checkCreatorCodedto: CheckCreatorCodeDTO) {
        return await this.authService.checkCreatorCode(checkCreatorCodedto)
    }

    @Post('signup')
    async signupUser(@Body() signupUserdto: signupUserDTO) {
        return this.authService.signupUser(signupUserdto)
    }

    @Post('login')
    async loginUser(
        @Body() loginUserDto: LoginUserDTO,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.loginUser(loginUserDto);

        // Store JWT inside an HTTP-only cookie.
        res.cookie('user_access_token', result.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000,
            path: '/',
        });

        // Do not expose the JWT in the response body.
        return {
            status: result.status,
            message: result.message,
            user: result.user,
        };
    }

    // admin otp system login
    @Post('send-otp')
    async adminlogin(@Body() { email }: { email: string }) {
        return this.authService.loginAdmin(email)
    }

    @Post('verify-otp')
    async verifyAdminOTP(
        @Body() verifyOtp: verifyOTPDTO,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.verifyOTP(verifyOtp);

        // Set JWT inside HTTP-only cookie.
        res.cookie('admin_access_token', result.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000,
            path: '/',
        });

        // Never send the JWT in the response body.
        return {
            success: result.success,
            message: result.message,
            user: result.user,
        };
    }

    @Post('forgot-password-otp')
    async sendFrogotPasswordOTP(@Body() data: ForgotPasswordOTPDTO) {
        return this.authService.forgotPasswordOTP(data);
    }

    @Post('check-forgot-password-otp')
    async checkForgotPasswordOTP(@Body() CheckFrogotPasswordOTP: checkFrogotPasswordOTP) {
        return this.authService.checkForgotPasswordOTP(CheckFrogotPasswordOTP);
    }

    @Post('reset-password')
async resetPassword(@Body() data: ResetPasswordDTO) {
    return this.authService.resetPassword(data);
}


}
