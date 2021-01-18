// import dependencies
const IBMCloudEnv = require('ibm-cloud-env');
IBMCloudEnv.init('/server/config/mappings.json');

// initialize Cloudant
const CloudantSDK = require('@cloudant/cloudant');
const cloudant = new CloudantSDK(IBMCloudEnv.getString('cloudant_url'));

// create patients-db database if it does not already exist
cloudant.db.create('patients-db')
  .then(data => {
    console.log('patients-db database created');
  })
  .catch(error => {
    if (error.error === 'file_exists') {
      console.log('patients-db database already exists');
    } else {
      console.log('Error occurred when creating patients-db database',
        error.error);
    }
  });
const patients_db = cloudant.db.use('patients-db');

// get names from database
exports.getPatients = (req, res, next) => {
  console.log('In route - getNames');
  return patients_db.list({include_docs: true})
    .then(fetchedNames => {
      let names = [];
      let row = 0;
      fetchedNames.rows.forEach(fetchedName => {
        names[row] = {
          _id: fetchedName.id,
          name: fetchedName.doc.name,
          timestamp: fetchedName.doc.timestamp,
        };
        row = row + 1;
      });
      console.log('Get names successful');
      return res.status(200).json(names);
    })
    .catch(error => {
      console.log('Get names failed');
      return res.status(500).json({
        message: 'Get names failed.',
        error: error,
      });
    });
};

// add name to database
exports.addPatient = (req, res, next) => {
  console.log('In route - addName');
  let name = {
    name: req.body.name,
    timestamp: req.body.timestamp,
  };
  return patients_db.insert(name)
    .then(addedName => {
      console.log('Add name successful');
      return res.status(201).json({
        _id: addedName.id,
        name: addedName.name,
        timestamp: addedName.timestamp,
      });
    })
    .catch(error => {
      console.log('Add name failed');
      return res.status(500).json({
        message: 'Add name failed.',
        error: error,
      });
    });
};
