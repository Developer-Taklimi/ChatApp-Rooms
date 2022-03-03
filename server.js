if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
  }

const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages');
const { userJoin, getCurrentUser, getRoomUsers, userLeave } = require('./utils/users');
const req = require('express/lib/request');
const res = require('express/lib/response');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// new codes for register 

const bcrypt = require('bcrypt');

const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const { initialize } = require('passport');
const initializePassport = require('./passport-config');
initializePassport(
    passport,
    email => users.find(user => user.email === email),
    id => users.find(user => user.id === id)
  )  

const users = [];
app.set('view-engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(flash());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
  }))            
  
app.use(passport.initialize())
app.use(passport.session())

app.get('/', (req, res) => {
    res.render('login.ejs', { name: 'Sam' })
});

app.get('/login', (req, res) => {
    res.render('login.ejs')
});
app.post('/login',passport.authenticate('local', {
    successRedirect:'./index.html',
    failureRedirect: '/login',
    failureFlash:true
} ) )
// i think i need to go to my index.html!
// app.post('/login', (req, res) => { });
app.get('/register', (req, res) => {
    res.render('register.ejs')
})

app.post('/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        users.push({
            id: Date.now().toString(),
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword
        })
        res.redirect('/login')
    } catch {
        res.redirect('/register')
    }
    // console.log(users);
});
// Set static folder 
app.use(express.static(path.join(__dirname, 'public')));// need to fix this 



const botName = 'D&D bot';

// run when a client connects
io.on('connection', socket => {
    socket.on('joinRoom', ({ username, room }) => {
        const user = userJoin(socket.id, username, room);
        socket.join(user.room);
        // Welcome current user 
        socket.emit('message', formatMessage(botName, 'Welcome to ChatCord!'));

        // Broadcast when a user connects
        socket.broadcast.to(user.room).emit('message', formatMessage(botName, `${user.username} has joined the chat`));

        //Send users and room info
        io.to(user.room).emit('roomUsers', {
            room: user.room,
            users: getRoomUsers(user.room)
        });
        //Broadcast every body
        // io.emit();
    });

    // Listen for chatMessage
    socket.on('chatMessage', msg => {
        const user = getCurrentUser(socket.id);

        io.to(user.room).emit('message', formatMessage(user.username, msg));
    });

    // Runs when client disconnets
    socket.on('disconnect', () => {
        const user = userLeave(socket.id);

        if (user) {
            io.to(user.room).emit('message',
                formatMessage(botName, `${user.username} has left the chat`));
        }

        //Send users and room info
        io.to(user.room).emit('roomUsers', {
            room: user.room,
            users: getRoomUsers(user.room)
        });
    });

});

// const PORT = 3000 || process.env.PORT;
const PORT = 3000;
server.listen(PORT, () => console.log(`server running on port ${PORT}`));
