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
const PubSub_1 = require("./util/PubSub");
;
class DataClient {
    constructor(options) {
        if (!options)
            throw new Error('No options provided');
        if (!options.maxShards)
            throw new Error('No max shards provided.');
        if (!options.shardsPerCluster)
            throw new Error('No shards per cluster provided.');
        this.redisPort = options.redisPort;
        this.redisHost = options.redisHost;
        this.redisPassword = options.redisPassword;
        this.lockKey = options.lockKey || 'redis-sharder';
        this.shardsPerCluster = options.shardsPerCluster;
        this.maxShards = options.maxShards;
        this.initialize();
    }
    ;
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            this.redisConnection = new ioredis_1.default(this.redisPort, this.redisHost, {
                password: this.redisPassword,
            });
            this.pubSub = new PubSub_1.PubSub({ redisHost: this.redisHost, redisPassword: this.redisPassword, redisPort: this.redisPort }, this);
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
exports.DataClient = DataClient;
;
