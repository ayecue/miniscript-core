const { Parser, UnsafeParser, UnsafeLexer, ASTType } = require('../dist');
const { describeErrors } = require('./test-utils');

describe('parser edge cases', function () {
  describe('comparison group expressions', function () {
    test('single comparison is a binary expression', () => {
      const content = `result = 1 < 2`;
      const parser = new Parser(content);
      const chunk = parser.parseChunk();
      expect(chunk.toString()).toMatchSnapshot();
    });

    test('chained comparisons produce ComparisonGroupExpression', () => {
      const content = `result = 1 < x and x < 10`;
      const parser = new Parser(content);
      const chunk = parser.parseChunk();
      expect(chunk.toString()).toMatchSnapshot();
    });

    test('mixed comparison operators', () => {
      const content = `result = a >= b`;
      const parser = new Parser(content);
      const chunk = parser.parseChunk();
      expect(chunk.toString()).toMatchSnapshot();
    });

    test('equality comparison', () => {
      const content = `result = x == y`;
      const parser = new Parser(content);
      const chunk = parser.parseChunk();
      expect(chunk.toString()).toMatchSnapshot();
    });

    test('inequality comparison', () => {
      const content = `result = x != y`;
      const parser = new Parser(content);
      const chunk = parser.parseChunk();
      expect(chunk.toString()).toMatchSnapshot();
    });
  });

  describe('isa expression', function () {
    test('basic isa expression', () => {
      const content = `result = x isa string`;
      const parser = new Parser(content);
      const chunk = parser.parseChunk();
      expect(chunk.toString()).toMatchSnapshot();
    });

    test('isa with member expression', () => {
      const content = `result = obj.val isa list`;
      const parser = new Parser(content);
      const chunk = parser.parseChunk();
      expect(chunk.toString()).toMatchSnapshot();
    });
  });

  describe('logical operators', function () {
    test('and expression', () => {
      const content = `result = a and b`;
      const parser = new Parser(content);
      const chunk = parser.parseChunk();
      expect(chunk.toString()).toMatchSnapshot();
    });

    test('or expression', () => {
      const content = `result = a or b`;
      const parser = new Parser(content);
      const chunk = parser.parseChunk();
      expect(chunk.toString()).toMatchSnapshot();
    });

    test('and/or precedence', () => {
      const content = `result = a or b and c`;
      const parser = new Parser(content);
      const chunk = parser.parseChunk();
      expect(chunk.toString()).toMatchSnapshot();
    });
  });

  describe('parameter errors', function () {
    test('non-literal default value raises error', () => {
      const content = `f = function(x = foo + bar)\nend function`;
      expect(() => {
        new Parser(content).parseChunk();
      }).toThrow();
    });

    test('trailing comma in params raises error', () => {
      const content = `f = function(a, b, )\nend function`;
      expect(() => {
        new Parser(content).parseChunk();
      }).toThrow();
    });
  });

  describe('indexing with space rule', function () {
    test('no space before bracket is index expression', () => {
      const content = `result = arr[0]`;
      const parser = new Parser(content);
      const chunk = parser.parseChunk();
      expect(chunk.toString()).toMatchSnapshot();
    });

    test('slice expression with colon', () => {
      const content = `result = arr[1:3]`;
      const parser = new Parser(content);
      const chunk = parser.parseChunk();
      expect(chunk.toString()).toMatchSnapshot();
    });
  });

  describe('command-style calls', function () {
    test('print with string argument', () => {
      const content = `print "hello world"`;
      const parser = new Parser(content);
      const chunk = parser.parseChunk();
      expect(chunk.toString()).toMatchSnapshot();
    });

    test('command call with multiple arguments', () => {
      const content = `print "a", "b", "c"`;
      const parser = new Parser(content);
      const chunk = parser.parseChunk();
      expect(chunk.toString()).toMatchSnapshot();
    });
  });

  describe('prefix operators', function () {
    test('not operator', () => {
      const content = `result = not true`;
      const parser = new Parser(content);
      const chunk = parser.parseChunk();
      expect(chunk.toString()).toMatchSnapshot();
    });

    test('address-of operator @', () => {
      const content = `result = @x`;
      const parser = new Parser(content);
      const chunk = parser.parseChunk();
      expect(chunk.toString()).toMatchSnapshot();
    });

    test('new operator', () => {
      const content = `result = new Foo`;
      const parser = new Parser(content);
      const chunk = parser.parseChunk();
      expect(chunk.toString()).toMatchSnapshot();
    });

    test('unary minus', () => {
      const content = `result = -5`;
      const parser = new Parser(content);
      const chunk = parser.parseChunk();
      expect(chunk.toString()).toMatchSnapshot();
    });
  });

  describe('power precedence', function () {
    test('power operator binds tighter than multiply', () => {
      const content = `result = 2 * 3 ^ 4`;
      const parser = new Parser(content);
      const chunk = parser.parseChunk();
      expect(chunk.toString()).toMatchSnapshot();
    });
  });

  describe('map and list literals', function () {
    test('empty map', () => {
      const content = `result = {}`;
      const parser = new Parser(content);
      const chunk = parser.parseChunk();
      expect(chunk.toString()).toMatchSnapshot();
    });

    test('map with entries', () => {
      const content = `result = {"a": 1, "b": 2}`;
      const parser = new Parser(content);
      const chunk = parser.parseChunk();
      expect(chunk.toString()).toMatchSnapshot();
    });

    test('empty list', () => {
      const content = `result = []`;
      const parser = new Parser(content);
      const chunk = parser.parseChunk();
      expect(chunk.toString()).toMatchSnapshot();
    });

    test('list with values', () => {
      const content = `result = [1, 2, 3]`;
      const parser = new Parser(content);
      const chunk = parser.parseChunk();
      expect(chunk.toString()).toMatchSnapshot();
    });
  });

  describe('string concatenation', function () {
    test('plus with strings', () => {
      const content = `result = "hello" + " " + "world"`;
      const parser = new Parser(content);
      const chunk = parser.parseChunk();
      expect(chunk.toString()).toMatchSnapshot();
    });
  });

  describe('member/index chaining', function () {
    test('chained member access', () => {
      const content = `result = a.b.c`;
      const parser = new Parser(content);
      const chunk = parser.parseChunk();
      expect(chunk.toString()).toMatchSnapshot();
    });

    test('chained index and member', () => {
      const content = `result = a[0].b`;
      const parser = new Parser(content);
      const chunk = parser.parseChunk();
      expect(chunk.toString()).toMatchSnapshot();
    });

    test('call then member', () => {
      const content = `result = foo().bar`;
      const parser = new Parser(content);
      const chunk = parser.parseChunk();
      expect(chunk.toString()).toMatchSnapshot();
    });
  });
});
