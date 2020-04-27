const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Make sure uncaught exceptions are implemented at the begining of your code
process.on('uncaughtException', err => {
  console.log('UNHANDELLED REJECTION!!! Shutting down now.....');
  console.log(err.name, err.message);
  process.exit(1); // When there is an uncaught exception you want to crash the application
});

dotenv.config({ path: './config.env' });

const app = require('./app');

// console.log(process.env.NODE_ENV);

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  //.connect(process.env.DATABASE_LOCAL, { < Use this to access the local database instead >
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  })
  .then(() => console.log('DB connection successful'));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App listening on port ${port}....`);
});

process.on('unhandledRejection', err => {
  console.log('UNHANDELLED REJECTION!!! Shutting down now.....');
  console.log(err.name, err.message);
  server.close(() => {
    //Process.exit is a harsh way to exit the server. By wrapping it in the .close we give the server time to run the requests that are pending, before running process.exit
    process.exit(1); //0 = Success, 1 = Uncalled exception
  });
});
