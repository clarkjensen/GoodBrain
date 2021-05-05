const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const User = require('./models/user');
const passport = require('passport');
const session = require('express-session');
const LocalStrategy = require('passport-local');
const flash = require('connect-flash');
const ejsMate = require('ejs-mate');
const moment = require('moment');



mongoose.connect('mongodb://localhost:27017/GoodBrain', { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    console.log("Database connected!");
});

const app = express();

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');


app.set('views', path.join(__dirname, 'views'));



app.use(express.urlencoded({ extended: true })); //so you can do things like const id = req.body.id;
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public'))); //'public' is just the name of the directory we want to serve


const sessionConfig = {
    secret: 'thisshouldbeabettersecret!',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}
app.use(session(sessionConfig));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});

const isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        req.flash('error', 'you must be signed in first!');
        return res.redirect('/login');
    }
    next();
}

app.get('/', (req, res) => {
    res.render('home');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = new User({ username });
        const registeredUser = await User.register(user, password);
        console.log(registeredUser);
        req.login(registeredUser, err => {
            if (err) return next(err);
            res.flash('success', "Logged in!");
            res.redirect('/');
        });
    } catch (e) {
        req.flash('error', e.message);
        res.redirect('register');
    }
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), (req, res) => {
    const redirectUrl = req.session.returnTo || '/';
    delete req.session.returnTo;
    req.flash('success', `Welcome ${req.body.username}!`);
    res.redirect(redirectUrl);
});

app.get('/logout', (req, res) => {
    req.logout();
    req.flash('success', "Logged out!");
    res.redirect('/login');
});

app.get('/new', isLoggedIn, async (req, res) => {
    const user = await User.findById(req.user._id);
    const goodThings = user.goodThings;
    var dateCurrentlyPrinting = "";
    res.render('new', { goodThings, dateCurrentlyPrinting });
});

app.get('/all', isLoggedIn, async (req, res) => {
    const user = await User.findById(req.user._id);
    const goodThings = user.goodThings;
    var dateCurrentlyPrinting = "";
    res.render('all', { goodThings, dateCurrentlyPrinting });
});

app.post('/new', isLoggedIn, async (req, res) => {
    const user = await User.findById(req.user._id);
    const goodThing = {
        text: req.body.goodThing.text,
        date: moment().format("MMMM Do YYYY")
    };
    user.goodThings.push(goodThing);
    await user.save();
    req.flash('success', 'Good thing added!');
    res.redirect('/new');
});

app.listen(3000, () => {
    console.log('Serving on port 3000');
});