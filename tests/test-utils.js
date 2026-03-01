const fs = require('fs');
const path = require('path');

const testFolder = path.resolve(__dirname, 'scripts');

function describeErrors(errors) {
  return errors.map((e) => ({
    message: e.message,
    range: e.range ? { start: e.range.start, end: e.range.end } : null,
    code: e.code,
    hint: e.hint ?? null
  }));
}

module.exports = { testFolder, describeErrors };
