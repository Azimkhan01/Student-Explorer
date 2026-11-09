import { Module } from '@nestjs/common';

import { CreatorCodeController } from './creator-code.controller.js';
import { CreatorCodeService } from './creator-code.service.js';
import { EmailService } from '../common/email/email.service.js';
import { RedisService } from '../common/redis/redis.service.js';

@Module({
  controllers: [CreatorCodeController],
  providers: [CreatorCodeService,EmailService],
  exports: [CreatorCodeService],
})
export class CreatorCodeModule {}