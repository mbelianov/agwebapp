// import dependencies and initialize express
const express = require('express');
// const log4js = require('log4js');
const session = require('express-session');                       // https://www.npmjs.com/package/express-session
const passport = require('passport');                              // https://www.npmjs.com/package/passport
const WebAppStrategy = require('ibmcloud-appid').WebAppStrategy;  // https://www.npmjs.com/package/ibmcloud-appid
const path = require('path');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const nameRoutes = require('./routes/names-route.js');
const healthRoutes = require('./routes/health-route.js');
const patientsRoutes = require('./routes/patients-route.js');

// import dependencies
const IBMCloudEnv = require('ibm-cloud-env');
IBMCloudEnv.init('/server/config/mappings.json');

// define tcp port for nodejs
const port = process.env.PORT || 3000;

// define callback path
const callbackPath = '/callback';

const app = express();
// const logger = log4js.getLogger("my-sample-app");
app.use(session({
  secret: '123456',
  resave: true,
  saveUninitialized: true,
}));
app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser((user, cb) => cb(null, user));
passport.deserializeUser((user, cb) => cb(null, user));
passport.use(new WebAppStrategy({
  tenantId: IBMCloudEnv.getString('appid_tenantId'),              // 'a9d99b22-502c-4d9d-bbeb-41fd76bbc4ba',
  clientId: IBMCloudEnv.getString('appid_clientId'),              // 'cbf8993b-8cb8-47c6-a8ba-bb74ff6d7942',
  secret: IBMCloudEnv.getString('appid_secret'),
  oauthServerUrl: IBMCloudEnv.getString('appid_oauthServerUrl'),          // 'https://eu-de.appid.cloud.ibm.com/oauth/v4/a9d99b22-502c-4d9d-bbeb-41fd76bbc4ba',
  redirectUri: 'http://' + IBMCloudEnv.getString('app_uri') + callbackPath,   // 'http://localhost:3000/callback',
}));

// enable parsing of http request body
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// if production, enable helmet (improves security in production environment)
/* istanbul ignore if  */
if (process.env.VCAP_APPLICATION) {
  app.use(helmet());
  console.log(JSON.parse(process.env.VCAP_APPLICATION));
}

// handle callback
app.get('/callback', passport.authenticate(WebAppStrategy.STRATEGY_NAME));

// handle logout
app.get('/logout', function(req, res){
  WebAppStrategy.logout(req);
  res.redirect('/ui');
});

// protect the whole app
// app.use(passport.authenticate(WebAppStrategy.STRATEGY_NAME));

// protect anything below /ui and below /api
app.use('/ui', passport.authenticate(WebAppStrategy.STRATEGY_NAME));
// app.use('/api', passport.authenticate(WebAppStrategy.STRATEGY_NAME));

// access to static files
app.use('/ui', express.static(path.join('public')));
app.use('/public', express.static(path.join('public2')));     // public will remain open for public access
app.use('/react', express.static(path.join('react-build')));   // react index.html
app.use('/static', express.static(path.join('react-build/static')));

// routes and api calls
app.use('/health', healthRoutes);
app.use('/api/names', nameRoutes);
app.use('/api/patients', patientsRoutes);

// start node server
app.listen(port, () => {
  console.log(`App UI available http://localhost:${port}/ui`);
});

// error handler for unmatched routes or api calls
app.use((req, res, next) => {
  res.sendFile(path.join(__dirname, '../public', '404.html'));
});

module.exports = app;
