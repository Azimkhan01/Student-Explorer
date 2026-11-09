import { Module } from '@nestjs/common';
import { ForgotPasswordController } from './forgot-password.controller.js';
import { ForgotPasswordService } from './forgot-password.service.js';
import { EmailService } from '../common/email/email.service.js';

@Module({
  controllers: [ForgotPasswordController],
  providers: [ForgotPasswordService,EmailService]
})
export class ForgotPasswordModule {}
