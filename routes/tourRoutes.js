const express = require('express');

//Best method of importing controllers, but will need to include variable to route for it too work.
//For example --> .get(tourController.getTourById)
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');
// const reviewController = require('../controllers/reviewController');
const reviewRouter = require('./reviewRoutes');

//Can also use ES6 destructuring for importing the variables. This method will remove the need to include the variable in the route.
//For example -->.get(getAllTours)<--
//const {getAllTours, createTour, getTourById, updateTour, deleteTour} = require('./../controllers/tourController');

const router = express.Router();

// router.param('id', tourController.checkId);
// const checkBody = router.param('name', tourController.checkBody);
// POST tour/23f49d/review
// GET tour/23f49d/review
// GET tour/23f49d/review/23f32a

// router
//   .route('/:tourId/reviews')
//   .post(
//     authController.protect,
//     authController.restrictTo('user'),
//     reviewController.createReview
//   );
router.use('/:tourId/reviews', reviewRouter);

router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan
  );

router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin);
// /tours-within?distance=233&center=-40,45&unit=mi (Query string, doesnt look great)
// /tours-within/233/center/-40,45/unit/mi (Options in a route is better)

router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour
  );

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  );

module.exports = router;
