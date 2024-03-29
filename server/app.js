const express = require('express');
const path = require('path');
const utils = require('./lib/hashUtils');
const partials = require('express-partials');
const bodyParser = require('body-parser');
const Auth = require('./middleware/auth');
const models = require('./models');
const parseCookies = require('./middleware/cookieParser');

const app = express();

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));


app.use(parseCookies);
app.use(Auth.createSession);

app.get('/signup', (req, res, next)=>{
  res.render('signup');
});
app.get('/', 
  (req, res) => {
    if (models.Sessions.isLoggedIn(req.session)) {
      res.render('index');
    } else {
      res.redirect('/login');
    }
    // check if logged in
    // if not redirect to login
    
  });

app.get('/create', 
  (req, res) => {
    if (models.Sessions.isLoggedIn(req.session)) {
      res.render('create');
    } else {
      res.redirect('/login');
    }
  });

app.get('/links', 
  (req, res, next) => {
    if (models.Sessions.isLoggedIn(req.session)) {
      models.Links.getAll()
        .then(links => {
          res.status(200).send(links);
        })
        .error(error => {
          res.status(500).send(error);
        });
    } else {
      res.redirect('/login');
    }
  });
  
app.post('/links', 
  (req, res, next) => {
    var url = req.body.url;
    if (!models.Links.isValidUrl(url)) {
      // send back a 404 if link is not valid
      return res.sendStatus(404);
    }
  
    return models.Links.get({ url })
      .then(link => {
        if (link) {
          throw link;
        }
        return models.Links.getUrlTitle(url);
      })
      .then(title => {
        return models.Links.create({
          url: url,
          title: title,
          baseUrl: req.headers.origin
        });
      })
      .then(results => {
        return models.Links.get({ id: results.insertId });
      })
      .then(link => {
        throw link;
      })
      .error(error => {
        res.status(500).send(error);
      })
      .catch(link => {
        res.status(200).send(link);
      });
  });

  
/************************************************************/
// Write your authentication routes here
/************************************************************/
app.get('/login', (req, res, next)=>{
  res.render('login');
});
app.post('/login', (req, res, next) => {
  models.Users.checkLogin(req.body).then((match)=>{
    if (match) {

      res.redirect('/');
    } else {
      res.redirect('/login');
    }
  });
});
app.post('/signup', (req, res, next)=> {
  // collect the data
  models.Users.checkUser(req.body)
    .then((result) => {
      if (!result) {
        models.Users.create(req.body);
        // get that user's id
        models.Users.get({username: req.body.username})
          .then((entry)=>{
            return models.Sessions.update({hash: req.session.hash}, {userId: entry.id}).then(()=>{
              res.redirect('/');
            });
          });
      } else {
        res.redirect('/signup');
      }
    });
  // enter into whatever creates users (which will hash)
  // on callback we can end and redirect to index
  
});

app.get('/logout', (req, res, next) => {
  models.Sessions.delete({hash: req.session.hash})
    .then(response => {
      delete req.cookies.shortlyid;
      return Auth.createSession(req, res, next);
    });
    
});
  


/************************************************************/
// Handle the code parameter route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/:code', (req, res, next) => {

  return models.Links.get({ code: req.params.code })
    .tap(link => {

      if (!link) {
        throw new Error('Link does not exist');
      }
      return models.Clicks.create({ linkId: link.id });
    })
    .tap(link => {
      return models.Links.update(link, { visits: link.visits + 1 });
    })
    .then(({ url }) => {
      res.redirect(url);
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(() => {
      res.redirect('/');
    });
});

module.exports = app;
