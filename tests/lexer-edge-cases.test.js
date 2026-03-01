const { Lexer, UnsafeLexer, TokenType } = require('../dist');
const { describeErrors } = require('./test-utils');

describe('lexer edge cases', function () {
  function tokenize(content) {
    const lexer = new Lexer(content);
    const tokens = [];
    let token = lexer.next();
    while (token.type !== TokenType.EOF) {
      tokens.push({
        type: token.type,
        value: token.value,
        line: token.line
      });
      token = lexer.next();
    }
    return tokens;
  }

  function unsafeTokenize(content) {
    const lexer = new UnsafeLexer(content);
    const tokens = [];
    let token = lexer.next();
    while (token.type !== TokenType.EOF) {
      tokens.push({
        type: token.type,
        value: token.value,
        line: token.line
      });
      token = lexer.next();
    }
    return { tokens, errors: lexer.errors };
  }

  describe('string edge cases', function () {
    test('empty string', () => {
      const tokens = tokenize('x = ""');
      const stringToken = tokens.find(t => t.value === '');
      expect(stringToken).toBeDefined();
    });

    test('escaped quote in string', () => {
      const tokens = tokenize('x = """"');
      const stringToken = tokens.find(t => t.type === TokenType.StringLiteral);
      expect(stringToken).toBeDefined();
      expect(stringToken.value).toBe('"');
    });
  });

  describe('numeric edge cases', function () {
    test('leading decimal point', () => {
      const tokens = tokenize('x = .5');
      expect(tokens).toMatchSnapshot();
    });

    test('trailing decimal point', () => {
      const tokens = tokenize('x = 1.');
      expect(tokens).toMatchSnapshot();
    });

    test('scientific notation', () => {
      const tokens = tokenize('x = 1e5');
      expect(tokens).toMatchSnapshot();
    });

    test('zero', () => {
      const tokens = tokenize('x = 0');
      const numToken = tokens.find(t => t.value === 0 || t.value === '0');
      expect(numToken).toBeDefined();
    });
  });

  describe('whitespace handling', function () {
    test('multiple spaces between tokens', () => {
      const tokens = tokenize('x   =   1');
      expect(tokens.length).toBeGreaterThanOrEqual(3);
    });

    test('tab characters', () => {
      const tokens = tokenize('\tx = 1');
      expect(tokens.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('comment handling', function () {
    test('single line comment', () => {
      const tokens = tokenize('x = 1 // this is a comment\ny = 2');
      // The comment should be skipped, both assignments tokenized
      const identifiers = tokens.filter(t => t.type === TokenType.Identifier);
      expect(identifiers.length).toBeGreaterThanOrEqual(2);
    });

    test('comment at end of file', () => {
      const tokens = tokenize('x = 1 // final comment');
      expect(tokens.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('operator tokens', function () {
    test('all arithmetic operators tokenize', () => {
      const ops = ['+', '-', '*', '/', '%', '^'];
      for (const op of ops) {
        const tokens = tokenize(`x = 1 ${op} 2`);
        expect(tokens.length).toBeGreaterThanOrEqual(5);
      }
    });

    test('all comparison operators tokenize', () => {
      const ops = ['==', '!=', '<', '>', '<=', '>='];
      for (const op of ops) {
        const tokens = tokenize(`x = 1 ${op} 2`);
        expect(tokens.length).toBeGreaterThanOrEqual(5);
      }
    });

    test('shorthand assignment operators tokenize', () => {
      const ops = ['+=', '-=', '*=', '/=', '^=', '%='];
      for (const op of ops) {
        const tokens = tokenize(`x ${op} 2`);
        expect(tokens.length).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe('error recovery', function () {
    test('invalid character produces error in unsafe mode', () => {
      const { tokens, errors } = unsafeTokenize('x = $');
      expect(errors.length).toBeGreaterThan(0);
    });

    test('unterminated string produces error', () => {
      const { tokens, errors } = unsafeTokenize('x = "hello');
      expect(errors.length).toBeGreaterThan(0);
    });

    test('invalid character error has correct code', () => {
      const { errors } = unsafeTokenize('x = $');
      expect(errors[0].code).toBe(1001); // ErrorCode.InvalidCharacter
    });

    test('unterminated string error has correct code', () => {
      const { errors } = unsafeTokenize('x = "hello');
      expect(errors[0].code).toBe(1002); // ErrorCode.UnexpectedStringEOF
    });
  });
});
