import { GatewayClient } from '../GatewayClient';
import { DataClient } from '../DateClient';
export interface PubSubOptions {
    redisPort?: number;
    redisPassword?: string;
    redisHost?: string;
}
export declare class PubSub {
    private subRedis;
    private pubRedis;
    private client;
    private options;
    private returns;
    private evals;
    private stats;
    private subs;
    constructor(options: PubSubOptions, client: GatewayClient | DataClient);
    private initialize;
    private setupSubscriptions;
    private handleMessage;
    private formatStats;
    getGuild(id: string): Promise<any | undefined>;
    getUser(id: string): Promise<any | undefined>;
    evalAll(script: string, timeout?: number): Promise<any | undefined>;
    getStats(key: string, timeout?: number): Promise<any | undefined>;
    sub(eventName: string, func: Function): void;
    pub(eventName: string, message: string): void;
}
