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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Eris = __importStar(require("eris"));
const ioredis_1 = __importDefault(require("ioredis"));
const constants_1 = require("./constants");
const PubSub_1 = require("./util/PubSub");
const RedisLock = require('ioredis-lock');
;
;
;
;
;
class GatewayClient extends Eris.Client {
    constructor(token, options) {
        super(token, options.erisOptions || {});
        this.stats = {
            enabled: true,
            interval: 5000,
        };
        this.webhooks = {};
        if (!options)
            throw new Error('No options provided');
        if (!options.shardsPerCluster)
            throw new Error('No function to get the first shard id provided.');
        this.options.autoreconnect = true;
        this.redisPort = options.redisPort;
        this.redisHost = options.redisHost;
        this.redisPassword = options.redisPassword;
        this.getFirstShard = options.getFirstShard;
        this.shardsPerCluster = options.shardsPerCluster || 5;
        this.lockKey = options.lockKey || 'redis-sharder';
        this.webhooks = options.webhooks || {};
        this.hasLock = false;
        this.fullyStarted = false;
        this.initialize();
        this.setupListeners();
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            this.redisConnection = new ioredis_1.default(this.redisPort, this.redisHost, {
                password: this.redisPassword,
            });
            this.redisLock = RedisLock.createLock(this.redisConnection, {
                timeout: this.shardsPerCluster * 7500,
                retries: Number.MAX_SAFE_INTEGER,
                delay: 100,
            });
            setInterval(() => {
                var _a;
                if (this.fullyStarted) {
                    (_a = this.shards.find((s) => s.status === 'disconnected')) === null || _a === void 0 ? void 0 : _a.connect();
                }
                ;
            }, 5000);
            this.pubSub = new PubSub_1.PubSub({ redisHost: this.redisHost, redisPassword: this.redisPassword, redisPort: this.redisPort }, this);
        });
    }
    ;
    setupListeners() {
        this.on('ready', () => {
            this.redisLock.release(`${this.lockKey}:shard:identify`);
            this.hasLock = false;
            this.fullyStarted = true;
        });
        this.on('shardDisconnect', (_error, id) => __awaiter(this, void 0, void 0, function* () {
            if (this.hasLock === false) {
                setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b;
                    this.shardStatusUpdate(this.shards.get(id));
                    if (this.aquire()) {
                        if (((_a = this.shards.get(id)) === null || _a === void 0 ? void 0 : _a.status) === 'disconnected')
                            yield ((_b = this.shards.get(id)) === null || _b === void 0 ? void 0 : _b.connect());
                    }
                    else {
                    }
                    ;
                }), 2000);
            }
            ;
        }));
        this.on('shardReady', (id) => {
            this.shardStatusUpdate(this.shards.get(id));
            if (this.shards.find((s) => s.status === 'disconnected') && this.fullyStarted === true) {
                const shard = this.shards.find((s) => s.status === 'disconnected');
                if (shard)
                    shard.connect();
            }
            else if (this.hasLock && this.fullyStarted === true) {
                try {
                    this.redisLock.release(`${this.lockKey}:shard:identify`);
                    this.hasLock = false;
                }
                catch (_a) { }
                ;
            }
            ;
        });
    }
    ;
    calculateThisShards() {
        return __awaiter(this, void 0, void 0, function* () {
            const firstShardID = yield this.getFirstShard();
            return [this.shardsPerCluster * firstShardID, this.shardsPerCluster * firstShardID + (this.shardsPerCluster - 1)];
        });
    }
    ;
    queue() {
        return __awaiter(this, void 0, void 0, function* () {
            const shards = yield this.calculateThisShards();
            this.options.firstShardID = shards[0];
            this.options.lastShardID = shards[1];
            if (yield this.aquire()) {
                this.connect();
            }
            else
                setTimeout(() => {
                    this.queue();
                }, 5000);
        });
    }
    ;
    aquire() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, _reject) => {
                this.redisLock.acquire(`${this.lockKey}:shard:identify`).then((err) => {
                    if (err)
                        return resolve(false);
                    this.hasLock = true;
                    this.emit('acquiredLock');
                    resolve(true);
                }).catch(() => {
                    resolve(false);
                });
            });
        });
    }
    ;
    getStats(key, timeout) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            return (_a = this.pubSub) === null || _a === void 0 ? void 0 : _a.getStats(key || this.lockKey, timeout);
        });
    }
    ;
    shardStatusUpdate(shard) {
        var _a, _b;
        if (!((_a = this.webhooks.discord) === null || _a === void 0 ? void 0 : _a.id) || !((_b = this.webhooks.discord) === null || _b === void 0 ? void 0 : _b.token))
            return;
        let color = undefined;
        if (shard.status === 'ready')
            color = constants_1.colors.green;
        if (shard.status === 'disconnected')
            color = constants_1.colors.red;
        this.executeWebhook(this.webhooks.discord.id, this.webhooks.discord.token, {
            embeds: [{
                    title: 'Shard status update', description: `ID: **${shard.id}** \nStatus: **${shard.status}**`,
                    color: color,
                    timestamp: new Date(),
                }],
        });
    }
    ;
    getRedis() {
        return this.redisConnection;
    }
    ;
    getGuildByID(id) {
        var _a;
        return (_a = this.pubSub) === null || _a === void 0 ? void 0 : _a.getGuild(id);
    }
    ;
    getUserByID(id) {
        var _a;
        return (_a = this.pubSub) === null || _a === void 0 ? void 0 : _a.getUser(id);
    }
    ;
    evalAll(script) {
        var _a;
        if (!this.redisPassword)
            return new Error('Evaling across clusters requires your redis instance to be secured with a password!');
        return (_a = this.pubSub) === null || _a === void 0 ? void 0 : _a.evalAll(script);
    }
    ;
    subscribeToEvent(event, func) {
        var _a;
        (_a = this.pubSub) === null || _a === void 0 ? void 0 : _a.sub(event, func);
        return this;
    }
    ;
    publish(event, message) {
        var _a;
        (_a = this.pubSub) === null || _a === void 0 ? void 0 : _a.pub(event, message);
    }
    ;
}
exports.GatewayClient = GatewayClient;
;
