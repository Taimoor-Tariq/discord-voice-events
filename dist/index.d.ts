/// <reference types="node" />
import * as Types from './deps';
import EventEmitter from 'events';
declare interface VoiceSession {
    on(eventName: 'ready', listener: (user: Types.User, accessToken: string) => void): this;
    on(eventName: 'userStartedSpeaking', listener: (user: Types.VoiceUser) => void): this;
    on(eventName: 'userStoppedSpeaking', listener: (user: Types.VoiceUser) => void): this;
    on(eventName: 'userJoined', listener: (user: Types.VoiceUser) => void): this;
    on(eventName: 'userLeft', listener: (user: Types.VoiceUser) => void): this;
    on(eventName: 'userUpdated', listener: (user: Types.VoiceUser) => void): this;
}
declare class VoiceSession extends EventEmitter {
    private CHANNEL_ID;
    private JOIN_EVENT;
    private LEAVE_EVENT;
    private START_SPEAKING_EVENT;
    private STOP_SPEAKING_EVENT;
    private UPDATE_EVENT;
    private VOICE_MEMBERS;
    private RPC_CLIENT;
    constructor();
    start({ clientId, clientSecret, redirectUri, accessToken }: Types.StartMethod): Promise<void>;
    private init;
    private selectChannel;
    private disconnect;
}
export { VoiceSession };
