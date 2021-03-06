// https://stackoverflow.com/questions/37132031/nodejs-plans-to-support-import-export-es6-es2015-modules
// TODO: give each function a depends on identifier and allow tree shaking
'use strict';

const EOL = require('os').EOL;

const fs = require('fs');
const util = require('util');

let fpAppendFile;
let fpWriteFile;

const DELIMITER = '<<<***DEL***>>>';

let _utils = {};

main();

function main() {
  // ref: https://stackoverflow.com/questions/17575790/environment-detection-node-js-or-browser
  _utils.isNode = new Function(`
        try {return this===window;}catch(e){ return false;}
    `);

  if (_utils.isNode()) {
    let fpAppendFile = util.promisify(fs.appendFile);
    let fpWriteFile = util.promisify(fs.writeFile);
  } else {
    // window.ELLA = _utils; // TODO: enable via env var
  }
}

_utils.State = {};

// turn in array into batches of iBatchSize
// like _.chunk, ref: https://lodash.com/docs/4.17.4#chunk
_utils.chunk = function(arr, iBatchSize) {
  const iInputArrLength = arr.length;
  const iNumberOfBatches = Math.ceil(iInputArrLength / iBatchSize);
  let arrResult = new Array(iNumberOfBatches);
  let iResultIndex = 0;
  let iCurrentItem = 0;

  while (iCurrentItem < iInputArrLength) {
    arrResult[iResultIndex++] = arr.slice(iCurrentItem, (iCurrentItem += iBatchSize));
  }

  return arrResult;
};

//  convention for converting arbitrary string into a
//  class name for css or w/e
//  only letters and dashes
_utils.classify = function(sString) {
  var sClassName = ''; // TODO: can we remove sClassName and the for loop?

  for (var i = 0; i < sString.length; i++) {
    if (isNaN(sString[i])) sClassName += sString[i];
  }

  return sString
    .toLowerCase()
    .replace(/[ ]/g, '-')
    .replace(/[^a-z-]/g, '');
};

/**
 *  desc:
 *  a utility method to ensure a variable called vProperty exists.
 *  ensure() recursively references or creates needed ancestors
 *  after ensuring vProperty exists, the value will be set to vValue which is a variant type.
 *  given that vProperty already exists and has some value, the value will be
 *  overwritten with a value of vValue iff bYield.
 *
 *  oOptions = {
 *      vValue:         // set the value of the final object
 *      oAncestor:      // the ancestor of the final object.
 *                      //      By default it is this or BaseController
 *      bYield:         // pass true if you do not want vValue to override an existing value
 *  }
 *
 *  TODO: non-variant typing?
 */
_utils.ensure = function(sProperty, oOptions) {
  var i = 0,
    oRoot = oOptions.oAncestor || this,
    oWorking = oRoot,
    arrsDescendents = sProperty.split('.');

  for (i; i < arrsDescendents.length - 1; i++) {
    if (!oWorking[arrsDescendents[i]]) oWorking[arrsDescendents[i]] = {};
    oWorking = oWorking[arrsDescendents[i]];
  }

  oWorking[arrsDescendents[i]] = oOptions.vValue;
};

// alias for sMakeDirByPathSync()
_utils.ensureFolder = function(targetDir, { isRelativeToScript = false } = {}) {
  _utils.sMakeDirByPathSync(targetDir, isRelativeToScript);
};

// ensure a file exists
// also recursively ensure folders
_utils.ensureFile = function(sLocation, { isRelativeToScript = false } = {}) {
  let arrsDir = sLocation.split('/');
  let sDir = '';

  if (fs.existsSync(sLocation)) return;

  if (arrsDir.length > 1) {
    sDir = arrsDir.slice(0, -1).join('/');

    _utils.ensureFolder(sDir, isRelativeToScript);
  }

  fs.closeSync(fs.openSync(filepath, 'w')); // create empty file
};

