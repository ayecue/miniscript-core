const { Parser, UnsafeParser, UnsafeLexer } = require('../dist');

describe('parser error codes', function () {
  function parseUnsafe(content) {
    const lexer = new UnsafeLexer(content, { tabWidth: 2 });
    const parser = new UnsafeParser(content, { lexer });
    parser.parseChunk();
    return { errors: [...lexer.errors, ...parser.errors] };
  }

  test('break outside loop has BreakOutsideLoop code (5001)', () => {
    const { errors } = parseUnsafe('break');
    const breakError = errors.find(e => e.code === 5001);
    expect(breakError).toBeDefined();
  });

  test('continue outside loop has ContinueOutsideLoop code (5002)', () => {
    const { errors } = parseUnsafe('continue');
    const contError = errors.find(e => e.code === 5002);
    expect(contError).toBeDefined();
  });

  test('unclosed block has UnclosedBlock code (4002)', () => {
    const { errors } = parseUnsafe('if true then\n  x = 1');
    const unclosedError = errors.find(e => e.code === 4002);
    expect(unclosedError).toBeDefined();
  });

  test('unexpected punctuator has ExpectedExpression code (3002)', () => {
    const { errors } = parseUnsafe(')');
    const exprError = errors.find(e => e.code === 3002);
    expect(exprError).toBeDefined();
  });

  test('no matching block has NoMatchingBlock code (4001)', () => {
    const { errors } = parseUnsafe('else');
    const noMatchError = errors.find(e => e.code === 4001);
    expect(noMatchError).toBeDefined();
  });

  test('error range has start and end positions', () => {
    const { errors } = parseUnsafe('break');
    expect(errors.length).toBeGreaterThan(0);
    const err = errors[0];
    expect(err.range).toBeDefined();
    expect(err.range.start).toBeDefined();
    expect(err.range.end).toBeDefined();
  });

  test('invalid default value has InvalidDefaultValue code (5003)', () => {
    const { errors } = parseUnsafe('f = function(x = foo + bar)\nend function');
    const defaultError = errors.find(e => e.code === 5003);
    expect(defaultError).toBeDefined();
  });

  test('trailing comma in params has correct code (5004)', () => {
    const { errors } = parseUnsafe('f = function(a, b, )\nend function');
    const trailingError = errors.find(e => e.code === 5004);
    expect(trailingError).toBeDefined();
  });
});
