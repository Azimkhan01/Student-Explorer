import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomInt } from 'crypto';

import { EmailService } from '../common/email/email.service.js';
import { RedisService } from '../common/redis/redis.service.js';
import { ForgotPasswordOTPVerfication } from './dto/forgotpassword.dto.js';

interface ForgotPasswordDto {
    email: string;
    role: string;
}

interface CheckForgotPasswordDto extends ForgotPasswordDto {
    resetCode: string;
}

@Injectable()
export class ForgotPasswordService {

    constructor(
        private readonly emailService: EmailService,
        private readonly redisService: RedisService
    ) {}

    // SEND FORGOT PASSWORD OTP
    async sendForgotPasswordCode({ email, role }: ForgotPasswordDto) {

        const resetCode = randomInt(100000, 1000000).toString();

        try {

            // Store OTP for 5 minutes
            await this.redisService.set(
                `ForgotPassword:${role}:${email}`,
                resetCode,
                300
            );

            // Send OTP through email
            await this.emailService.sendEmail({
                to: email,
                subject: `Password Reset OTP - ${process.env.CompanyName || "Everazim"}`,
                template: 'forgot-password',

                context: {
                    email,
                    resetCode,
                    role,
                    companyName: process.env.CompanyName || "Everazim",
                    year: new Date().getFullYear()
                }
            });

            return {
                message: 'Password reset OTP sent successfully',
                status: true
            };

        } catch (err) {

            console.error('Forgot Password Error:', err);

            return {
                message: 'Unable to send password reset OTP',
                status: false
            };
        }
    }


    // VERIFY FORGOT PASSWORD OTP
    async checkForgotPasswordCode(data: CheckForgotPasswordDto) {

        try {

            const storedCode = await this.redisService.get(
                `ForgotPassword:${data.role}:${data.email}`
            );

            if (!storedCode) {
                return {
                    message: 'OTP expired or not found',
                    status: false
                };
            }

            if (storedCode !== data.resetCode) {
                return {
                    message: 'Incorrect OTP',
                    status: false
                };
            }

            // Mark OTP as verified for the password reset step
            await this.redisService.set(
                `ForgotPasswordVerified:${data.role}:${data.email}`,
                'verified',
                300
            );

            return {
                message: 'OTP verified successfully',
                status: true
            };

        } catch (err) {

            console.error('OTP Verification Error:', err);

            return {
                message: 'Unable to verify OTP',
                status: false
            };
        }
    }

    async forgotpasswordotpverfication(forgotpasswordverfication:ForgotPasswordOTPVerfication){
         const verificationKey = `ForgotPasswordVerified:${forgotpasswordverfication.role}:${forgotpasswordverfication.email}`;

    const isVerified = await this.redisService.get(verificationKey);

    if (!isVerified) 
       return {message:"The otp is not verfied",status:false}
    else
       return {message:"The otp is not verfied",status:true}

    }

}