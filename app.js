require('colors');

const
    express = require('express'),
    app = express(),
    http = require('http').createServer(app),
    io = require('socket.io')(http),
    redis = require("redis"),
    redisClient = redis.createClient(),
    requestIp = require('request-ip');

function consoleLog(event, method, msg = undefined) {
    console.log(event.red + '.' + method.yellow + (msg !== undefined ? (' => ' + msg) : ''));
}

app.get('/', (req, res) => {
    res.sendFile(`${__dirname}/index.html`);
});

app.use('/assets', express.static(__dirname + '/assets'));

io.on('connection', (socket) => {
    consoleLog('socket', 'connection', 'socket opened');

    socket.on('room', function (room) {
        socket.join(room);
    });

    // Chat
    socket.on('chat.join', (username) => {
        // Save the IP and the name of the user in the current socket
        socket.ip = requestIp.getClientIp(socket.request);
        socket.username = username;
        socket.channel = 'general';
        socket.join('general');

        consoleLog('chat', 'join', `[${socket.username}]`.bold + ' join channel with IP ' + `${socket.ip}`.yellow);

        const json = JSON.stringify({username: socket.username});

        io.to(socket.channel).emit('chat.join', json);

        // Retrieve all users from the SET "users"
        redisClient.smembers('users', (err, users) => {
            users.forEach(user => {
                socket.emit('chat.add_user', JSON.stringify({username: user}));
            });
        });

        // Retrieve all messages of the LIST "messages"
        redisClient.lrange(`messages:${socket.channel}`, 0, 4, (err, jsonMessages) => {
            jsonMessages.reverse().forEach((jsonMessage) => {
                io.in('general').emit('chat.message', jsonMessage);
            });
        });

        // Add current user to the SET "users"
        redisClient.sadd('users', socket.username);

        // List de channel
        redisClient.smembers('channels', (err, channels) => {
            socket.emit('channel.getList', channels);
        });
    });

    socket.on('chat.message', (message) => {
        consoleLog('chat', 'message', ('[' + socket.username + ']').bold + ` send to channel "${socket.channel}" the message "${message}"`);

        const json = JSON.stringify({username: socket.username, message, 'date': new Date() });

        redisClient.lpush(`messages:${socket.channel}`, json, (err, reply) => {
            console.log('redis lpush => ' + reply);
        });

        io.in(socket.channel).emit('chat.message', json);
    });

    // Chatroom
    socket.on('chatroom.joinChannel', (channel) => {
        socket.leave(socket.channel, () => {
            socket.join(channel);
            consoleLog('chatroom', 'joinChannel', `${socket.username} leave channel "${socket.channel}" and join channel "${channel}".`);
        });
        socket.channel = channel;

        // Retrieve all messages of the LIST "messages"
        redisClient.lrange(`messages:${socket.channel}`, 0, 10, (err, jsonMessages) => {
            jsonMessages.reverse().forEach((jsonMessage) => {
                socket.emit('chat.message', jsonMessage);
            });
        });
    });

    socket.on('disconnect', () => {
        consoleLog('socket', 'disconnect', ('[' + socket.username + ']').bold + ' socket closed');
    });
});

http.listen(3000, () => console.log('Listening on ' + 'http://localhost:3000\n'.green));

room = "abc123";
io.to(room).emit('chat.message', 'what is going on, party people?');
console.log('le log de test du turfu');