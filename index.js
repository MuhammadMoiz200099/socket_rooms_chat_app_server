const express = require('express');
const socketio = require('socket.io');
const http = require('http');
const cors = require('cors');
const redis = require('redis')

const { addUser, removeUser, getUser, getUsersInRoom } = require('./users.js');

const PORT = process.env.PORT || 5000;

const router = require('./router');

const subscriber = redis.createClient();
const publishier = redis.createClient();

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
    cors: { origin: '*' }
});

app.use(cors());
app.use(router);
let socket;

subscriber.on('message', function (channel, messageObj) {
    const { user, message, action } = JSON.parse(messageObj);
    switch(action) {
        case 'addUser':
            if(getUsersInRoom(user.room).length === 1) {
                socket.emit('newMessage', { user: 'admin', text: `${user.name}, welcome to room ${user.room}.` });
            }
            if(getUsersInRoom(user.room).length > 0) {
                socket.broadcast.to(user.room).emit('newMessage', { user: 'admin', text: `${user.name} has joined!` });    
            }
            io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });
        return;
        case 'deleteUser':
            io.to(user.room).emit('newMessage', { user: 'Admin', text: `${user.name} has left.` });
            io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });
            console.log(`${user.name} has left.`)
        return;
        case 'sendMsg':
            io.to(user.room).emit('newMessage', { user: user.name, text: message });
        return;                
    }
});

io.on('connection', (connectionSocket) => {
    console.log('Connected!!!');
    socket = connectionSocket;

    socket.on('join', ({ name, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, name, room });

        if (error) return callback(error);

        socket.join(user.room);

        callback();
        subscriber.subscribe(room);

        const userMessage = {
            user,
            message: '',
            action: 'addUser'
        }
        if(user) {
            publishier.publish(room, JSON.stringify(userMessage));
            console.log(`${user.name} has Joined.`);
        }
    });

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id);
        const userMessage = {
            user,
            message,
            action: 'sendMsg'
        }
        if(user) {
            publishier.publish(user.room, JSON.stringify(userMessage));
            socket.emit(user.room, message);
        }
        callback();
    });

    socket.on('disconnect', () => {
        const user = removeUser(socket.id);
        const userMessage = {
            user,
            message: '',
            action: 'deleteUser'
        }
        if(user) {
            publishier.publish(user.room, JSON.stringify(userMessage));
            subscriber.unsubscribe(user.room);
        }
    });
});
server.listen(PORT, () => console.log(`server has started on port: ${PORT}`));