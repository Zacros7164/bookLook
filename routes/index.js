var express = require('express');
var router = express.Router();
const config = require('../config');
const bcrypt = require('bcrypt-nodejs');
const expressSession = require('express-session');
const sessionOptions = config.sessionSecret;
router.use(expressSession(sessionOptions))
const mysql = require('mysql');
let connection = mysql.createConnection(config.db);
connection.connect()
let loggedIn = false;


router.use('*',(req, res, next)=>{
  // console.log("Middleware is working!");
  if(loggedIn){
      // res.locals is the variable that gets sent to the view
      res.locals.id = req.session.uid;
      res.locals.email = req.session.email;
      res.locals.loggedIn = true;
  }else{
      res.locals.id = "";
      res.locals.email = "";
      res.locals.loggedIn = false;
      loggedIn = false;
  }
  next();
});


router.get('/',(req, res, next)=>{
  let msg;
  if(req.query.msg == 'regSuccess'){
    msg = 'You have successfully registered.';
  }else if (req.query.msg == 'loginSuccess'){
    msg = 'You have successfully logged in.';
  }else if (req.query.msg == 'logoutSuccess'){
    msg = 'You have sucessfully logged out.'
  }else if (req.query.msg == 'logoutFail'){
    msg = 'You have not logged in yet.'
  }else if (req.query.msg == 'badPass'){
    msg = 'You entered an incorrect password.'
  }else if (req.query.msg == 'reviewSuccess'){
    msg = 'Thank you for your review!'
  }else if (req.query.msg == 'reviewFail'){
    msg = 'Hmmm, your review did not go through...'
  }
res.render('index', {msg});
});

router.get('/home',(req,res)=>{
  res.redirect('/');
});

router.get('/register',(req, res)=>{
  let msg;
  if(req.query.msg == 'register'){
    msg = 'This email adress is already registered.';
  }
  res.render('register',{msg})
});

router.post('/registerProcess',(req, res, next)=>{
  console.log(req.body);
  const hashedPass = bcrypt.hashSync(req.body.password);
  const checkUserQuery = `SELECT * FROM users WHERE email = ?`;
  connection.query(checkUserQuery,[req.body.email],(err,results)=>{
    if(err)throw err;
    if(results.length != 0){
      res.redirect('/register?msg=register');
    }else{
      const insertUserQuery = `INSERT INTO users (user_ID,email,password)
      VALUES
    (default,?,?);`;
      connection.query(insertUserQuery,[req.body.email, hashedPass],(err2, results2)=>{
      if(err2){throw err2;}
      res.redirect('/?msg=regSuccess');
      loggedIn = true;
      });
    };
  });
});


router.get('/review',(req, res)=>{
  let msg;
  let genresArray = [
    'Action',
    'Comedy',
    'Romance',
    'Biography',
    'Childrens',
    'Fantasy',
    'Mystery',
    'Self Help',
    'Adventure',
    'Business'
  ];
  msg = "Write a review!";
  res.render('review',{msg, genresArray});
})


router.post('/reviewProcess', (req,res,next)=>{
  const title = req.body.title;
  const author = req.body.author;
  const isbn = req.body.isbn;
  const rating = req.body.reviewRadios;
  const checkIsbnQuery = `SELECT * FROM books WHERE ISBN = ?`;
  const insertReviewQuery = `INSERT INTO ratings (User_ID,Book_Rating,ISBN)
      VALUES
      (default,?,?);`;
  
  connection.query(checkIsbnQuery,[isbn],(err,results)=>{
    if(err)throw err;
    if(results.length == 0 ){
      const insertIsbnQuery = `INSERT INTO books (Book_Title,Book_Author,ISBN)
      VALUES
      (?,?,?);`;
      connection.query(insertIsbnQuery,[title,author,isbn],(err2, results2)=>{
        if(err2){throw err2};
      })
      connection.query(insertReviewQuery,[rating,isbn],(err3, results3)=>{
        if(err3){throw err3};
      })
    }else{
      const insertDuplicateBookQuery = `INSERT INTO duplicate_books (ISBN,Book_Title,Book_Author)
        VALUES
        (?,?,?);`;
      connection.query(insertDuplicateBookQuery,[isbn,title,author],(err4, results4)=>{
        if(err4){throw err4};
      })
      connection.query(insertReviewQuery,[rating,isbn],(err5, results5)=>{
        if(err5){throw err5};
      })
    }
    res.redirect('/?msg=reviewSuccess');
  })
})


router.get('/login', (req, res, next)=>{
  let msg;
  if(req.query.msg == 'noUser'){
    msg = '<h2 class="text-danger">This email is not registered in our system. Please try another email or register.</h2>'
  }else if(req.query.msg == 'badPass'){
    msg = '<h2 class="text-warning">This password is not associated with this email. Please enter again</h2>'
  }
res.render('login',{msg});
});

router.post('/loginProcess',(req, res, next)=>{
  const email = req.body.email;
  const password = req.body.password;
  const checkPasswordQuery = `select * from users where email = ?`;
  connection.query(checkPasswordQuery,[email],(err, results)=>{
    if(err)throw err;
    if(results.length == 0 ){
      res.redirect('/login?msg=noUser');
    }else{
      const passwordsMatch = bcrypt.compareSync(password,results[0].password);
      if(!passwordsMatch){
        res.redirect('/login?msg=badPass');
      }else{
        req.session.email = results[0].email;
        req.session.uid = results[0].User_ID;
        req.session.loggedIn = true;
        loggedIn = true;
        res.redirect('/?msg=loginSuccess');
      }
    }
  })
});


router.get('/logout',(req, res, next)=>{
  if (!loggedIn){
    res.redirect('/?msg=logoutFail')
  }
  req.session.destroy();
  loggedIn = false;
  res.redirect('/?msg=logoutSuccess')
});

module.exports = router;
