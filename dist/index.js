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
exports.VoiceSession = void 0;
const events_1 = __importDefault(require("events"));
const collection_js_1 = require("@Taimoor-Tariq/collection-js");
const RPC = require('@Taimoor-Tariq/discord-rpc');
const scopes = ['rpc', 'rpc.voice.read', 'rpc.voice.write'];
class VoiceSession extends events_1.default {
    constructor() {
        super();
        this.CHANNEL_ID = null;
        this.JOIN_EVENT = null;
        this.LEAVE_EVENT = null;
        this.START_SPEAKING_EVENT = null;
        this.STOP_SPEAKING_EVENT = null;
        this.UPDATE_EVENT = null;
        this.VOICE_MEMBERS = new collection_js_1.Collection();
        this.RPC_CLIENT = new RPC.Client({ transport: 'ipc' });
    }
    start({ clientId, clientSecret, redirectUri = 'http://localhost:9877/', accessToken = null }) {
        return __awaiter(this, void 0, void 0, function* () {
            this.RPC_CLIENT.on('VOICE_CHANNEL_SELECT', ({ channel_id }) => this.selectChannel(channel_id));
            this.RPC_CLIENT.on('VOICE_STATE_CREATE', ({ user, voice_state }) => {
                this.VOICE_MEMBERS.set(user.id, {
                    id: user.id,
                    username: user.username,
                    avatar: user.avatar,
                    state: voice_state
                });
                this.emit('userJoined', this.VOICE_MEMBERS.get(user.id));
            });
            this.RPC_CLIENT.on('VOICE_STATE_DELETE', ({ user }) => {
                this.emit('userLeft', this.VOICE_MEMBERS.get(user.id));
                this.VOICE_MEMBERS.delete(user.id);
                if (user.id == this.RPC_CLIENT.client.user.id)
                    this.disconnect();
            });
            this.RPC_CLIENT.on('VOICE_STATE_UPDATE', ({ user, voice_state }) => {
                this.VOICE_MEMBERS.set(user.id, {
                    id: user.id,
                    username: user.username,
                    avatar: user.avatar,
                    state: voice_state
                });
                this.emit('userUpdated', this.VOICE_MEMBERS.get(user.id));
            });
            this.RPC_CLIENT.on('SPEAKING_START', ({ user_id }) => this.emit('userStartedSpeaking', this.VOICE_MEMBERS.get(user_id)));
            this.RPC_CLIENT.on('SPEAKING_STOP', ({ user_id }) => this.emit('userStoppedSpeaking', this.VOICE_MEMBERS.get(user_id)));
            this.RPC_CLIENT.on('ready', () => __awaiter(this, void 0, void 0, function* () {
                var _a;
                this.CHANNEL_ID = ((_a = (yield this.RPC_CLIENT.request(RPC.Commands.GET_SELECTED_VOICE_CHANNEL))) === null || _a === void 0 ? void 0 : _a.id) || null;
                this.init(this.CHANNEL_ID);
                yield this.RPC_CLIENT.subscribe('VOICE_CHANNEL_SELECT');
                this.emit('ready', this.RPC_CLIENT.user, this.RPC_CLIENT.accessToken);
            }));
            this.RPC_CLIENT.login({ clientId, redirectUri, scopes, clientSecret, accessToken });
        });
    }
    init(id) {
        return __awaiter(this, void 0, void 0, function* () {
            this.VOICE_MEMBERS.clear();
            if (id == null)
                return;
            this.CHANNEL_ID = id;
            this.JOIN_EVENT = yield this.RPC_CLIENT.subscribe('VOICE_STATE_CREATE', { channel_id: id });
            this.LEAVE_EVENT = yield this.RPC_CLIENT.subscribe('VOICE_STATE_DELETE', { channel_id: id });
            this.START_SPEAKING_EVENT = yield this.RPC_CLIENT.subscribe('SPEAKING_START', { channel_id: id });
            this.STOP_SPEAKING_EVENT = yield this.RPC_CLIENT.subscribe('SPEAKING_STOP', { channel_id: id });
            this.UPDATE_EVENT = yield this.RPC_CLIENT.subscribe('VOICE_STATE_UPDATE', { channel_id: id });
            (yield this.RPC_CLIENT.request(RPC.Commands.GET_CHANNEL, {
                channel_id: id
            })).voice_states.map((u) => {
                this.VOICE_MEMBERS.set(u.user.id, {
                    id: u.user.id,
                    username: u.user.username,
                    avatar: u.user.avatar,
                    state: u.voice_state
                });
            });
        });
    }
    selectChannel(id) {
        var _a, _b, _c, _d, _e;
        return __awaiter(this, void 0, void 0, function* () {
            yield ((_a = this.JOIN_EVENT) === null || _a === void 0 ? void 0 : _a.unsubscribe());
            yield ((_b = this.LEAVE_EVENT) === null || _b === void 0 ? void 0 : _b.unsubscribe());
            yield ((_c = this.START_SPEAKING_EVENT) === null || _c === void 0 ? void 0 : _c.unsubscribe());
            yield ((_d = this.STOP_SPEAKING_EVENT) === null || _d === void 0 ? void 0 : _d.unsubscribe());
            yield ((_e = this.UPDATE_EVENT) === null || _e === void 0 ? void 0 : _e.unsubscribe());
            this.init(id);
        });
    }
    disconnect() {
        var _a, _b, _c, _d, _e;
        return __awaiter(this, void 0, void 0, function* () {
            yield ((_a = this.JOIN_EVENT) === null || _a === void 0 ? void 0 : _a.unsubscribe());
            yield ((_b = this.LEAVE_EVENT) === null || _b === void 0 ? void 0 : _b.unsubscribe());
            yield ((_c = this.START_SPEAKING_EVENT) === null || _c === void 0 ? void 0 : _c.unsubscribe());
            yield ((_d = this.STOP_SPEAKING_EVENT) === null || _d === void 0 ? void 0 : _d.unsubscribe());
            yield ((_e = this.UPDATE_EVENT) === null || _e === void 0 ? void 0 : _e.unsubscribe());
            this.CHANNEL_ID = null;
            this.JOIN_EVENT = null;
            this.LEAVE_EVENT = null;
            this.START_SPEAKING_EVENT = null;
            this.STOP_SPEAKING_EVENT = null;
            this.UPDATE_EVENT = null;
            this.VOICE_MEMBERS.clear();
        });
    }
}
exports.VoiceSession = VoiceSession;
//# sourceMappingURL=index.js.map