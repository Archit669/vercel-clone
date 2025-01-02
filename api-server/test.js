const { createClient } = require('redis');

const redisClient = createClient({
    url: 'redis://default:kZIIJJQapschnpRhHiBjDEmlhINUYmjC@monorail.proxy.rlwy.net:27267',
});

redisClient.on('error', (err) => console.error('Redis Connection Error:', err));
redisClient.on('ready', () => console.log('Redis Client Ready'));
redisClient.on('connect', () => console.log('Redis Client Connected'));
redisClient.on('reconnecting', () => console.log('Redis Client Reconnecting'));
redisClient.connect();
