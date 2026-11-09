
import {
    Injectable,
    InternalServerErrorException,
    BadRequestException,
    Logger,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { randomInt } from 'crypto';

import { EmailService } from '../common/email/email.service.js';
import { RedisService } from '../common/redis/redis.service.js';
import { VerifyAdminOTPDTO } from './dto/verifyAdminOTP.dto.js';

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);

    // OTP expires after 2 minutes
    private readonly OTP_EXPIRY = 120;

    constructor(
        private readonly emailService: EmailService,
        private readonly redisService: RedisService,
        private readonly configService: ConfigService,
    ) { }

    // SEND ADMIN OTP
    async sendAdminOtp(email: string) {
        const normalizedEmail = email.toLowerCase().trim();

        const redisKey = `admin:otp:${normalizedEmail}`;

        try {
            // 1. Generate 6-digit OTP
            const otp = randomInt(100000, 1000000).toString();

            // 2. Store OTP in Redis for 120 seconds
            await this.redisService.set(
                redisKey,
                otp,
                this.OTP_EXPIRY,
            );

            // 3. Get company name
            const companyName =
                this.configService.get<string>(
                    'COMPANY_NAME',
                    'Your Company',
                );

            // 4. Send OTP email
            await this.emailService.sendEmail({
                to: normalizedEmail,
                subject: `${companyName} - Admin Login Verification`,
                template: 'admin-otp',
                context: {
                    companyName,
                    otp,
                },
            });

            this.logger.log('Admin OTP email sent successfully');

            // 5. Return timer information for frontend
            const expiresAt = Date.now() + this.OTP_EXPIRY * 1000;

            return {
                status: true,
                message: 'OTP sent successfully.',
                expiresIn: this.OTP_EXPIRY,
                expiresAt,
            };

        } catch (error) {
            // Remove OTP if email sending fails
            await this.redisService.delete(redisKey).catch(() => { });

            const err = error as Error;

            this.logger.error(
                `Admin OTP sending failed: ${err.message}`,
                err.stack,
            );

            throw new InternalServerErrorException(
                'Unable to send OTP. Please try again.',
            );
        }
    }

    // VERIFY ADMIN OTP
    async verifyAdminOtp(verifyOtpdto: VerifyAdminOTPDTO) {

        const redisKey = `admin:otp:${verifyOtpdto.email}`;
        try {
            // 1. Get stored OTP from Redis
            const storedOtp = await this.redisService.get(redisKey);

            // 2. Check whether OTP exists or has expired
            if (!storedOtp) {
                throw new BadRequestException(
                    'OTP has expired. Please request a new OTP.',
                );
            }

            // 3. Compare entered OTP with stored OTP
            if (storedOtp !== verifyOtpdto.otp) {
                // console.log(storedOtp,verifyOtpdto.otp);
                
                // console.log("invalid hai kya");
                
                throw new BadRequestException(
                    'Invalid OTP. Please enter the correct OTP.',
                );
            }

            // 4. Delete OTP after successful verification
            await this.redisService.delete(redisKey);

            this.logger.log('Admin OTP verified successfully');

            return {
                status: true,
                message: 'OTP verified successfully.',
            };

        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }

            const err = error as Error;

            this.logger.error(
                `Admin OTP verification failed: ${err.message}`,
                err.stack,
            );

            throw new InternalServerErrorException(
                'Unable to verify OTP. Please try again.',
            );
        }
    }
}
