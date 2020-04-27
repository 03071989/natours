const path = require('path');

const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const globalErrorHandler = require('./controllers/errorController');
const AppError = require('./utils/appError');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewsRouter = require('./routes/viewsRoutes');

// Start express app //
const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views')); //path.join will help node create the correct path

//1) GLOBAL MIDDLEWARES

// Serving static files
// app.use(express.static(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, 'public')));

// Set security http headers
app.use(helmet()); //Should be one of the first middlewares in the middleware stack

//Development logging
console.log(process.env.NODE_ENV);
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests to API from same IP address
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'To many attempts from this IP address, please try again in an hour'
});
app.use('/api', limiter);

// Body parser, reading data from the body into req.body
app.use(express.json({ limit: '10kb' })); //limit the amount of data that can be parsed into the body
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization - Needs to be straight after body parser
// Data sanitization against NoSQL query injection
app.use(mongoSanitize()); //Removes any $ & . getting rid of any mongo operators

// Data sanitization against XSS (Cross site scripting)
app.use(xss()); //Cleans any user input from malicious html code

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      //search parameters you don't mind being duplicated during a query
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'duration',
      'difficulty',
      'price',
      'maxGroupSize'
    ]
  })
); // http parameter polution

app.use((req, res, next) => {
  console.log('Hello from the middleware');
  next();
});

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

//2) ROUTE HANDLERS

//TOURS

// //USERS

// app.get('/api/v1/tours', getAllTours);
// app.post('/api/v1/tours', createTour);
// app.get('/api/v1/tours/:id', getTourById);
// app.patch('/api/v1/tours/:id', tourUpdate);
// app.delete('/api/v1/tours/:id', deleteTour);

// 3) ROUTES

app.use('/', viewsRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on the server`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
