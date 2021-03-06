// app/routes.js
module.exports = function(app, passport) {
	var q = require('q');
	var models = require('./models');
	app.get('/', function(req, res) {
    res.render('index');
  });

  app.post('/location/:id/:length/:geofence', function(req, res) {
		console.log(req.user);
		models.LineVotes.create({
      line_length: req.body.line_length,
      user_id: req.user.dataValues.email,
      location_id: req.params.id
    });
  });

  app.get('/location/:id/:length/:geofence', function(req, res) {
    models.Locations.findAll({
      where: {
        id: req.params.id
      }
    })
    .then(function(data){
			if (req.params.length == "0") {
				  data[0].dataValues.line_length = "Insufficient Data";
			}
			else if (req.params.length == "1") {
				data[0].dataValues.line_length = "Short";
			}
			else if (req.params.length == "2") {
				data[0].dataValues.line_length = "Medium";
			}
			else if (req.params.length == "3") {
				data[0].dataValues.line_length = "Long";
			}
      data[0].dataValues.inGeofence = (req.params.geofence === 'true');
      var loc = {
        location: data[0].dataValues
      };
      res.render('indlocation', loc);
    });
  });

  app.get('/locations', function(req, res) {
    var locFinal = [];
    models.Locations.findAll()
      .then(function(data) {
        var currTime = new Date();
        currTime.setHours(currTime.getHours() - 1);
        for (i = 0; i < data.length; i++) {
          locFinal.push(grabVotes(data[i].dataValues, currTime));
        }
        q.all(locFinal).then(function(locations) {
          res.json(locations);
        });
      });

    var grabVotes = function(location, date) {
      return models.LineVotes.findAll({
        where: {
          location_id: location.id,
          createdAt:{
            $gte: date
          }
        }
      }).then(function(votes) {
        var sum = 0;
        for (j = 0; j < votes.length; j++) {
          sum += votes[j].line_length;
        }
        location.line_length = Math.round(sum / votes.length);
        console.log(location);
        return location;
      });
    };
  });

  // new stuff from master is above this line

  // process the login form
	app.post('/login', passport.authenticate('local-login', {
			successRedirect: 'back',
			failureRedirect: '/', // redirect back to the homepage if there is an error
      failureFlash: true // allow flash messages
    }),
    function(req, res) {
      console.log("hello");
      if (req.body.remember) {
        req.session.cookie.maxAge = 1000 * 60 * 3;
      } else {
        req.session.cookie.expires = false;
      }
      res.redirect('back');
    });

  // process the signup form
  app.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/profile', // redirect to the secure profile section
    failureRedirect: '/', // redirect back to the signup page if there is an error
    failureFlash: true // allow flash messages
  }));

  // PROFILE SECTION =========================
  // we will want this protected so you have to be logged in to visit
  // we will use route middleware to verify this (the isLoggedIn function)
  app.get('/profile', isLoggedIn, function(req, res) {
    res.render('profile', {
      user: req.user // get the user out of session and pass to template
    });
  });

  // LOGOUT ==============================
  app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
  });
};

// route middleware to make sure
function isLoggedIn(req, res, next) {

  // if user is authenticated in the session, carry on
  if (req.isAuthenticated())
    return next();

  // if they aren't redirect them to the home page
  res.redirect('/');
}
