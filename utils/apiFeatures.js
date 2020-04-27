class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedfields = ['page', 'sort', 'limit', 'fields'];
    excludedfields.forEach(el => delete queryObj[el]);

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lt|lte)\b/g, match => `$${match}`);
    console.log(JSON.parse(queryStr));

    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      console.log(sortBy);
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt'); //Set the default method of ordering database, in this case created date, newest.
    }

    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      console.log(fields);
      this.query = this.query.select(fields); //This is to only select and display the fields in the URL query string
    } else {
      this.query = this.query.select('-__v'); //to remove a field from the search, in this case version number
    }

    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1; //Use trick to turn a string into a number // || 1 - is used to set page 1 as the default
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
