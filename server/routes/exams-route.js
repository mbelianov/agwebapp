// import dependencies and initialize the express router
const express = require('express');
const { body, validationResult } = require('express-validator');
const ExamsController = require('../controllers/exams-controller');

const router = express.Router();

// standardized validation error response
const validate = validations => {
  return async(req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({ errors: errors.array() });
  };
};

// define routes
router.get('/list', ExamsController.getExams);
router.get('/find', ExamsController.findExam);
router.post('/add', validate([
  body('patient.patientEGN').isNumeric({no_symbols: true}),
  body('timestamp').not().isEmpty(),
  body('examId').not().isEmpty(),
]), ExamsController.addExam);

module.exports = router;