// ref: https://stackoverflow.com/questions/31645738/how-to-create-full-path-with-nodes-fs-mkdirsync
// ensure that a file system path exists by creating folders recursively as needed
_utils.sMakeDirByPathSync = function(targetDir, { isRelativeToScript = false } = {}) {
  const sep = path.sep;
  const initDir = path.isAbsolute(targetDir) ? sep : '';
  const baseDir = isRelativeToScript ? __dirname : '.';

  return targetDir.split(sep).reduce((parentDir, childDir) => {
    const curDir = path.resolve(baseDir, parentDir, childDir);
    try {
      fs.mkdirSync(curDir);
      console.log(`Directory ${curDir} created!`);
    } catch (err) {
      if (err.code !== 'EEXIST') {
        throw err;
      }

      console.log(`Directory ${curDir} already exists!`);
    }

    return curDir;
  }, initDir);
};

//  TODO: desc
//  f can optionally return a promise...I think ?
_utils.executeAfterKSeconds = function(k, x, f) {
  let iMils = k * 1000;

  return new Promise(resolve => {
    setTimeout(() => {
      resolve(f(x));
    }, iMils);
  });
};

//  like [].forEach() but faster
//  reverse fors can also transform an array in-place without messing up the index
//  https://jsperf.com/foreach-vs-api-call
_utils.forEachReverse = function(arr, f) {
  for (var i = arr.length; i--; ) {
    f(arr[i], i);
  }
};

//  _utils.forEachReverse as async function
//  fp must return a promise
//  allows all items in the array to execute in parallel
//  ideal for performance
//  TODO: implement Promise(...).reflect() here or elsewhere for no-failure promise arrays
_utils.forEachReverseAsyncParallel = async function(arr, fp) {
  let arrp = [];

  for (var i = arr.length; i--; ) {
    arrp.push(fp(arr[i], i));
  }

  return await Promise.all(arrp);
};

//  _utils.forEachReverse as async function
//  fp must return a promise
//  forces each async function to complete in order (phased async pattern)
//  phased is useful for throttling or dependencies
//
//  note: phased is muuuuuuch more reliable when scraping; parallel will drop data
_utils.forEachReverseAsyncPhased = async function(arr, fp) {
  let arrOutputs = [];

  for (var i = arr.length; i--; ) {
    arrOutputs.push(await fp(arr[i], i));
  }

  return arrOutputs;
};

//  f is applied to each element in arr. As in `function f(el){ /* do stuff */ }`
//  f is applied every iSeconds
//  this function returns a promise. it's thenable and awaitable.
_utils.forEachThrottledAsync = async function(iSeconds, arr, f) {
  return _utils.forEachReverseAsyncPhased(arr, async function(el) {
    return _utils.executeAfterKSeconds(iSeconds, el, f);
  });
};

//  TODO: refactor so this function adopts a different strategy compared to forEachThrottledAsync()
//  this one should ensure all functions inside the batch have completed before continuing
//  even if that causes it to wait longer than iSeconds.
//  the other method should be 'fire and forget'
_utils.forEachPatientlyThrottledAsync = async function(iSeconds, arr, f) {
  return _utils.forEachReverseAsyncPhased(arr, async function(el) {
    return _utils.executeAfterKSeconds(iSeconds, el, f);
  });
};

//  interpolate an object like fsSupplant('this/{is-an}/example', {'is-an': 'apple-tastes-delicious-for'});
//  ref: https://stackoverflow.com/questions/1408289/how-can-i-do-string-interpolation-in-javascript
_utils.fsSupplant = function(sInterpolee, oOptions) {
  return sInterpolee.replace(/{([^{}]*)}/g, function(a, b) {
    var r = oOptions[b];
    return typeof r === 'string' || typeof r === 'number' ? r : a;
  });
};

// TODO: description
_utils.getMatches = function(arr, sKey, vMatch) {
  if (vMatch instanceof RegExp) {
    return arr.filter(function(oEl) {
      return oEl[sKey] && oEl[sKey].match(vMatch);
    });
  }

  return arr.filter(function(oEl) {
    return oEl[sKey] === vMatch;
  });
};

