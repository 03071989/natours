const express = require('express');

//Best method of importing controllers, but will need to include variable to route for it too work.
//For example --> .get(userController.getUserById)
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

//Can also use ES6 destructuring for importing the variables. This method will remove the need to include the variable in the route.
//For example -->.get(getAllUsers)<--
//const {getAllUsers, createUser, getUserById, updateUser, deleteUser} = require('./../controllers/userController');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// Protect all routes after this middleware
router.use(authController.protect); // Protect has been removed from original routes as the middleware is run before each of the following routes

router.patch('/updateMyPassword', authController.updatePassword);
router.get('/me', userController.getMe, userController.getUser);

router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);
router.delete('/deleteMe', userController.deleteMe);

router.use(authController.restrictTo('admin'));

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
