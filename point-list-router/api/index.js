
var express = require('express'),
router = express.Router();

router.use('/add', require("./add"));
router.use('/list', require("./list"));

module.exports = router;