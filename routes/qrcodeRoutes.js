const express = require('express')
const router = express.Router()
const protect = require('../controllers/authController/protect')
const restrictTo = require('../utils/restrictTo')
const qrcodes = require('../controllers/qrcodeController')

router.use(protect)
router.get(
    '/sessions/:id',
    restrictTo('admin', 'manager'),
    qrcodes.generateSession
)

router.use(restrictTo('admin', 'manager'))

module.exports = router
