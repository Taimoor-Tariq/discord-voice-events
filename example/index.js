const { VoiceSession } = require('../dist');
const session = new VoiceSession();

session.on('ready', (user, token) => {
    console.log(`Authenticated as ${user.username}#${user.discriminator} (${user.id})`);
    console.log(`Token: ${token}`);
});

session.on('userStartedSpeaking', user => console.log(`${user.username} started speaking.`));
session.on('userStoppedSpeaking', user => console.log(`${user.username} stopped speaking.`));

session.on('userJoined', user => console.log(`${user.username} joined.`));
session.on('userLeft', user => console.log(`${user.username} left.`));
session.on('userUpdated', user => console.log(`${user.username} updated.`));

session.start({
    clientId: '678289107167739914',
    clientSecret: '_N45EQH03sXVpy9XU6zjd0di4LTVkA1-',
    accessToken: 'FGNJKPoYIVBn1ENof6cGAmYCZUPP06',
});