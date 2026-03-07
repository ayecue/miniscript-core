const { Parser, UnsafeParser, UnsafeLexer } = require('../dist');

describe('strictMode', function () {
  test('shorthand assignment throws in strict mode', () => {
    const content = `x = 1\nx += 2`;
    expect(() => {
      new Parser(content, { strictMode: true }).parseChunk();
    }).toThrow(/shorthand assignment/);
  });

  test('all shorthand operators throw in strict mode', () => {
    const ops = ['+=', '-=', '*=', '/=', '^=', '%='];
    for (const op of ops) {
      const content = `x = 1\nx ${op} 2`;
      expect(() => {
        new Parser(content, { strictMode: true }).parseChunk();
      }).toThrow(/shorthand assignment/);
    }
  });

  test('shorthand assignment allowed without strict mode', () => {
    const content = `x = 1\nx += 2`;
    const parser = new Parser(content);
    const chunk = parser.parseChunk();
    expect(chunk.toString()).toMatchSnapshot();
  });

  test('unsafe parser recovers from shorthand in strict mode', () => {
    const content = `
a = "before"
x += 2
b = "after"
    `;
    const lexer = new UnsafeLexer(content, { tabWidth: 2 });
    const parser = new UnsafeParser(content, {
      lexer,
      strictMode: true
    });
    parser.parseChunk();

    expect(parser.errors.length).toBeGreaterThan(0);
    expect(parser.errors[0].message).toMatch(/shorthand assignment/);

    const literalValues = parser.state.literals.map(l => l.value?.toString());
    expect(literalValues).toContain('before');
    expect(literalValues).toContain('after');
  });
});
