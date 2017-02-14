var EventEmitter = require('events').EventEmitter;
var sem = require('semaphore');

module.exports = Throttle;

function Throttle(options) {
  if (!(this instanceof Throttle)) {
    return new Throttle(options);
  }

  EventEmitter.call(this);

  options = options || {};
  options.ccProcessors = options.ccProcessors || 4;
  options.ccPrefetchers = options.ccPrefetchers || 20;
  options.ccRequests = options.ccRequests || 100;
  options.responseTimeoutMs = options.responseTimeoutMs || 120000;
  this.sem_ccProcessors = sem(options.ccProcessors);
  this.sem_ccPrefetchers = sem(options.ccPrefetchers);
  this.ccRequests = 0;
  this.options = options;

  var $this = this;
  setInterval(function() {
    $this.emit('warn', {
      message: 'image-steam::throttle heartbeat',
      sem_ccPrefetchers: $this.sem_ccPrefetchers.current,
      sem_ccProcessors: $this.sem_ccProcessors.current
    });
  }, 10000).unref();
}

var p = Throttle.prototype = new EventEmitter();

p.startRequest = function(req, res) {
  if (this.ccRequests >= this.options.ccRequests) {
    return false;
  }

  var end = res.end;
  var $this = this;
  this.ccRequests++;
  req.imageSteam = { prefetchers: 0, processors: 0 };

  var cleanupTimer = setTimeout(function() {
    $this.emit('warn', 'res.end NEVER called, cleaning up!');
    try { res.writeHead(408); } catch (ex) {} // eat it
    res.end();
  }, this.options.responseTimeoutMs);

  var callCount = 0;

  res.end = function() {
    if (callCount !== 0) {
      $this.emit('warn', 'res.end invoked more than once!');
      // THIS IS ALLOWED AS WE MUST ALWAYS ALLOWING FREEING OF
      // NEWLY ALLOCATED SEATS.
    } else {
      // only perform these tasks once EVER
      clearTimeout(cleanupTimer);
      $this.ccRequests--;
    }
    callCount++;
    if (req.imageSteam.prefetchers > 0) {
      req.imageSteam.prefetchers = 0;
      $this.sem_ccPrefetchers.leave(req.imageSteam.prefetchers);
    }
    if (req.imageSteam.processors > 0) {
      req.imageSteam.processors = 0;
      $this.sem_ccProcessors.leave(req.imageSteam.processors);
    }
    end.apply(res, arguments);
  }.bind(res);

  return true;
};

p.getPrefetcher = function(req, cb) {
  if (!req.imageSteam) {
    throw new Error('Cannot getPrefetcher without calling startRequest');
  }
  this.sem_ccPrefetchers.take(function() {
    req.imageSteam.prefetchers++;
    cb();
  });
};

p.getProcessor = function(req, cb) {
  if (!req.imageSteam) {
    throw new Error('Cannot getProcessor without calling startRequest');
  }
  this.sem_ccProcessors.take(function() {
    req.imageSteam.processors++;
    cb();
  });
};
