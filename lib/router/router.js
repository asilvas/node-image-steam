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

/* FORMAT
  {path}{pathDelimiter}{cmd1}{cmdValDelimiter}{cmd1Param1Key}{paramValDelimiter}{cmd1Param1Value}{paramKeyDelimiter}{cmdKeyDelimiter}?{queryString}
*/

p.getInfo = function(req) {
  var routeInfo = {
    urlInfo: url.parse(req.url, true)
  };

  // break apart imagePath from imageSteps from queryParams
  var pathParts = routeInfo.urlInfo.pathname.split(this.options.pathDelimiter);
  routeInfo.originalPath = pathParts[0].substr(1); // remove `/` prefix from path

  routeInfo.imageSteps = getImageStepsFromRoute.call(this, pathParts[1]);

  if (routeInfo.imageSteps.filter(formatFilter).length === 0) {
    if (routeInfo.urlInfo.query.download !== undefined) {
      // force jpeg if downloading
      routeInfo.imageSteps.push({ name: 'format', format: 'jpeg' });
    } else {
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
  }

  routeInfo.hashFromSteps = helpers.imageSteps.getHashFromSteps(routeInfo.imageSteps);

  return routeInfo;
};

function getImageStepsFromRoute(imageStepsStr) {
  if (!imageStepsStr) return [];
  var imageSteps = imageStepsStr.split(this.options.cmdKeyDelimiter);

  var $this = this;
  return imageSteps.map(function(stepStr) {
    // format: crop=t:15,l:10,w:-10,h:-15
    var stepParts = stepStr.split($this.options.cmdValDelimiter);

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

    var stepParams = stepParts[1].split($this.options.paramKeyDelimiter);
    stepParams.forEach(function(stepParam) {
      var paramParts = stepParam.split($this.options.paramValDelimiter);
      var paramName = paramParts[0];
      var fullParamName = stepConfig[paramName];
      if (!fullParamName) {
        throw new Exception('Unsupported param ' + paramName + ' in step ' + stepStr);
      }
      if (paramParts.length >= 2) {
        step[fullParamName] = paramParts[1];
      } else { // use a truthy value if key exists with no value
        step[fullParamName] = true;
      }
    });

    return step;
  });
}

function formatFilter(step) {
  return step.name === 'format';
}
