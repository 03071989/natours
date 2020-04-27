const multer = require('multer');
const sharp = require('sharp');
const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image, please upload images only!!', 400), false);
  }
};
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

// For uploading files to multiple fields (req.files)
exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);
//upload.single('image'); req.file
//upload.array('images', 5); req.files

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  console.log(req.files);

  if (!req.files.imageCover || !req.files.images) return next();

  // 1) Cover image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 2) Images
  req.body.images = [];

  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
    })
  );
  next();
});

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getAllTours = factory.getAll(Tour);

exports.getTour = factory.getOne(Tour, { path: 'reviews' });
//const id = req.params.id * 1; //Neat trick to convert a number with a string into a number

// const tour = tours.find(el => el.id === id);

// res.status(200).json({
//   status: 'success',
//   data: {
//     tours: tour
//   }
// });

exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour); // Call the handlerFactory controller and deleteOne function, then specify the Model

// exports.deleteTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndDelete(req.params.id);

//   if (!tour) {
//     return next(new AppError('Cannot find a tour with that ID'));
//   }

//   res.status(204).json({
//     status: 'success',
//     message: 'Tour deleted',
//     data: null
//   });
// });
// res.status(204).json({
//   status: 'success',
//   data: null

exports.createTour = factory.createOne(Tour);

//One method of creating and saving a new tour
// const newTour = new Tour({});
// newTour.save();

//   try {
//     const newTour = await Tour.create(req.body);

//     res.status(201).json({
//       status: 'success',
//       data: {
//         tour: newTour
//       }
//     });
//   } catch (err) {
//     res.status(404).json({
//       status: 'fail',
//       message: err
//     });
//   }
// });

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRatings: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },
    {
      $sort: { avgPrice: 1 }
    }
    // {
    //   $match: { _id: { $ne: 'EASY' } }
    // }
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates'
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' } //use $push when there are multiple instances to create an array
      }
    },
    {
      $addFields: { month: '$_id' }
    },
    {
      $project: {
        _id: 0
      }
    },
    {
      $sort: { numTourStarts: -1 }
    }
    // {
    //   $limit: 3 // Alter the number of searches provided
    // }
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      plan
    }
  });
});

// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/-40,45/unit/mi (Options in a route is better)
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params; // Use destructuring to get the variables that are needed
  const [lat, lng] = latlng.split(',');
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    return next(
      new AppError(
        'Please provide latitude and longitude in the format of lat, lng',
        400
      )
    );
  }
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } } //mongo db stores lat, lng the other was round to mongoose
  });
  res.status(200).json({
    status: 'success',
    result: tours.length,
    data: {
      data: tours
    }
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params; // Use destructuring to get the variables that are needed
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    return next(
      new AppError(
        'Please provide latitude and longitude in the format of lat, lng',
        400
      )
    );
  }
  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1] //*1 to convert to a number
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier
      }
    },
    {
      $project: {
        //project for the fields you want to display
        distance: 1, // 1 if you want the field to be visable
        name: 1
      }
    }
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      data: distances
    }
  });
});

//1a) Filtering
//BUILD QUERY
//Trick using destructuring to exclude special field names from the query string
//...{req.query} the three dots will take all fields out of the object, curly braces creates a new object
// const queryObj = { ...req.query };
// const excludedfields = ['page', 'sort', 'limit', 'fields'];
// excludedfields.forEach(el => delete queryObj[el]);

// // console.log(req.query, queryObj);
// // console.log('im in the middle');

// //1b) Advanced filtering

// // { difficulty: 'easy', duration: { $gte: 5 } };
// // { difficulty: 'easy', duration: { gte: 5 } };
// // gte, gt, lte, lt

// let queryStr = JSON.stringify(queryObj);
// queryStr = queryStr.replace(/\b(gte|gt|lt|lte)\b/g, match => `$${match}`);
// console.log(JSON.parse(queryStr));

// //To implement query in URL
// let query = Tour.find(JSON.parse(queryStr));

//2) Sorting

// if (req.query.sort) {
//   const sortBy = req.query.sort.split(',').join(' ');
//   console.log(sortBy);
//   query = query.sort(sortBy);
// } else {
//   query = query.sort('-createdAt'); //Set the default method of ordering database, in this case created date, newest.
// }

//3) Field Limiting

// if (req.query.fields) {
//   const fields = req.query.fields.split(',').join(' ');
//   console.log(fields);
//   query = query.select(fields); //This is to only select and display the fields in the URL query string
// } else {
//   query = query.select('-__v'); //to remove a field from the search, in this case version number
// }

//4) Pagination

// const page = req.query.page * 1 || 1; //Use trick to turn a string into a number // || 1 - is used to set page 1 as the default
// const limit = req.query.limit * 1 || 100;
// const skip = (page - 1) * limit;

// query = query.skip(skip).limit(limit);

// if (req.query.page) {
//   const numTours = await Tour.countDocuments();
//   if (skip >= numTours) throw new Error('This page does not exist');
// }

// NOT NEEDED!! Referance to show how to import a local database/JSON file for initial testing
// const tours = JSON.parse(
//   fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
// );

//NOT NEEDED!! For referance to show how middleware works
// exports.checkId = (req, res, next, val) => {
//   console.log(`The tour Id is ${val}`);
//   //   if (id > tours.length)
//   if (req.params.id * 1 > tours.length) {
//     return res.status(404).json({
//       status: 'fail',
//       Message: 'Invalid id!'
//     });
//   }
//   next();
// };

// NOT NEEDED!! Example of how middleware works
// exports.checkBody = (req, res, next) => {
//   if (!req.body.name || !req.body.price) {
//     return res.status(400).json({
//       status: 'fail',
//       message: 'Missing name or price'
//     });
//   }
//   next();
// };

// Easier method, call create method on the tour method itself
// exports.createTour = (req, res) => {
//   //   console.log(req.body);
//   const newId = tours[tours.length - 1].id + 1;
//   const newTour = Object.assign({ id: newId }, req.body);

//   tours.push(newTour);
//   fs.writeFile(
//     `${__dirname}/dev-data/data/tours-simple.json`,
//     JSON.stringify(tours),
//     err => {
//       res.status(201).json({
//         status: 'success',
//         data: {
//           tour: newTour
//         }
//       });
//     }
//   );
// };

//Passing a filter using a standard MongoDB query
// const tours = await Tour.find({
//   duration: 5,
//   difficulty: 'easy'
// });

//Passing a filter by chaining special mongoose methods
// const tours = await Tour.find()
//   .where('duration')
//   .equals(5)
//   .where('difficulty')
//   .equals('easy');
