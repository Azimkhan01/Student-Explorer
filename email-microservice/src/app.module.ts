import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CreatorCodeModule } from './creator-code/creator-code.module.js';
import { EmailModule } from './common/email/email.module.js';
import { RedisModule } from './common/redis/redis.module.js';
import { AdminModule } from './admin/admin.module.js';
import { ConfigModule } from '@nestjs/config';
import { ForgotPasswordModule } from './forgot-password/forgot-password.module.js';
import { StudentModule } from './student/student.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CreatorCodeModule, EmailModule, RedisModule, AdminModule, ForgotPasswordModule, StudentModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
