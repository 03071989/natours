const mongoose = require('mongoose');
const slugify = require('slugify');
const User = require('./userModel');
const validator = require('validator');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour name is required'], //Error handle can be added into the schema
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must not exceed 40 characters'],
      minlength: [10, 'A tour name must be longer then characters']
      //validate: [validator.isAlpha, 'Tour name can only include letters'] // Will want to get rid of spaces, so not helpful here.
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration']
    },
    secretTour: {
      type: Boolean,
      default: false
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a maximum group size']
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty must either be easy, medium or difficult'
      }
    },
    ratingsAverage: {
      type: Number,
      default: 4.5, // To add a default figure if field is not filled out
      min: [1, 'Rating cannot be less than 1'],
      max: [5, 'Rating cannot be greater than 5'],
      set: val => Math.round(val * 10) / 10 // 4.66666666 * 10 = 46.666666 (rounds up) 47 / 10 = 4.7
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price']
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function(val) {
          // 'this' only points to current doc on new document creation
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below regular price'
      }
    },
    summary: {
      type: String,
      trim: true, //trim remove all white space from the beginning and end of the string "          the tour name        " --> "the tour name"
      required: [true, 'A tour must have a description']
    },
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image']
    },
    images: [String], //[String] for an array of strings
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false
    },
    startDates: [Date],
    //GEO location
    startLocation: {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
      }
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    ]
    // guides: Array //Embedded documents
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true } //Add so when the get query is run the schema creates an object containing virtuals
  }
);

// tourSchema.index({ price: 1 });
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

tourSchema.virtual('durationWeeks').get(function() {
  //function must be used instead of an => function as it does not get a 'this' keyword. 'this' keyword points to the current document
  return this.duration / 7;
});

tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id'
});

// DOCUMENT MIDDLEWARE: runs before .save() and .create()
tourSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// Pre save for embedded documents
// tourSchema.pre('save', async function(next) {
//   const guidesPromise = this.guides.map(async id => await User.findById(id));
//   this.guides = await Promise.all(guidesPromise);
//   next();
// });

// tourSchema.pre('save', function(next) {
//   console.log('Will save next...');
//   next();
// });

// tourSchema.post('save', function(doc, next) {
//   //post function has access to the document that has just been saved and next function
//   console.log(doc);
//   next();
// });

// QUERY MIDDLEWARE
tourSchema.pre(/^find/, function(next) {
  // /^find/ is an expression used to allow the middleware to call any strings/functions that use the expression find (findById,findOne, findByIdAndUpdate etc.)
  // tourSchema.pre('find', function(next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt'
  });
  next();
});

tourSchema.post(/^find/, function(docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds`);
  console.log(docs);
  next();
});

// AGGREGATION MIDDLEWARE
// tourSchema.pre('aggregate', function(next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   console.log(this.pipeline());
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema); //The name 'Tour' in the function defines the collection that the information will be saved under. Mongoose will also pluralise this name when created and if a collection has not been created yet, mongoose will create it.

module.exports = Tour;

//This is not needed, just wanted to keep itfor reference//
// const testTour = new Tour({
//     name: 'The Park Camper',
//     // rating: 4.7,
//     price: 997
//   });
//   testTour
//     .save()
//     .then(doc => {
//       console.log(doc);
//     })
//     .catch(err => {
//       console.log('ERROR:', err);
//     });
