// import dependencies and initialize the express router
const express = require('express');
const BodimedController = require('../controllers/bodimed-controller');

const router = express.Router();

// define routes
router.get('/getPatients', BodimedController.getPatients);

module.exports = router;
