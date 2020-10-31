import Eris from 'eris';
import Redis from 'ioredis';
import { Stats } from './stats';
export interface StatsOptions {
    enabled: boolean;
    interval: number;
}
export interface WebhookOptions {
    discord?: {
        id?: string;
        token?: string;
    };
    http?: {
        url?: string;
        authorization?: string;
    };
}
export interface GatewayClientOptions {
    redisPort?: number;
    redisPassword?: string;
    redisHost?: string;
    shardsPerCluster?: number;
    stats?: StatsOptions;
    lockKey?: string;
    getFirstShard: () => Promise<number> | number;
    erisOptions: Eris.ClientOptions;
    webhooks?: WebhookOptions;
}
interface GatewayClientEvents<T> extends Eris.ClientEvents<T> {
    (event: 'acquiredLock', listener: () => void): T;
}
export declare interface GatewayClient extends Eris.Client {
    on: GatewayClientEvents<this>;
}
export declare class GatewayClient extends Eris.Client {
    redisPort: number | undefined;
    redisHost: string | undefined;
    redisPassword: string | undefined;
    shardsPerCluster: number;
    lockKey: string;
    stats: StatsOptions;
    webhooks: WebhookOptions;
    getFirstShard: () => Promise<number> | number;
    private redisConnection;
    private redisLock;
    private hasLock;
    private fullyStarted;
    private pubSub;
    constructor(token: string, options: GatewayClientOptions);
    private initialize;
    private setupListeners;
    private calculateThisShards;
    queue(): Promise<void>;
    private aquire;
    getStats(key?: string, timeout?: number): Promise<Stats>;
    private shardStatusUpdate;
    getRedis(): Redis.Redis | undefined;
    getGuildByID(id: string): Promise<any> | undefined;
    getUserByID(id: string): Promise<any> | undefined;
    evalAll(script: string): Error | Promise<any> | undefined;
    subscribeToEvent(event: string, func: Function): this;
    publish(event: string, message: string): void;
}
export {};
