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

    res.status(400).json({ errors: errors.array() });
  };
};

// define routes
router.get('/list', PatientsController.getPatients);
router.get('/find', PatientsController.findPatient);
router.post('', validate([
  body('name').isAlphanumeric(),
  body('timestamp').isISO8601(),
]), PatientsController.addPatient);

module.exports = router;
