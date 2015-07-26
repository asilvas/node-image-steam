var url = require('url');
var _ = require('lodash');
var helpers = require('../helpers');
var defaults = require('./router-defaults');

module.exports = Router;

function Router(options) {
  if (!(this instanceof Router)) {
    return new Router(options);
  }

  this.options = _.merge({}, defaults, options || {});
}

var p = Router.prototype;

p.getInfo = function(req) {
  var routeInfo = {
    urlInfo: url.parse(req.url, true)
  };

  // break apart imagePath from imageSteps from queryParams
  var pathParts = routeInfo.urlInfo.pathname.split(this.options.pathDelimiter);
  routeInfo.originalPath = pathParts[0].substr(1);

  routeInfo.imageSteps = getImageStepsFromRoute.call(this, pathParts[1]);

  if (routeInfo.imageSteps.filter(formatFilter).length === 0) {
    // use user agent optimized format if format not already provided in request
    var fmt = (req.headers.accept && /image\/webp/.test(req.headers.accept))
      ? 'webp' : 'jpeg'
    ;
    if (/^win/.test(process.platform)) {
      // webp currently unsupported on windows
      fmt = 'jpeg';
    }
    routeInfo.imageSteps.push({ name: 'format', format: fmt });
  }

  routeInfo.hashFromSteps = helpers.imageSteps.getHashFromSteps(routeInfo.imageSteps);

  return routeInfo;
};

function getImageStepsFromRoute(imageStepsStr) {
  if (!imageStepsStr) return [];
  var imageSteps = imageStepsStr.split('/');

  var $this = this;
  return imageSteps.map(function(stepStr) {
    // format: crop=t15:l10:w-10:h-15
    var stepParts = stepStr.split('=');

    var step = { name: stepParts[0] };
    var stepConfig = $this.options.steps[step.name];
    if (!stepConfig) {
      throw new Error('Unsupported step: ' + stepStr);
    }

    // use full name from config
    step.name = stepConfig.name;

    if (stepParts.length < 2) {
      return step;
    }

    var stepParams = stepParts[1].split(':');
    stepParams.forEach(function(stepParam) {
      var paramName = stepParam[0]; // first char is param name
      var fullParamName = stepConfig[paramName];
      if (!fullParamName) {
        throw new Exception('Unsupported param ' + paramName + ' in step ' + stepStr);
      }
      step[fullParamName] = stepParam.substr(1);
    });

    return step;
  });
}

function formatFilter(step) {
  return step.name === 'format';
}
