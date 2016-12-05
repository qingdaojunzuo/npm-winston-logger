(function(root) {

  var winston = require('winston');
  require('winston-daily-rotate-file');
  require('./winston-logstash.js');
  var util = require('./log-util.js'),
      _ = require('underscore');
  var stdoutOld = process.stdout.write,
      stderrOld = process.stderr.write;

  var overrideConsole = function(logger) {
    // override console.debug
    console.debug = console.debug || function() {
      try {
        logger.debug(util
          .convert(Array.prototype.slice.call(arguments)));
      } catch (e) {}
    };

    // override stdout
    process.stdout.write = (function(write) {
      return function(string, encoding, fd) {
        write.apply(process.stdout, arguments);
        logger.info((string || '').trim());
      };
    }(stdoutOld));

    // override stderr
    process.stderr.write = (function(write) {
      return function(string, encoding, fd) {
        write.apply(process.stderr, arguments);
        logger.error((string || '').trim());
      };
    }(stderrOld));
  };

  var def = {
    level: 'debug',                                   // log level
    filename: process.pid + '.log',                   // default file name
    maxsize: 50000000,                                // default single file max size, 50m
    maxFiles: 10,                                     // default max files, 10
    logstash: {                                       // logstash configuration
      enable: false,                                  // if add logstash transport
      port: 9500,                                     // default logstash port, 9500
      host: '127.0.0.1'                               // default logstash host, 127.0.0.1
    },
    removeConsole: false,                             // remove console trasport
    overrideConsole: false,                           // override default console functions
    formatter: util.defFormatter,                     // log message formatter
    timestamp: util.defTimestamp,                     // log timestamp formatter
    json: false                                       // json format or not
  };

  module.exports = function(option) {

    return (function() {

      var log = function() {},
          opt = {};

      log.prototype.option = function(option) {
        opt = _.extend({}, def, option);
        return this;
      };

      log.prototype.getLogger = function() {
        // using default options if opt is empty
        opt = _.isEmpty(opt) ? def : opt;

        // remove console transport
        if (!!opt.removeConsole)
          winston.remove(winston.transports.Console);

        var transports = [];
        // register daily rotate transports
        // pass the options to DailyRotateFile transports directly
        // so that all the options supported by DailyRotateFile can
        // be passed
        var daily = new winston.transports.DailyRotateFile(opt);
        transports.push(daily);
        
        // DailyRotateFile is inherited from winston Transport
        // register the error event handler by default
        // you can add your own handler by 
        // this.getLogger.transports.dailyRotateFile.on('error', function(err) {...})
        daily.on('error', function(err) {
          console.log(err); // default just catch the error and print
        });

        // register logstash transports
        if (!!opt.logstash.enable) {
          var logstash = new winston.transports.Logstash(opt.logstash);
          logstash.setFormatter(opt.formatter);
          transports.push(logstash);
          
          // Logstash is inherited from winston Transport
          // register the error event handler by default
          // you can add your own handler by 
          // this.getLogger.transports.logstash.on('error', function(err) {...})
          logstash.on('error', function(err) {
            console.log(err); // default just catch the error and print
          });
        }

        // get winston logger
        l = new winston.Logger({
          level: opt.level,
          transports: transports
        });

        // override console methods
        if (opt.overrideConsole)
          overrideConsole(l);
        
        return l;
      };

      log.prototype.lineFormatter = function(opt) {
        return util.lineFormatter(opt); 
      };

      log.prototype.reset = function(logger) {
        logger.add(winston.transports.Console);
        logger.remove(winston.transports.DailyRotateFile);
        logger.remove(winston.transports.Logstash);
      };

      return new log();
    }());
  };

}(this));
