import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import type { Redis as RedisClient } from 'ioredis';
import { REDIS_CLIENT } from './redis.constants.js';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: RedisClient,
  ) {}

  // ---------- strings ----------
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.set(key, value, 'EX', ttl);
      return;
    }
    await this.redis.set(key, value);
  }

  // Atomic "set if not exists" (used as a lock). true => we got it.
  async setNx(key: string, value: string, ttl: number): Promise<boolean> {
    const res = await this.redis.set(key, value, 'EX', ttl, 'NX');
    return res === 'OK';
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

  async expire(key: string, ttl: number): Promise<void> {
    await this.redis.expire(key, ttl);
  }

  async setObject(key: string, value: object, ttl?: number): Promise<void> {
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

  // ---------- hashes ----------
  async hSet(key: string, field: string, value: string): Promise<void> {
    await this.redis.hset(key, field, value);
  }

  // Atomic "set field only if it doesn't exist". true => written.
  async hSetNx(key: string, field: string, value: string): Promise<boolean> {
    return (await this.redis.hsetnx(key, field, value)) === 1;
  }

  async hGet(key: string, field: string): Promise<string | null> {
    return this.redis.hget(key, field);
  }

  async hDel(key: string, field: string): Promise<number> {
    return this.redis.hdel(key, field);
  }

  async hGetAll(key: string): Promise<Record<string, string>> {
    return this.redis.hgetall(key);
  }

  async hExists(key: string, field: string): Promise<boolean> {
    return (await this.redis.hexists(key, field)) === 1;
  }

  async hLen(key: string): Promise<number> {
    return this.redis.hlen(key);
  }

  // ---------- pattern helpers (SCAN, never KEYS) ----------
  private async scan(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    const stream = this.redis.scanStream({ match: pattern, count: 200 });
    for await (const batch of stream) {
      keys.push(...(batch as string[]));
    }
    return keys;
  }

  async deleteByPattern(pattern: string): Promise<number> {
    const keys = await this.scan(pattern);
    if (!keys.length) return 0;
    const pipeline = this.redis.pipeline();
    keys.forEach((k) => pipeline.del(k));
    await pipeline.exec();
    return keys.length;
  }

  async expireByPattern(pattern: string, ttl: number): Promise<number> {
    const keys = await this.scan(pattern);
    if (!keys.length) return 0;
    const pipeline = this.redis.pipeline();
    keys.forEach((k) => pipeline.expire(k, ttl));
    await pipeline.exec();
    return keys.length;
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}