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
  return exams_db.list({ include_docs: true })
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
      'patient.patientEGN': {$eq: ''},
    },
    sort: [{timestamp: 'desc'}],
    bookmark: null,
    limit: 5,
  };

  console.log('In route - findExam');
  console.log('search: ', req.query.search);

  if (req.query.search)
    q['selector']['patient.patientEGN'] = { $eq: req.query.search };


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

// add exam to database
exports.addExam = async(req, res, next) => {

  console.log('In route - addExam');

  console.log('check if exam exist');
  let newExam = req.body;
  let examToUpdate;

  const q = {
    selector: {
      $and: [
        { 'patient.patientEGN': {$eq: newExam.patient.patientEGN}},
        { examId: {$eq: newExam.examId}},
        { timestamp: {$eq: newExam.timestamp}},
      ],
    },
    limit: 2,
  };

  try {
    const response = await exams_db.find(q);
    if (response.docs.length === 2){
      console.warn('Exam table is inconsistent.');
      console.warn('There are 2 or more exams with same {examId, patientEGN and timestamp}: ',
        newExam.examId, newExam.patient.patientEGN, newExam.timestamp);
    }
    if (response.docs[0])
      examToUpdate = response.docs[0];

  } catch (e){
    console.log('error. will try to recover: ', e);
  }
  if (examToUpdate) {
    console.log('will update existing exam: ', examToUpdate);
    newExam._id = examToUpdate._id;
    newExam._rev = examToUpdate._rev;
  }

  return exams_db.insert(newExam)
    .then(addedExam => {
      console.log('Add exam successful: ', addedExam);
      return res.status(201).json({...addedExam});
    })
    .catch(error => {
      console.log('Add exam failed: ', error);
      return res.status(500).json({
        message: 'Add exam failed.',
        error: error,
      });
    });
};


exports.getPatientExamsAll = async(patientEgn) => {

  const q = {
    selector: {
      egn: { $eq: patientEgn },
    },
    bookmark: null,
    fields: ['_id', '_rev'],
    limit: 1,
  };

  console.log('In function - getPatientExamsAll');

  let exams = [];
  let count = 0;

  try {
    do {
      const fetchedExams = await exams_db.find(q);
      count = 0;
      fetchedExams.docs.forEach(exam => {
        exams.push(exam);
        count++;
      });
      q.bookmark = fetchedExams.bookmark;
    } while (count === q.limit);

  } catch (error) {
    console.log('getPatientExamsAll failed. unable for fetch all exams.', error.error);
  };

  return exams;
};

exports.deletePatientExam = (exam) => {

  console.log('trying to delete exam: ', exam);
  // const response = await exams_db.destroy(exam._id, exam._rev);
  exams_db.destroy(exam._id, exam._rev)
    .then(response => {
      console.log('success deleting exam: ', exam);
      return (0);

    })
    .catch(error => {
      console.log('error occured: ', error.error);
      return (error.error);

    });
};
