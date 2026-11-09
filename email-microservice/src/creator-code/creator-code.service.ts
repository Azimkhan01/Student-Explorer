import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { EmailService } from '../common/email/email.service.js';
import { RedisService } from '../common/redis/redis.service.js';

interface sendCreatorDto {
    username: string;
    email: string;
    role: string;
}

interface checkCreatorCode extends sendCreatorDto {
    creatorCode: string;
}

@Injectable()
export class CreatorCodeService {

    constructor(
        private readonly emailService: EmailService,
        private readonly redisService: RedisService
    ) {}

    async sendCreatorCode({ username, email, role }: sendCreatorDto) {

        const userId = randomUUID();
        const creatorCode = `CREATOR-${userId}`;

        try {

            await this.redisService.set(
                `Creator:${username}:${email}`,
                creatorCode,
                300
            );

            await this.emailService.sendEmail({
                to: email,
                subject: `Welcome ${username}! Your Creator Code`,
                template: 'creator-code',

                context: {
                    name: username,
                    creatorCode,
                    companyName: process.env.CompanyName,
                    role
                }
            });

            return {
                message: "Creator code sent successfully",
                status: true
            };

        } catch (err) {

            console.log(err);

            return {
                message: "Failed to send creator code",
                status: false
            };
        }
    }

    async checkCreatorCode(data: checkCreatorCode) {

        try {

            const storedCode = await this.redisService.get(
                `Creator:${data.username}:${data.email}`
            );

            if (storedCode === data.creatorCode) {

                return {
                    message: "Correct code",
                    status: true
                };

            } else {

                return {
                    message: "Incorrect Creator Code",
                    status: false
                };
            }

        } catch (err) {

            console.log(err);

            return {
                message: "Unable to verify creator code",
                status: false
            };
        }
    }
}