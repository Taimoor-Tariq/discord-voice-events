interface StartMethod {
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    accessToken?: string | null
}

interface SubscribedEvent {
    unsubscribe: () => Promise<void>
}

interface VoiceChannel {
    channel_id: string,
    user_id: string
}

interface UserVoiceState {
    mute: boolean,
    deaf: boolean,
    self_mute: boolean,
    self_deaf: boolean,
    suppress: boolean
}

interface VoiceUser {
    id: string,
    username: string,
    avatar: string,
    state: UserVoiceState
}

interface VoiceState {
    user: VoiceUser,
    voice_state: UserVoiceState
}

interface User {
    id: string,
    username: string,
    avatar: string,
    discriminator: string,
    public_flags: number
}


export { StartMethod, SubscribedEvent, VoiceUser, VoiceState, VoiceChannel, User };