//jshint esversion:6
require('dotenv').config();
const express = require("express");
const app= express();
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const encrypt = require("mongoose-encryption");
mongoose.connect('mongodb://localhost:27017/userDB', {useNewUrlParser: true, useUnifiedTopology: true});

// set ejs
app.set('view engine', 'ejs');
// set bodyParser
app.use(bodyParser.urlencoded({extended:false}));
app.use(express.static("public"));

const userSchema= new mongoose.Schema({
  email: String,
  password: String
});

const secret= process.env.SECRET;

userSchema.plugin(encrypt,{ secret: secret, encryptedFields:["password"]});
const User= new mongoose.model("User", userSchema);

app.get("/",(req,res)=>{
  res.render("home");
});

app.get("/login",(req,res)=>{
  res.render("login");
});

app.get("/register",(req,res)=>{
  res.render("register");
});

app.post("/register",(req,res)=>{
  const newUser= new User({
    email:req.body.username,
    password:req.body.password});
    newUser.save((err)=>{
      if (err){
        return console.error(err);
      } else { res.render("secrets");}
    });
});

app.post("/login",(req,res)=>{
  const username= req.body.username;
  const password= req.body.password;
  User.findOne({email:username},(err, foundUser)=>{
    if (err) {
      console.err(err);
    } else if (foundUser){
      if (foundUser.password === password) {
        res.render("secrets");
      }
    }
  });
});


app.listen(3000,()=>console.log("server is running"));
