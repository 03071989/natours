const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

exports.getAll = Model =>
  catchAsync(async (req, res, next) => {
    //To allow for nested GET eviews on Tour (hack)
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };
    // console.log(req.requestTime);

    //EXECUTE QUERY
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    // const doc = await features.query.explain(); // explain helps show a break down of documents searched, helpful for creating index's to see how efficient a search is.
    const doc = await features.query;

    res.status(200).json({
      status: 'success',
      timerequested: req.requestTime,
      results: doc.length,
      data: {
        data: doc
      }
    });
  });

exports.deleteOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError('Cannot find a document with that ID'));
    }

    res.status(204).json({
      status: 'success',
      message: 'Doc deleted',
      data: null
    });
  });

exports.updateOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!doc) {
      return next(new AppError('Cannot find a doc with that ID'));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc
      }
    });
  });

exports.createOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        data: doc
      }
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);

    const doc = await query; //populate allows you to access all information from a referanced object id, in this case the 'guides' information
    // const tour = await Tour.findOne({ _id: req.params.id }); Same as findById

    if (!doc) {
      return next(new AppError('Cannot find a doc with that ID'));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc
      }
    });
  });
