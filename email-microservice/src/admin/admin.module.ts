import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { EmailService } from '../common/email/email.service.js';

@Module({
  controllers: [AdminController],
  providers: [AdminService,EmailService]
})
export class AdminModule {}
