const AppError = require('./../errors/AppError')
const { StatusCodes } = require('http-status-codes')

const handleCastErrorDB = (err) => {
    const message = `Invalid ${err.path}: ${err.value}`
    return new AppError(message, StatusCodes.BAD_REQUEST)
}

const handleDuplicateFieldsDB = (err) => {
    const message = `Duplicate field value: ${JSON.stringify(
        err.keyValue
    )}. Please use another value`
    return new AppError(message, StatusCodes.BAD_REQUEST)
}

const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map((el) => el.message)

    const message = `Invalid input data. ${errors.join('. ')}`
    return new AppError(message, StatusCodes.BAD_REQUEST)
}

const handleJWTError = () =>
    new AppError(
        'Invalid token! Please log in again.',
        StatusCodes.UNAUTHORIZED
    )

const handleJWTExpiredError = () =>
    new AppError(
        'Your token has expired! please log in again.',
        StatusCodes.UNAUTHORIZED
    )

const handleFileTooLarge = () =>
    new AppError(
        'Image is too large, it must be less than 2MB',
        StatusCodes.BAD_REQUEST
    )

const sendErrorDev = (err, req, res) => {
    // Api
    return res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack,
    })
}

const sendErrorProd = (err, req, res) => {
    // API
    if (req.originalUrl.startsWith('/api')) {
        // Operational, trusted error: send message to the client
        if (err.isOperational) {
            return res.status(err.statusCode).json({
                status: err.status,
                message: err.message,
            })
            // Programming or other unknown error: don't leak error details
        }

        // 1) Log the error to the console
        console.error('Error', err)

        // 2) Send generic message
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: 'error',
            message: 'Something went very wrong!',
        })
    }
}

module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
    err.status = err.status || 'error'
    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, req, res)
    } else if (process.env.NODE_ENV === 'production') {
        let error = { ...err }
        error.message = err.message
        if (error.kind === 'ObjectId') error = handleCastErrorDB(error)
        if (error.code === 11000) error = handleDuplicateFieldsDB(error)
        if (error.message.toLocaleLowerCase().includes('validation failed'))
            error = handleValidationErrorDB(error)
        if (error.name === 'JsonWebTokenError') error = handleJWTError()
        if (error.name === 'TokenExpiredError') error = handleJWTExpiredError()
        if (error.name === 'MulterError' && error.message.includes('too large'))
            error = handleFileTooLarge()
        sendErrorProd(error, req, res)
    }
}
