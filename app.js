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

    socket.on('chat.join', (username) => {
        // Save the IP and the name of the user in the current socket
        socket.ip = requestIp.getClientIp(socket.request);
        socket.username = username;

        consoleLog('chat', 'join', `[${socket.username}]`.bold + ' join channel with IP ' + `${socket.ip}`.yellow);

        const json = JSON.stringify({username: socket.username});

        // Emit event "chat.join" to connected users (without the current one)
        socket.broadcast.emit('chat.join', json);

        // Emit event "chat.join" to current user only
        socket.emit('chat.join', json);

        // Retrieve all users from the SET "users"
        redisClient.smembers('users', (err, users) => {
            users.forEach(user => {
                socket.emit('chat.add_user', JSON.stringify({username: user}));
            });
        });

        // Retrieve all messages of the LIST "messages"
        redisClient.lrange('messages', 0, 4, (err, jsonMessages) => {
            jsonMessages.reverse().forEach((jsonMessage) => {
                socket.emit('chat.message', jsonMessage);
            });
        });

        // Add current user to the SET "users"
        redisClient.sadd('users', socket.username);
    });

    socket.on('chat.message', (message) => {
        consoleLog('chat', 'message', ('[' + socket.username + ']').bold + ' ' + message);

        const json = JSON.stringify({username: socket.username, message});

        redisClient.lpush('messages', json, (err, reply) => {
            console.log('redis lpush => ' + reply);
        });

        // Emit event "chat.message" to connected users (without the current one)
        socket.broadcast.emit('chat.message', json);

        // Emit event "chat.message" to current user only
        socket.emit('chat.message', json);
    });

    socket.on('disconnect', () => {
        consoleLog('socket', 'disconnect', ('[' + socket.username + ']').bold + ' socket closed');

        if (socket.username !== undefined) {
            // Emit event "chat.disconnect" to connected users (without the current one)
            socket.broadcast.emit('chat.disconnect', JSON.stringify({username: socket.username}));

            // Remove current user to the SET "users"
            redisClient.srem('users', socket.username);
        }
    });
});

http.listen(3000, () => console.log('Listening on ' + 'http://localhost:3000\n'.green));