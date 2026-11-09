import { Injectable } from '@nestjs/common';
import { RedisService } from './common/redis/redis.service.js';

@Injectable()
export class AppService {
  constructor(private readonly redisService:RedisService){}
  
  getHello(): void {
  }
}
