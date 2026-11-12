import { Global, Module } from '@nestjs/common';
import { Redis } from 'ioredis';
import { RedisService } from './redis.service.js';
import { REDIS_CLIENT } from './redis.constants.js';

import 'dotenv/config';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,

      useFactory: () => {
        return new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: Number(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD || undefined,

          retryStrategy(times) {
            return Math.min(times * 500, 5000);
          },
        });
      },
    },

    RedisService,
  ],

  exports: [RedisService],
})
export class RedisModule {}