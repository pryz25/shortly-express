const parseCookies = (req, res, next) => {
  // req has 0 or more cookies
  var cookieSplit;
  var noSemi;
  var cookieTuple;
  if (!req.headers.cookie) {
    req.cookies = {};
  } else {
    cookieSplit = req.headers.cookie.split(' ');
    cookieSplit.forEach((val) =>{
      noSemi = val.split(';')[0];
      cookieTuple = noSemi.split('=');
      req.cookies[cookieTuple[0]] = cookieTuple[1];
    });
  }
  next();
};

module.exports = parseCookies;