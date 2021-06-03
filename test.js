var redis = require('redis');
var subscriber = redis.createClient();
var publisher = redis.createClient();
subscriber.on('subscribe', (channel, message) => {
    console.log(channel, message);
});
subscriber.subscribe('chat');
subscriber.subscribe('chat');
subscriber.subscribe('chat');
publisher.publish('chat', 'hello')
subscriber.subscribe('chat', (message) => {
    console.log(message);
});

subscriber.on('message', (channel, message) => {
    console.log(message);
})