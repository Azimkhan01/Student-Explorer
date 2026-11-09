import {
  Inject,
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';

import type { Redis as RedisClient } from 'ioredis';
import { REDIS_CLIENT } from './redis.constants.js';

@Injectable()
export class RedisService implements OnModuleDestroy {

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: RedisClient,
  ) {}

  async set(
    key: string,
    value: string,
    ttl?: number,
  ): Promise<void> {

    if (ttl) {
      await this.redis.set(key, value, 'EX', ttl);
      return;
    }

    await this.redis.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async delete(key: string): Promise<number> {
    return this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.redis.exists(key)) === 1;
  }

  async setObject(
    key: string,
    value: object,
    ttl?: number,
  ): Promise<void> {

    await this.set(key, JSON.stringify(value), ttl);
  }

  async getObject<T>(key: string): Promise<T | null> {

    const value = await this.get(key);

    if (!value) return null;

    return JSON.parse(value) as T;
  }

  async increment(key: string): Promise<number> {
    return this.redis.incr(key);
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}