import Redis from 'ioredis';
import { Stats } from './stats';
export interface DataClientOptions {
    redisPort?: number;
    redisPassword?: string;
    redisHost?: string;
    lockKey?: string;
    maxShards: number;
    shardsPerCluster: number;
}
export declare class DataClient {
    redisPort: number | undefined;
    redisHost: string | undefined;
    redisPassword: string | undefined;
    lockKey: string;
    maxShards: number;
    shardsPerCluster: number;
    private redisConnection;
    private pubSub;
    constructor(options: DataClientOptions);
    private initialize;
    getStats(key?: string, timeout?: number): Promise<Stats>;
    getRedis(): Redis.Redis | undefined;
    getGuildByID(id: string): Promise<any> | undefined;
    getUserByID(id: string): Promise<any> | undefined;
    evalAll(script: string): Error | Promise<any> | undefined;
    subscribeToEvent(event: string, func: Function): this;
    publish(event: string, message: string): void;
}
