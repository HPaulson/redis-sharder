"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
const eris_1 = require("eris");
const DateClient_1 = require("../DateClient");
;
class PubSub {
    constructor(options, client) {
        this.returns = new Map();
        this.evals = new Map();
        this.stats = new Map();
        this.subs = new Map();
        this.client = client;
        this.options = options;
        this.initialize();
        this.setupSubscriptions();
    }
    ;
    initialize() {
        this.pubRedis = new ioredis_1.default(this.options.redisPort, this.options.redisHost, {
            password: this.options.redisPassword,
        });
        this.subRedis = new ioredis_1.default(this.options.redisPort, this.options.redisHost, {
            password: this.options.redisPassword,
        });
        const thispls = this;
        this.subRedis.on('message', this.handleMessage.bind(thispls));
    }
    ;
    setupSubscriptions() {
        var _a;
        (_a = this.subRedis) === null || _a === void 0 ? void 0 : _a.subscribe('getGuild', 'returnGuild', 'getUser', 'returnUser', 'eval', 'returnEval', 'acquiredLock', 'stats', 'returnStats');
    }
    ;
    handleMessage(channel, msg) {
        var _a, _b, _c, _d, _e;
        return __awaiter(this, void 0, void 0, function* () {
            let message;
            try {
                message = JSON.parse(msg);
            }
            catch (_f) {
                message = msg;
            }
            ;
            if (channel === 'getGuild') {
                if (this.client instanceof DateClient_1.DataClient)
                    return;
                const guild = this.client.guilds.get(message.id);
                if (guild) {
                    let data = guild === null || guild === void 0 ? void 0 : guild.toJSON();
                    delete data.members;
                    (_a = this.pubRedis) === null || _a === void 0 ? void 0 : _a.publish('returnGuild', JSON.stringify(data));
                }
                ;
            }
            ;
            if (channel === 'returnGuild') {
                let toReturn = this.returns.get(`guild_${message.id}`);
                if (toReturn) {
                    toReturn(message);
                    this.returns.delete(`guild_${message.id}`);
                }
                ;
            }
            ;
            if (channel === 'getUser') {
                if (this.client instanceof DateClient_1.DataClient)
                    return;
                const user = this.client.users.get(message.id);
                if (user)
                    (_b = this.pubRedis) === null || _b === void 0 ? void 0 : _b.publish('returnUser', JSON.stringify(user === null || user === void 0 ? void 0 : user.toJSON()));
            }
            ;
            if (channel === 'returnUser') {
                let toReturn = this.returns.get(`user_${message.id}`);
                if (toReturn) {
                    toReturn(message);
                    this.returns.delete(`user_${message.id}`);
                }
                ;
            }
            ;
            if (channel === 'eval') {
                if (!this.options.redisPassword)
                    return;
                if (this.client instanceof DateClient_1.DataClient)
                    return;
                try {
                    let output = eval(message.script);
                    if (Array.isArray(output))
                        output = output.map((item) => {
                            if (item instanceof eris_1.Base)
                                return item.toJSON();
                            else
                                return item;
                        });
                    if (output instanceof eris_1.Base)
                        output = output.toJSON();
                    (_c = this.pubRedis) === null || _c === void 0 ? void 0 : _c.publish('returnEval', JSON.stringify({ output: output, id: message.id }));
                }
                catch (_g) {
                    (_d = this.pubRedis) === null || _d === void 0 ? void 0 : _d.publish('returnEval', JSON.stringify({ output: undefined, id: message.id }));
                }
                ;
            }
            ;
            if (channel === 'returnEval') {
                if (!this.options.redisPassword)
                    return;
                let toReturn = this.returns.get(`eval_${message.id}`);
                if (toReturn) {
                    const evals = this.evals.get(message.id) || [];
                    evals.push(message.output);
                    this.evals.set(message.id, evals);
                    if (this.client instanceof DateClient_1.DataClient) {
                        if (Number(this.client.maxShards) / this.client.shardsPerCluster === evals.length) {
                            this.returns.delete(`eval_${message.id}`);
                            this.evals.delete(message.id);
                            toReturn(evals);
                        }
                        ;
                    }
                    else if (Number(this.client.options.maxShards) / this.client.shardsPerCluster === evals.length) {
                        this.returns.delete(`eval_${message.id}`);
                        this.evals.delete(message.id);
                        toReturn(evals);
                    }
                    ;
                }
                ;
            }
            ;
            if (channel === 'stats') {
                if (!(this.client instanceof DateClient_1.DataClient) && this.client.lockKey === message.key) {
                    (_e = this.pubRedis) === null || _e === void 0 ? void 0 : _e.publish('returnStats', JSON.stringify({
                        key: this.client.lockKey,
                        id: message.id,
                        stats: {
                            guilds: this.client.guilds.size,
                            users: this.client.users.size,
                            estimatedTotalUsers: this.client.guilds.map(g => g.memberCount).reduce((a, b) => a + b, 0),
                            voice: this.client.voiceConnections.size,
                            shards: this.client.shards.map((s) => {
                                return {
                                    status: s.status,
                                    id: s.id,
                                    latency: s.latency,
                                    guilds: s.client.guilds.filter((g) => g.shard.id === s.id).length,
                                };
                            }),
                            memoryUsage: {
                                rss: process.memoryUsage().rss,
                                heapUsed: process.memoryUsage().heapUsed,
                            },
                            id: yield this.client.getFirstShard(),
                            uptime: this.client.uptime,
                        },
                    }));
                }
                ;
            }
            ;
            if (channel === 'returnStats') {
                let toReturn = this.returns.get(`stats_${message.id}`);
                if (toReturn && this.client.lockKey === message.key) {
                    const stats = this.stats.get(message.id) || [];
                    stats.push(message);
                    this.stats.set(message.id, stats);
                    if (this.client instanceof DateClient_1.DataClient) {
                        if (Number(this.client.maxShards) / this.client.shardsPerCluster === stats.length) {
                            this.returns.delete(`stats_${message.id}`);
                            this.stats.delete(message.id);
                            toReturn(this.formatStats(stats));
                        }
                        ;
                    }
                    else if (Number(this.client.options.maxShards) / this.client.shardsPerCluster === stats.length) {
                        this.returns.delete(`stats_${message.id}`);
                        this.stats.delete(message.id);
                        toReturn(this.formatStats(stats));
                    }
                    ;
                }
                else {
                    const stats = this.stats.get(message.id) || [];
                    stats.push(message);
                    this.stats.set(message.id, stats);
                }
                ;
            }
            ;
            const sub = this.subs.get(channel);
            if (sub)
                sub(message);
        });
    }
    ;
    formatStats(stats) {
        const data = {
            guilds: 0,
            users: 0,
            estimatedTotalUsers: 0,
            voice: 0,
            shards: [],
            memoryUsage: {
                heapUsed: 0,
                rss: 0,
            },
            clusters: [],
        };
        stats.forEach((clusterStats) => {
            data.guilds = data.guilds + clusterStats.stats.guilds;
            data.users = data.users + clusterStats.stats.users;
            data.estimatedTotalUsers = data.estimatedTotalUsers + clusterStats.stats.estimatedTotalUsers;
            data.voice = data.voice + clusterStats.stats.voice;
            clusterStats.stats.shards.forEach((shard) => {
                data.shards.push(shard);
            });
            data.memoryUsage.rss = data.memoryUsage.rss + clusterStats.stats.memoryUsage.rss;
            data.memoryUsage.heapUsed = data.memoryUsage.heapUsed + clusterStats.stats.memoryUsage.heapUsed;
            data.clusters.push({
                id: clusterStats.stats.id,
                shards: clusterStats.stats.shards.map(s => s.id),
                guilds: clusterStats.stats.guilds,
                users: clusterStats.stats.users,
                voice: clusterStats.stats.voice,
                memoryUsage: clusterStats.stats.memoryUsage,
                uptime: clusterStats.stats.uptime,
            });
        });
        return data;
    }
    ;
    getGuild(id) {
        return new Promise((resolve, _reject) => {
            var _a;
            this.returns.set(`guild_${id}`, resolve);
            (_a = this.pubRedis) === null || _a === void 0 ? void 0 : _a.publish('getGuild', JSON.stringify({ id: id }));
            setTimeout(() => {
                this.returns.delete(`user_${id}`);
                resolve(undefined);
            }, 2000);
        });
    }
    ;
    getUser(id) {
        return new Promise((resolve, _reject) => {
            var _a;
            this.returns.set(`user_${id}`, resolve);
            (_a = this.pubRedis) === null || _a === void 0 ? void 0 : _a.publish('getUser', JSON.stringify({ id: id }));
            setTimeout(() => {
                this.returns.delete(`user_${id}`);
                resolve(undefined);
            }, 2000);
        });
    }
    ;
    evalAll(script, timeout) {
        return new Promise((resolve, _reject) => {
            var _a;
            const id = `${this.client instanceof DateClient_1.DataClient ? '' : this.client.user ? this.client.user.id : ''}:${Date.now() + Math.random()}`;
            this.returns.set(`eval_${id}`, resolve);
            (_a = this.pubRedis) === null || _a === void 0 ? void 0 : _a.publish('eval', JSON.stringify({ id: id, script: script, clientid: this.client instanceof DateClient_1.DataClient ? '' : this.client.user ? this.client.user.id : '' }));
            setTimeout(() => {
                this.returns.delete(`eval_${id}`);
                resolve(undefined);
            }, timeout || 5000);
        });
    }
    ;
    getStats(key, timeout) {
        return new Promise((resolve, _reject) => {
            var _a;
            const id = `${this.client instanceof DateClient_1.DataClient ? '' : this.client.user ? this.client.user.id : ''}:${Date.now() + Math.random()}`;
            this.returns.set(`stats_${id}`, resolve);
            (_a = this.pubRedis) === null || _a === void 0 ? void 0 : _a.publish('stats', JSON.stringify({ key: key || this.client.lockKey, id: id }));
            setTimeout(() => {
                const stats = this.stats.get(id) || [];
                this.returns.delete(`stats_${id}`);
                this.stats.delete(id);
                resolve(this.formatStats(stats));
            }, timeout || 5000);
        });
    }
    ;
    sub(eventName, func) {
        var _a;
        this.subs.set(eventName, func);
        (_a = this.subRedis) === null || _a === void 0 ? void 0 : _a.subscribe(eventName);
    }
    ;
    pub(eventName, message) {
        var _a;
        (_a = this.pubRedis) === null || _a === void 0 ? void 0 : _a.publish(eventName, message);
    }
    ;
}
exports.PubSub = PubSub;
;
