import {
    Injectable,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { EmailService } from '../common/email/email.service.js';

import { SendStudentInvitationDTO } from './dto/sendStudentInvitation.dto.js';

@Injectable()
export class StudentService {

    private readonly logger = new Logger(StudentService.name);

    constructor(
        private readonly emailService: EmailService,
        private readonly configService: ConfigService,
    ) {}

    // SEND STUDENT INVITATION EMAIL
    async sendStudentInvitation(
        studentData: SendStudentInvitationDTO,
    ) {

        const normalizedEmail = studentData.email.toLowerCase().trim();

        try {

            // 1. Get company name
            const companyName = this.configService.get<string>(
                'COMPANY_NAME',
                'Your Academy',
            );

            // 2. Get student signup URL
            const signupUrl = this.configService.get<string>(
                'STUDENT_SIGNUP_URL',
                'http://localhost:3000/student/signup',
            );

            // 3. Send invitation email
            await this.emailService.sendEmail({

                to: normalizedEmail,

                subject: `Welcome to ${companyName} - Your Class Invitation`,

                template: 'student-invitation',

                context: {
                    companyName,

                    username: studentData.username,

                    email: normalizedEmail,

                    signupUrl,
                },
            });

            this.logger.log(
                `Student invitation email sent successfully to ${normalizedEmail}`,
            );

            return {
                status: true,
                message: 'Student invitation email sent successfully.',
            };

        } catch (error) {

            const err = error as Error;

            this.logger.error(
                `Student invitation email failed: ${err.message}`,
                err.stack,
            );

            throw new InternalServerErrorException(
                'Unable to send student invitation email. Please try again.',
            );
        }
    }
}