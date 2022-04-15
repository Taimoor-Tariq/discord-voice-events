const { VoiceSession } = require('discord-voice-events');
const session = new VoiceSession();

session.onReady((user, token) => {
    console.log(`Authenticated as ${user.username}#${user.discriminator} (${user.id})`);
    console.log(`Token: ${token}`); // Can store this token for later use.
});

session.onUserStartedSpeaking((user) => console.log(`${user.username} started speaking.`));
session.onUserStoppedSpeaking((user) => console.log(`${user.username} stopped speaking.`));

session.onUserJoined((user) => console.log(`${user.username} joined.`));
session.onUserLeft((user) => console.log(`${user.username} left.`));
session.onUserUpdated((user) => console.log(`${user.username} updated.`));

session.start({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI, // Default: http://localhost:9877/
    // accessToken: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", If the user is already authenticated, you can pass the access token here.
});