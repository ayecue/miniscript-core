const { UnsafeParser, UnsafeLexer } = require('../dist');

describe('state recovery', function () {
  test('state arrays are restored after a failed statement', () => {
    const content = `
x = 1
print("hello")
foo(bar @@@
print("world")
y = 2
    `;
    const lexer = new UnsafeLexer(content, { tabWidth: 2 });
    const parser = new UnsafeParser(content, { lexer });
    const chunk = parser.parseChunk();

    expect(parser.errors.length).toBeGreaterThan(0);

    const state = parser.state;
    const literalValues = state.literals.map(l => l.value?.toString());
    expect(literalValues).toContain('hello');
    expect(literalValues).toContain('world');

    const itemCountBefore = state.lineRegistry.items.length;
    expect(itemCountBefore).toBeGreaterThan(0);
  });

  test('multiple consecutive errors do not leak state', () => {
    const content = `
a = "first"
foo(bar @@@
b = "second"
baz(qux @@@
c = "third"
    `;
    const lexer = new UnsafeLexer(content, { tabWidth: 2 });
    const parser = new UnsafeParser(content, { lexer });
    parser.parseChunk();

    expect(parser.errors.length).toBeGreaterThan(0);

    const literalValues = parser.state.literals.map(l => l.value?.toString());
    expect(literalValues).toContain('first');
    expect(literalValues).toContain('second');
    expect(literalValues).toContain('third');
  });

  test('error inside function does not corrupt outer scope', () => {
    const content = `
x = "before"
myFunc = function()
  print("inside")
  bad @@@
  print("after bad")
end function
y = "after"
    `;
    const lexer = new UnsafeLexer(content, { tabWidth: 2 });
    const parser = new UnsafeParser(content, { lexer });
    parser.parseChunk();

    expect(parser.errors.length).toBeGreaterThan(0);

    const literalValues = parser.state.literals.map(l => l.value?.toString());
    expect(literalValues).toContain('before');
    expect(literalValues).toContain('after');
    expect(literalValues).toContain('inside');
    expect(literalValues).toContain('after bad');
  });
});
