// import dependencies
const IBMCloudEnv = require('ibm-cloud-env');
IBMCloudEnv.init('/server/config/mappings.json');

// initialize Cloudant
const CloudantSDK = require('@cloudant/cloudant');
const cloudant = new CloudantSDK(IBMCloudEnv.getString('cloudant_url'));

// create patients-db database if it does not already exist
cloudant.db.create('exams-db')
  .then(data => {
    console.log('exams-db database created');
  })
  .catch(error => {
    if (error.error === 'file_exists') {
      console.log('exams-db database already exists');
    } else {
      console.log('Error occurred when creating exams-db database',
        error.error);
    }
  });
const exams_db = cloudant.db.use('exams-db');

// get exams from database
exports.getExams = (req, res, next) => {
  console.log('In route - getExams');
  return exams_db.list({include_docs: true})
    .then(fetchedExams => {
      let exams = [];
      let row = 0;
      fetchedExams.rows.forEach(fetchedExam => {
        exams[row] = {
          _id: fetchedExam.id,
        };
        row = row + 1;
      });
      console.log('Get exams successful. total_rows: ', fetchedExams.total_rows);
      return res.status(200).json(exams);
    })
    .catch(error => {
      console.log('Get exams failed');
      return res.status(500).json({
        message: 'Get exams failed.',
        error: error,
      });
    });
};


// find exam from database
exports.findExam = (req, res, next) => {
  /**
   * finds all exams for patient with specific EGN
   * @param search the EGN we are serching for
   * @param bookmark the bookmark parameter allows us to continue seeaching
   * from the place previous search has finished
   * @return JSON with all found patients
   */

  const q = {
    selector: {
      egn: {
        $eq: '',
      },
    },
    sort: [
    ],
    bookmark: null,
    limit: 5,
  };

  console.log('In route - findExam');
  console.log('search: ', req.query.search);
  console.log('bookmark: ', req.query.bookmark);

  if (req.query.search)
    q['selector']['egn'] = {$eq: req.query.search};

  if (req.query.bookmark)
    q['bookmark'] = req.query.bookmark;

  console.log('query: ', q);
  return exams_db.find(q)
    .then(fetchedExams => {
      let row = 0;
      fetchedExams.docs.forEach(exam => {
        row++;
      });
      console.log('find exams successful!\nbookmark: ', fetchedExams.bookmark);
      fetchedExams.count = row;
      fetchedExams.requested = q.limit;
      return res.status(200).json(fetchedExams);
    })
    .catch(error => {
      console.log('Find exams failed');
      q['bookmark'] = null;
      return res.status(500).json({
        message: 'Find exams failed.',
        error: error,
      });
    });
};

// add name to database
exports.addExam = (req, res, next) => {
  console.log('In route - addExam');
  let exam = {
    name: req.body.name,
    timestamp: req.body.timestamp,
  };
  return exams_db.insert(exam)
    .then(addedExam => {
      console.log('Add exam successful');
      return res.status(201).json({
        _id: addedExam.id,
        name: addedExam.name,
        timestamp: addedExam.timestamp,
      });
    })
    .catch(error => {
      console.log('Add exam failed');
      return res.status(500).json({
        message: 'Add exam failed.',
        error: error,
      });
    });
};
