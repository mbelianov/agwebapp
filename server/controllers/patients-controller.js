// import dependencies
const IBMCloudEnv = require('ibm-cloud-env');
const ExamsController = require('./exams-controller');

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
  console.log('In route - getPatients');
  return patients_db.list({ include_docs: true })
    .then(fetchedNames => {
      let names = [];
      let row = 0;
      fetchedNames.rows.forEach(fetchedName => {
        names[row] = {
          _id: fetchedName.id,
          firstname: fetchedName.doc.firstname,
          secondname: fetchedName.doc.secondname,
          lastname: fetchedName.doc.lastname,
          timestamp: fetchedName.doc.timestamp,
        };
        row = row + 1;
      });
      console.log('Get patients successful. total_rows: ', fetchedNames.total_rows);
      return res.status(200).json(names);
    })
    .catch(error => {
      console.log('Get patients failed');
      return res.status(500).json({
        message: 'Get patients failed.',
        error: error,
      });
    });
};

// find patients from database
exports.findPatient = (req, res, next) => {
  /**
   * finds patient in DB by EGN
   * @param exact [true|false] - if true exact match is used. otherwise
   * the function return next 5 patients whose EGN is greater than search
   * parameter
   * @param search the EGN we are serching for
   * @param bookmark the bookmark parameter allows us to continue seeaching
   * from the place previous search has finished
   * @param pagesize defines how many items will be returned.
   * @return JSON with all found patients
   */

  const q = {
    selector: {
      _id: {
        $gte: '',
      },
    },
    sort: [
      {
        timestamp: 'asc',
      },
    ],
    bookmark: null,
    limit: 5,
  };

  console.log('In route - findPatients');
  console.log('search: ', req.query.search);
  console.log('bookmark: ', req.query.bookmark);

  if (req.query.exact === 'true')
    q['selector']['_id'] = { $eq: req.query.search };
  else
  if (req.query.search)
    q['selector']['_id'] = { $gte: req.query.search };

  if (req.query.bookmark)
    q['bookmark'] = req.query.bookmark;

  if (req.query.pagesize)
    q['limit'] = parseInt(req.query.pagesize, 10);

  console.log('query: ', q);
  return patients_db.find(q)
    .then(fetchedNames => {
      let row = 0;
      fetchedNames.docs.forEach(doc => {
        row++;
      });
      console.log('find patients successful!\nbookmark: ', fetchedNames.bookmark);
      fetchedNames.count = row;
      fetchedNames.requested = q.limit;
      return res.status(200).json(fetchedNames);
    })
    .catch(error => {
      console.log('Find patients failed');
      q['bookmark'] = null;
      return res.status(500).json({
        message: 'Find patients failed.',
        error: error,
      });
    });
};

// add name to database
/**
   * add or update patient personal data in the database
   *
   * @body JSON object with patient personal data
   * @return JSON with detailes from the db.insert operation
   */
exports.addPatient = async(req, res, next) => {
  console.log('In route - addPatient');

  let name = {...req.body, timestamp: new Date().toISOString()};

  // return res.status(201).json({name});

  console.log('check if patient already exist');
  const found = await patients_db.get(req.body._id, {revs_info: true })
    .catch(error => {
      console.log('error, may be does not exist: ', error); // just log the error
    });

  if (found){
    console.log('found: ', found);
    name = {...name, _rev: found._rev};
  }

  console.log('add/update: ', name);
  return patients_db.insert(name)
    .then(addedName => {
      console.log('Add/update patient successful');
      console.log(addedName);
      return res.status(201).json({addedName});
    })
    .catch(error => {
      console.log('Add/update patient failed with following error: ', error);
      return res.status(500).json({
        message: 'Add/update patient failed.',
        error: error,
      });
    });

};


exports.deletePatient = (req, res, next) => {
  /**
   * deletes the patent document from the db. also deletes all associated exams
   * @param id the _id of the pattient document
   * @return JSON with detailes from the delete operation
   */

  console.log('In route - deletePatients');
  if (req.query.id == null) {
    console.log('patient id not specified. Nothing to delete.');
    return res.status(200).json({
      message: 'patient id not specified. Nothing to delete.',
    });
  }
  patients_db.get(req.query.id, { revs_info: true })
    .then(async(doc) => {
      console.log(doc._id, doc._rev, doc.egn);
      const exams = await ExamsController.getPatientExamsAll(doc.egn);
      console.log('Found these exams: ', exams);
      exams.forEach(exam => {
        ExamsController.deletePatientExam(exam);
      });

      console.log('trying to delete patient', doc);
      patients_db.destroy(doc._id, doc._rev)
        .then(response => {
          console.log('success deleting patient: ', doc);
          return (res.status(200).json(doc));

        })
        .catch(error => {
          console.log('error occured: ', error.error);
          return res.status(200).json({
            message: 'Error occured.',
            error: error,
          });
        });
    })
    .catch(error => {
      if (error.message === 'missing') {
        console.log('Patient not found. Nothing to delete.');
        return res.status(200).json({message: 'Patient not found. Nothing to delete.'});
      }
      if (error.message === 'deleted') {
        console.log('Patient already deleted.');
        return res.status(200).json({message: 'Patient already deleted.'});
      } else {
        console.log('Error occured:', error);
        return res.status(200).json({
          message: 'Error occured.',
          error: error,
        });
      }
    });
};
