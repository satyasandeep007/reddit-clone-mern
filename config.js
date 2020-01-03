const config = {};

config.development = {
  name: 'development',
  httpPort: 8080,
  httpsPort: 8081,
  database: "mongodb+srv://sample:sample@sample-4j1du.mongodb.net/test?retryWrites=true&w=majority",
  secret: 'coolcake'
};

config.production = {
  name: 'production',
  httpPort: 8080,
  httpsPort: 443,
  database: 'mongodb://127.0.0.1:27017/sports',
  secret: 'whateverIlike'
};

// Change before deploying
let envToExport = config.development;

module.exports = envToExport;
