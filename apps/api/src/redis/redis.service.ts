import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis | null;
  private readonly redisConfigured: boolean;
  private hasLoggedFallback = false;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('redis.url');

    if (!redisUrl) {
      this.redisConfigured = false;
      this.client = null;
      this.logger.warn('REDIS_URL is not configured. Cache/session fallback mode is enabled.');
      return;
    }

    this.redisConfigured = true;
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false
    });

    this.client.on('error', (error) => {
      this.logFallbackOnce(error);
    });
  }

  private logFallbackOnce(error?: unknown) {
    if (this.hasLoggedFallback) {
      return;
    }

    const message =
      error instanceof Error ? error.message : 'Redis unavailable. Falling back to non-cached mode.';
    this.logger.warn(message);
    this.hasLoggedFallback = true;
  }

  private async withFallback<T>(operation: (client: Redis) => Promise<T>, fallback: T): Promise<T> {
    if (!this.client || !this.redisConfigured) {
      return fallback;
    }

    try {
      return await operation(this.client);
    } catch (error) {
      this.logFallbackOnce(error);
      return fallback;
    }
  }

  async get(key: string): Promise<string | null> {
    return this.withFallback((client) => client.get(key), null);
  }

  async set(key: string, value: string, ttlInSeconds?: number): Promise<void> {
    await this.withFallback(async (client) => {
      if (ttlInSeconds) {
        await client.set(key, value, 'EX', ttlInSeconds);
        return;
      }

      await client.set(key, value);
    }, undefined);
  }

  async del(key: string): Promise<void> {
    await this.withFallback(async (client) => {
      await client.del(key);
    }, undefined);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttlInSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlInSeconds);
  }

  async ping(): Promise<string> {
    if (!this.client || !this.redisConfigured) {
      return 'DISABLED';
    }

    return this.withFallback((client) => client.ping(), 'DOWN');
  }
}
