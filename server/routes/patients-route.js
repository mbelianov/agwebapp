// import dependencies and initialize the express router
const express = require('express');
const { body, validationResult } = require('express-validator');
const PatientsController = require('../controllers/patients-controller');

const router = express.Router();

// standardized validation error response
const validate = validations => {

  return async(req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }
    console.log('validation_errors: ', errors.array());
    res.status(400).json({ validation_errors: errors.array() });
  };
};

// define routes
router.get('/list', PatientsController.getPatients);
router.get('/find', PatientsController.findPatient);
router.get('/delete', PatientsController.deletePatient);
router.post('/add', validate([
  body('firstname').isAlpha('bg-BG'),
  body('secondname').isAlpha('bg-BG'),
  body('lastname').isAlpha('bg-BG'),
  body('egn').isNumeric({no_symbols: true}),
  body('email').isEmail(),
  body('telephone').isMobilePhone(),
  // body('timestamp').isISO8601(),
]), PatientsController.addPatient);

module.exports = router;
