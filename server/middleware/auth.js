const models = require('../models');
const Promise = require('bluebird');

module.exports.createSession = (req, res, next) => {
  req.session = {};
  res.cookies = {};
  if (req.cookies && req.cookies.shortlyid) {
    
    req.session.hash = req.cookies.shortlyid;
    models.Sessions.get({hash:req.session.hash})
      .then((session)=>{
        if (session) {
          console.log('sess: ', session);
          req.session = session;
          next();
        } else {
          models.Sessions.create().then((hash)=>{
            req.session.hash = hash;
            res.cookie('shortlyid', hash);
            next();
          });
        }
      });
  } else {
    models.Sessions.create().then((hash)=>{
      console.log('promise fufilled');
      req.session.hash = hash;
      res.cookie('shortlyid', hash);
      // res.cookies.shortlyid = {value:hash};
      next();
    });
  }
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/

