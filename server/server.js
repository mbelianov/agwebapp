// import dependencies and initialize express
const express = require('express');
const cors = require('cors');
const session = require('express-session');                       // https://www.npmjs.com/package/express-session
const passport = require('passport');                              // https://www.npmjs.com/package/passport
const WebAppStrategy = require('ibmcloud-appid').WebAppStrategy;  // https://www.npmjs.com/package/ibmcloud-appid
const APIStrategy = require("ibmcloud-appid").APIStrategy;
const path = require('path');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const healthRoutes = require('./routes/health-route.js');
const patientsRoutes = require('./routes/patients-route.js');
const examsRoutes = require('./routes/exams-route.js');
const bodimedRoutes = require('./routes/bodimed-route.js');

// import dependencies
const IBMCloudEnv = require('ibm-cloud-env');
IBMCloudEnv.init('/server/config/mappings.json');

// define tcp port for nodejs
const port = process.env.PORT || 3000;

// define callback path
const callbackPath = IBMCloudEnv.getString('callback_path');

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
  tenantId: IBMCloudEnv.getString('appid_tenantId'),              
  clientId: IBMCloudEnv.getString('appid_clientId'),              
  secret: IBMCloudEnv.getString('appid_secret'),
  oauthServerUrl: IBMCloudEnv.getString('appid_oauthServerUrl'),          
  redirectUri: 'http://' + IBMCloudEnv.getString('app_uri') + callbackPath,   // 'http://localhost:3000/callback',
}));

passport.use(new APIStrategy({
  oauthServerUrl: IBMCloudEnv.getString('appid_oauthServerUrl')
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
app.get(callbackPath, passport.authenticate(WebAppStrategy.STRATEGY_NAME));

// handle logout
app.get('/logout', function(req, res){
  WebAppStrategy.logout(req);
  res.redirect('/ui');
});

// allow CORS from anywhere
// TODO: potential security concern. rplace '*' with the URL where you the UI is hosted
app.options('*', cors());
app.use(cors());

// protect the whole app
// app.use(passport.authenticate(WebAppStrategy.STRATEGY_NAME));

// protect anything below /ui and below /api
//app.use('/login', passport.authenticate(WebAppStrategy.STRATEGY_NAME));
//app.use('/ui', passport.authenticate(WebAppStrategy.STRATEGY_NAME));
app.use('/api', passport.authenticate(WebAppStrategy.STRATEGY_NAME));
app.use('/tokens', passport.authenticate(WebAppStrategy.STRATEGY_NAME));
app.use('/api-v2', passport.authenticate(APIStrategy.STRATEGY_NAME, {session: false}));




// access to static files
app.use('/ui', express.static(path.join('react-build')));
app.use('/public', express.static(path.join('public2')));     // public will remain open for public access
app.use('/static', express.static(path.join('react-build/static')));

// routes and api calls
app.use('/health', healthRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/exams', examsRoutes);
app.use('/api-v2/patients', patientsRoutes);
app.use('/api-v2/exams', examsRoutes);
app.use('/bodimed', bodimedRoutes);
app.use('/tokens', (req, res)=>{
  res.json(req.session.APPID_AUTH_CONTEXT);
});

app.get('/api-v2/whoami',
  (req, res)=>{
    var username = req.user.name || "Anonymous";
    res.send("Hello from protected resource " + username);
  }
);

// start node server
app.listen(port, () => {
  console.log(`App UI available http://localhost:${port}/ui`);
});

// error handler for unmatched routes or api calls
app.use((req, res, next) => {
  res.sendFile(path.join(__dirname, '../public', '404.html'));
});

module.exports = app;
