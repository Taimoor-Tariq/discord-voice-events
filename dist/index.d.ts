import * as Types from './deps';
declare class VoiceSession {
    private SESSION;
    constructor();
    start({ clientId, clientSecret, redirectUri, accessToken }: Types.StartMethod): void;
    onReady(callback: (user: Types.User, accessToken: string) => void): void;
    onUserJoined(callback: (user: Types.User) => void): void;
    onUserLeft(callback: (user: Types.User) => void): void;
    onUserUpdated(callback: (user: Types.User) => void): void;
    onUserStartedSpeaking(callback: (user: Types.User) => void): void;
    onUserStoppedSpeaking(callback: (user: Types.User) => void): void;
}
export { VoiceSession };
