import * as Types from './deps';
import EventEmitter from 'events';
import { Collection } from '@Taimoor-Tariq/collection-js';

const RPC = require('@Taimoor-Tariq/discord-rpc');
const scopes = ['rpc', 'rpc.voice.read'];

declare interface VoiceSessionHandeler {
    on(eventName: 'ready', listener: (user: Types.User, accessToken: string) => void): this;
    on(eventName: 'userStartedSpeaking', listener: (user: Types.VoiceUser) => void): this;
    on(eventName: 'userStoppedSpeaking', listener: (user: Types.VoiceUser) => void): this;
    on(eventName: 'userJoined', listener: (user: Types.VoiceUser) => void): this;
    on(eventName: 'userLeft', listener: (user: Types.VoiceUser) => void): this;
    on(eventName: 'userUpdated', listener: (user: Types.VoiceUser) => void): this;
}

class VoiceSessionHandeler extends EventEmitter {
    private CHANNEL_ID: string | null;
    private JOIN_EVENT: Types.SubscribedEvent | null;
    private LEAVE_EVENT: Types.SubscribedEvent | null;
    private START_SPEAKING_EVENT: Types.SubscribedEvent | null;
    private STOP_SPEAKING_EVENT: Types.SubscribedEvent | null;
    private UPDATE_EVENT: Types.SubscribedEvent | null;
    private VOICE_MEMBERS: Collection<string, object>;
    private RPC_CLIENT: any;

    constructor() {
        super();
        this.CHANNEL_ID = null;
        this.JOIN_EVENT = null;
        this.LEAVE_EVENT = null;
        this.START_SPEAKING_EVENT = null;
        this.STOP_SPEAKING_EVENT = null;
        this.UPDATE_EVENT = null;
        this.VOICE_MEMBERS = new Collection();
        this.RPC_CLIENT = new RPC.Client({transport: 'ipc'});
    }

    async start({ clientId, clientSecret, redirectUri='http://localhost:9877/', accessToken=null }: Types.StartMethod) {
        this.RPC_CLIENT.on('VOICE_CHANNEL_SELECT', ({channel_id}: Types.VoiceChannel) => this.selectChannel(channel_id));
        this.RPC_CLIENT.on('VOICE_STATE_CREATE', ({user, voice_state}: Types.VoiceState) => {
            this.VOICE_MEMBERS.set(user.id, {
                id: user.id,
                username: user.username,
                avatar: user.avatar,
                state: voice_state
            })
            this.emit('userJoined', this.VOICE_MEMBERS.get(user.id));
        });
        this.RPC_CLIENT.on('VOICE_STATE_DELETE', ({user}: Types.VoiceState) => {
            this.emit('userLeft', this.VOICE_MEMBERS.get(user.id));
            this.VOICE_MEMBERS.delete(user.id);
            if (user.id == this.RPC_CLIENT.user.id) this.disconnect();
        });
        this.RPC_CLIENT.on('VOICE_STATE_UPDATE', ({user, voice_state}: Types.VoiceState) => {
            this.VOICE_MEMBERS.set(user.id, {
                id: user.id,
                username: user.username,
                avatar: user.avatar,
                state: voice_state
            })
            this.emit('userUpdated', this.VOICE_MEMBERS.get(user.id));
        });

        this.RPC_CLIENT.on('SPEAKING_START', ({user_id}: Types.VoiceChannel) => this.emit('userStartedSpeaking', this.VOICE_MEMBERS.get(user_id)));
        this.RPC_CLIENT.on('SPEAKING_STOP', ({user_id}: Types.VoiceChannel) => this.emit('userStoppedSpeaking', this.VOICE_MEMBERS.get(user_id)));
        
        this.RPC_CLIENT.on('ready', async () => {
            this.CHANNEL_ID = (await this.RPC_CLIENT.request(RPC.Commands.GET_SELECTED_VOICE_CHANNEL))?.id || null;
            this.init(this.CHANNEL_ID);
            await this.RPC_CLIENT.subscribe('VOICE_CHANNEL_SELECT');
            
            this.emit('ready', this.RPC_CLIENT.user, this.RPC_CLIENT.accessToken);
        });

        this.RPC_CLIENT.login({ clientId, redirectUri, scopes, clientSecret, accessToken });
    }

    private async init(id: string | null) {
        this.VOICE_MEMBERS.clear();
        if (id == null) return;

        this.CHANNEL_ID = id;
        this.JOIN_EVENT = await this.RPC_CLIENT.subscribe('VOICE_STATE_CREATE', {channel_id: id});
        this.LEAVE_EVENT = await this.RPC_CLIENT.subscribe('VOICE_STATE_DELETE', {channel_id: id});
        this.START_SPEAKING_EVENT = await this.RPC_CLIENT.subscribe('SPEAKING_START', {channel_id: id});
        this.STOP_SPEAKING_EVENT = await this.RPC_CLIENT.subscribe('SPEAKING_STOP', {channel_id: id});
        this.UPDATE_EVENT = await this.RPC_CLIENT.subscribe('VOICE_STATE_UPDATE', {channel_id: id});

        (await this.RPC_CLIENT.request(RPC.Commands.GET_CHANNEL, {
            channel_id: id
        })).voice_states.map((u: Types.VoiceState) => {
            this.VOICE_MEMBERS.set(u.user.id, {
                id: u.user.id,
                username: u.user.username,
                avatar: u.user.avatar,
                state: u.voice_state
            })
        })
    }

    private async selectChannel(id: string) {
        await this.JOIN_EVENT?.unsubscribe();
        await this.LEAVE_EVENT?.unsubscribe();
        await this.START_SPEAKING_EVENT?.unsubscribe();
        await this.STOP_SPEAKING_EVENT?.unsubscribe();
        await this.UPDATE_EVENT?.unsubscribe();

        this.init(id);
    }

    private async disconnect() {
        await this.JOIN_EVENT?.unsubscribe();
        await this.LEAVE_EVENT?.unsubscribe();
        await this.START_SPEAKING_EVENT?.unsubscribe();
        await this.STOP_SPEAKING_EVENT?.unsubscribe();
        await this.UPDATE_EVENT?.unsubscribe();

        this.CHANNEL_ID = null;
        this.JOIN_EVENT = null;
        this.LEAVE_EVENT = null;
        this.START_SPEAKING_EVENT = null;
        this.STOP_SPEAKING_EVENT = null;
        this.UPDATE_EVENT = null;
        this.VOICE_MEMBERS.clear();
    }
}

class VoiceSession {
    private SESSION: any;

    constructor() {
        this.SESSION = new VoiceSessionHandeler();
    };

    start({ clientId, clientSecret, redirectUri='http://localhost:9877/', accessToken=null }: Types.StartMethod) {
        this.SESSION.start({ clientId, clientSecret, redirectUri, accessToken });
    };

    onReady(callback: (user: Types.User, accessToken: string) => void) { this.SESSION.on('ready', callback) };
    onUserJoined(callback: (user: Types.User) => void) { this.SESSION.on('userJoined', callback) };
    onUserLeft(callback: (user: Types.User) => void) { this.SESSION.on('userLeft', callback) };
    onUserUpdated(callback: (user: Types.User) => void) { this.SESSION.on('userUpdated', callback) };
    onUserStartedSpeaking(callback: (user: Types.User) => void) { this.SESSION.on('userStartedSpeaking', callback) };
    onUserStoppedSpeaking(callback: (user: Types.User) => void) { this.SESSION.on('userStoppedSpeaking', callback) };
}

export { VoiceSession };