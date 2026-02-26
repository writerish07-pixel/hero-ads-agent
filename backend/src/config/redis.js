'use strict';

const Redis = require('ioredis');
const logger = require('./logger');

const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy: (times) => {
    if (times > 5) {
      logger.warn('Redis: max retry attempts reached, giving up');
      return null; // stop retrying
    }
    const delay = Math.min(times * 200, 2_000);
    logger.debug(`Redis: retry attempt ${times}, delay ${delay}ms`);
    return delay;
  },
  lazyConnect: true,
});

client.on('connect', () => logger.info('Redis connected'));
client.on('ready', () => logger.debug('Redis ready'));
client.on('error', (err) => logger.error('Redis error', { error: err.message }));
client.on('close', () => logger.warn('Redis connection closed'));
client.on('reconnecting', () => logger.info('Redis reconnecting'));

// Attempt initial connection without crashing the process on failure
client.connect().catch((err) => {
  logger.warn('Redis initial connection failed – caching disabled', { error: err.message });
});

module.exports = client;