_utils.log = function(console) {
  let _foriginalLog = console.log;
  let _futilsLog = function(_sMessage) {
    fs.appendFile(__dirname + '\\utils-log.txt', '\r\n\r\n' + JSON.stringify(_sMessage), function(err) {
      if (err) console.log(err);
    });
  };

  return function(logMessage) {
    _foriginalLog(logMessage);
    _futilsLog(logMessage);
  };
};

//  use for all sorts of data to pipe it into whatever writestream
//  ensure message gets line breaks
//  add standard delimeter for later parsing
_utils.fStandardWriter = function(vData, ws, bDontWrap) {
  if (typeof vData !== 'string') vData = JSON.stringify(vData);
  if (!bDontWrap) vData = EOL + DELIMITER + EOL + vData;
  ws.write(vData);
};

// ref: https://stackoverflow.com/questions/10865025/merge-flatten-an-array-of-arrays-in-javascript
_utils.flatten = function(arr) {
  return arr.reduce(function(flat, toFlatten) {
    return flat.concat(Array.isArray(toFlatten) ? _utils.flatten(toFlatten) : toFlatten);
  }, []);
};

// like String.trim()
// but, removes commas and quotes too (outer or interior)
_utils.fsTrimMore = function(s) {
  return s && s.replace(/[,"]/g, '').trim();
};

// like String.trim()
// but, handles existance check
_utils.fsSafeTrim = function(s) {
  return (s && s.trim()) || '';
};

// ref: https://derickbailey.com/2014/09/21/calculating-standard-deviation-with-array-map-and-array-reduce-in-javascript/
_utils.standardDeviation = function(arri) {
  var avg = _utils.mean(arri);

  var squareDiffs = arri.map(function(value) {
    var diff = value - avg;
    var sqrDiff = diff * diff;
    return sqrDiff;
  });

  var avgSquareDiff = _utils.mean(squareDiffs);

  var stdDev = Math.sqrt(avgSquareDiff);
  return stdDev;
};

_utils.average = function(arri) {
  return _utils.mean(arri);
};

_utils.mean = function(arri) {
  var sum = arri.reduce(function(sum, value) {
    return sum + value;
  }, 0);

  var avg = sum / arri.length;
  return avg;
};

// ref: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/max
_utils.max = function(v, i) {
  if (Array.isArray(v)) {
    return Math.max(...v);
  } else if (Number.isInteger(i)) {
    return Math.max(v, i);
  }
};

_utils.min = function(v, i) {
  if (Array.isArray(v)) {
    return Math.min(...v);
  } else if (Number.isInteger(i)) {
    return Math.min(v, i);
  }
};

// ref: https://stackoverflow.com/questions/25305640/find-median-values-from-array-in-javascript-8-values-or-9-values
_utils.median = function(arri) {
  // extract the .values field and sort the resulting array
  var m = arri
    .map(function(v) {
      return v.values;
    })
    .sort(function(a, b) {
      return a - b;
    });

  var middle = Math.floor((m.length - 1) / 2); // NB: operator precedence
  if (m.length % 2) {
    return m[middle];
  } else {
    return (m[middle] + m[middle + 1]) / 2.0;
  }
};

// ref: https://github.com/Vandivier/data-science-practice/tree/master/js/charm-scraper
_utils.fpWait = function(ms) {
  ms = ms || 10000;
  return new Promise(resolve => setTimeout(resolve, ms));
};

// ref: https://github.com/Vandivier/data-science-practice/tree/master/js/charm-scraper
// ref: https://stackoverflow.com/questions/30505960/use-promise-to-wait-until-polled-condition-is-satisfied
_utils.fpWaitForFunction = function(ms, fb) {
  return new Promise(function(resolve) {
    (function _fpWaitLoop() {
      if (fb()) return resolve();
      setTimeout(_fpWaitLoop, ms);
    })();
  });
};

// TODO: make private?
_utils.fsWrapCsvCell = function(v) {
  let s = String(v);

  if (s === 'undefined') s = '';

  return '"' + s + '",';
};

// if you provide a write stream it will write, otherwise it just returns the concatenated string
_utils.fsRecordToCsvLine = function(oRecord, arrTableColumnKeys, wsWriteStream) {
  let sToCsv = '';

  arrTableColumnKeys.forEach(function(s) {
    sToCsv += _utils.fsWrapCsvCell(oRecord[s]);
  });

  sToCsv = sToCsv.slice(0, -1); // remove last trailing comma
  wsWriteStream && wsWriteStream.write(sToCsv + EOL);
  return sToCsv;
};

_utils.fbOnServer = function() {
  return typeof window === 'undefined';
};

/**
 * wraps _utils.getMatches()
 * ensure a unique query result exists: find an object in arr with key === sUniqueKey and value === vUniqueValue
 * if it exists, return that value, if it doesn't exist, make it
 * finally, return the whole array by default or the new value if bReturnNewValue
 * Note: bReturnNewValue is experimental and unexpected results may occur
 * if attempting to mutate vNewValue by reference
 * options.bReturnNewValue
 * options.bExtend
 */
_utils.fvSureSet = function(arro, sUniqueKey, vUniqueValue, vNewValue, options) {
  var arrMatch = _utils.getMatches(arro, sUniqueKey, vUniqueValue);

  options = options || {}; // don't err if it isn't passed

  if (arrMatch.length === 1) {
    if (options.bExtend) {
      arrMatch[0] = $.extend(arrMatch[0], vNewValue, arrMatch[0]);
    } else {
      arrMatch[0] = vNewValue;
    }
  } else if (arrMatch.length > 1) {
    MI.get('log-error', {
      sErrorMessage: 'error in fvSureSet().',
      soException:
        'Unique result expected but multiple results found.' + ' Consider prior using a dedup method like fDedupeByNumericProperty',
    });
  } else {
    // arrMatch.length === 0
    arro.push(vNewValue);
  }

  if (options.bReturnNewValue) {
    return vNewValue;
  }

  return arro;
};

// for external use, see fvRemoveCircularReferences
// ref: https://stackoverflow.com/a/31557814/3931488
function _fRemoveCircularReferences(object, bStringify) {
  var simpleObject = {};

  for (var prop in object) {
    if (!object.hasOwnProperty(prop)) {
      continue;
    }
    if (typeof object[prop] == 'object') {
      continue;
    }
    if (typeof object[prop] == 'function') {
      continue;
    }
    simpleObject[prop] = object[prop];
  }

  return bStringify ? JSON.stringify(simpleObject) : simpleObject;
}

// decides whether input is an array or not and cleans appropriately
_utils.fvRemoveCircularReferences = function(v, bStringify) {
  if (Array.isArray(v)) {
    return v.map(function(el) {
      return _fRemoveCircularReferences(el, bStringify);
    });
  }

  return _fRemoveCircularReferences(v, bStringify);
};

_utils.isNumeric = function(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
};

_utils.fsObjectToCSVLine = function(oRecord, arrsKeys) {
  let sLine = '';

  for (let i = 0; i < arrsKeys.length; i++) {
    sLine += (oRecord[arrsKeys[i]] || '') + ',';
  }

  return sLine.slice(0, -1);
};

_utils.fpObjectsToCSV = async function(arro, options) {
  const arrsKeys = options.arrsKeys || (options.oTitleLine && Object.keys(options.oTitleLine).sort()) || Object.keys(arro[0]).sort(); // if not passed, get all of them in alphabetical order

  let sCSV = '';

  if (options.oTitleLine) arro = [options.oTitleLine].concat(arro);
  if (options.sTitleLine) sCSV = sTitleLine;

  for (let oRecord of arro) {
    sCSV += _utils.fsObjectToCSVLine(oRecord, arrsKeys) + EOL;
  }

  if (options.sOutFileLocation) {
    if (options.bAppend) {
      return fpAppendFile(options.sOutFileLocation, sCSV, 'utf8');
    } else {
      return fpWriteFile(options.sOutFileLocation, sCSV, 'utf8');
    }
  } else {
    return Promise.resolve(sCSV);
  }
};

_utils.compare = function(a, b, isAscending) {
  return (a < b ? -1 : 1) * (isAscending ? 1 : -1);
};

module.exports = _utils;
