//jshint esversion:6
require('dotenv').config();
const express = require("express");
const app= express();
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
// encrypt= I can access data with a key.
// const encrypt = require("mongoose-encryption");
// md5= weak password hash
// const md5 = require("md5");
// strong password hash
// const bcrypt= require("bcrypt");
// const saltRounds= 10;
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
var findOrCreate = require('mongoose-findorcreate');
mongoose.connect('mongodb://localhost:27017/userDB', {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set('useCreateIndex', true);
// setup for express session
app.use(session({
  secret: 'my secret',
  resave: false,
  saveUninitialized: false,
}));
// setup for passport
app.use(passport.initialize());
app.use(passport.session());
// set ejs
app.set('view engine', 'ejs');
// set bodyParser
app.use(bodyParser.urlencoded({extended:false}));
app.use(express.static("public"));

const userSchema= new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
  secret: String
});
// add plug in to schema
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const secret= process.env.SECRET;

// userSchema.plugin(encrypt,{ secret: secret, encryptedFields:["password"]});
const User= new mongoose.model("User", userSchema);
// passport local configuration
passport.use(User.createStrategy());
// setup for passport
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});
// setup google auth2.0 Strategy for passport
passport.use(new GoogleStrategy({
  // saved google client id and client secret in .env
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    // same as on google cloud console
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
// set up facebook auth 2.0 Strategy for passport
passport.use(new FacebookStrategy({
    clientID: process.env.APP_ID,
    clientSecret: process.env.APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
app.get("/",(req,res)=>{
  res.render("home");
});

// set route for user to authenticate with google
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect to content.
    res.redirect('/secrets');
  });
// set route for user to authenticate with facbook
app.get('/auth/facebook',
    passport.authenticate('facebook'));
app.get('/auth/facebook/secrets',
    passport.authenticate('facebook', { failureRedirect: '/login' }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect('/secrets');
      });
app.get("/login",(req,res)=>{
  res.render("login");
});

app.get("/register",(req,res)=>{
  res.render("register");
});
app.get("/secrets", (req,res)=>{
  User.find({"secret":{$ne: null}}, (err, foundUser)=>{
    if (err){
      console.error(err);
    } else {
      if (foundUser) {
        res.render("secrets", {userWithSecrets: foundUser});
      }
    }
  });

  });
app.get("/logout",(req,res)=>{
  req.logout();
  res.redirect('/');
});
app.get("/submit", (req,res)=>{
  if (req.user){
      res.render("submit");}
      else { res.redirect("/login");}
});

app.post("/submit", (req,res)=>{
  const newSecret=req.body.secret;
  User.findById(req.user.id,(err,foundUser)=>{
    if (err){
      console.error(err);
    } else {
      if(foundUser){
        foundUser.secret= newSecret;
        foundUser.save((err)=>{
          if (!err){
            res.redirect("/secrets");
          } else if(err){
            console.error(err);
          }
        });
      }
    }
  });
});
app.post("/register",(req,res)=>{
  User.register({username: req.body.username}, req.body.password, (err, user)=>{
    if (err) {
      console.error(err);
      res.redirect("/register");
    } else {
      req.login(user,(err)=>{
        if (!err){
          res.redirect("/secrets");
        } else {console.error(err);}
      });
    }
  });
});
app.post('/login',
  passport.authenticate('local', { successRedirect: '/secrets',
                                   failureRedirect: '/login' }));
// app.post("/register",(req,res)=>{
//   generate a salt and hash. param=original data, salt rounds, call back
//   bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//     const newUser= new User({
//       email:req.body.username,
//       password:hash
//       password: md5(req.body.password)
//     });
//     newUser.save((err)=>{
//       if (err){
//         return console.error(err);
//       } else { res.render("secrets");}
//     });
// });
//   const newUser= new User({
//     email:req.body.username,
//     password: md5(req.body.password)
//   });
//
// });


// app.post("/login",(req,res)=>{
//   const username= req.body.username;
//   const password= md5(req.body.password);
//   const password = req.body.password;
//   User.findOne({email:username},(err, foundUser)=>{
//     if (err) {
//       console.err(err);
//     } else {if (foundUser){
//       compare input with database with bcrypt
//        params=input password, compare to, callback
//       bcrypt.compare(password, foundUser.password, function(err, result) {
//       if (result === true) {
//         res.render("secrets");
//       }
//   });
//
//       }
//     }
//   });
// });


app.listen(3000,()=>console.log("server is running"));
