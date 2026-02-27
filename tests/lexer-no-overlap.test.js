const { UnsafeLexer, TokenType } = require('../dist');
const fs = require('fs');
const path = require('path');
const testFolder = path.resolve(__dirname, 'scripts');

/**
 * Collect all non-EOF tokens from reading source with the lexer.
 */
function collectTokens(source) {
  const lexer = new UnsafeLexer(source, { tabWidth: 4 });
  const tokens = [];
  let token = lexer.next();
  while (token.type !== TokenType.EOF) {
    tokens.push(token);
    token = lexer.next();
  }
  return tokens;
}

describe('lexer token ranges must not overlap', () => {
  const scripts = fs.readdirSync(testFolder);

  scripts.forEach((file) => {
    const filepath = path.resolve(testFolder, file);

    test(path.basename(filepath), () => {
      const content = fs.readFileSync(filepath, 'utf-8');
      const tokens = collectTokens(content);

      if (tokens.length < 2) return;

      // Sort tokens by rangeStart (they should already be in order)
      const sorted = [...tokens].sort((a, b) => a.rangeStart - b.rangeStart);

      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];

        // Previous token's rangeEnd must not exceed current token's rangeStart
        if (prev.rangeEnd > curr.rangeStart) {
          const prevDesc = `${TokenType[prev.type]}('${prev.value}') at ${prev.line}:${prev.startChar}-${prev.endLine}:${prev.endChar} [range ${prev.rangeStart}-${prev.rangeEnd}]`;
          const currDesc = `${TokenType[curr.type]}('${curr.value}') at ${curr.line}:${curr.startChar}-${curr.endLine}:${curr.endChar} [range ${curr.rangeStart}-${curr.rangeEnd}]`;
          throw new Error(
            `Overlapping tokens found:\n  ${prevDesc}\n  ${currDesc}\n  Overlap: prev.rangeEnd (${prev.rangeEnd}) > curr.rangeStart (${curr.rangeStart})`
          );
        }
      }
    });
  });

  test('synthetic: adjacent tokens have no gap overlap', () => {
    const source = 'x = 1 + 2';
    const tokens = collectTokens(source);
    const sorted = [...tokens].sort((a, b) => a.rangeStart - b.rangeStart);

    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].rangeEnd).toBeLessThanOrEqual(sorted[i].rangeStart);
    }
  });

  test('synthetic: multiline string does not overlap neighbours', () => {
    const source = 'a = "hello\nworld"\nb = 1';
    const tokens = collectTokens(source);
    const sorted = [...tokens].sort((a, b) => a.rangeStart - b.rangeStart);

    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].rangeEnd).toBeLessThanOrEqual(sorted[i].rangeStart);
    }
  });

  test('synthetic: comments do not overlap surrounding tokens', () => {
    const source = 'x = 1 // comment\ny = 2';
    const tokens = collectTokens(source);
    const sorted = [...tokens].sort((a, b) => a.rangeStart - b.rangeStart);

    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].rangeEnd).toBeLessThanOrEqual(sorted[i].rangeStart);
    }
  });

  test('synthetic: complex expression has no overlaps', () => {
    const source = [
      'if x > 0 then',
      '  y = [1, 2, 3]',
      '  z = {"a": 1, "b": 2}',
      '  print(y[0] + z["a"])',
      'end if'
    ].join('\n');

    const tokens = collectTokens(source);
    const sorted = [...tokens].sort((a, b) => a.rangeStart - b.rangeStart);

    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].rangeEnd).toBeLessThanOrEqual(sorted[i].rangeStart);
    }
  });

  test('synthetic: nested for/if with member access, slicing and string concat', () => {
    const source = [
      'for i in globals',
      '    if @i. value isa funcRef then',
      '        if not @i.key isa string then continue // Function names that are not strings are skipped.',
      '        if i.key[:7] == "__TEST__" and not globals.hasIndex(i.key[7:]) and i. key[7] != "_" then',
      '            zombie_tests += 1',
      '            print("<color=yellow>INFO: Test """+i.key+""" is a zombie test.</color>")',
      '        end if',
      '        if i.key[:7] == "__TEST_" then continue // Functions with the "__TEST_" prefix are skipped.',
      '        func_name = i.key',
      '    end if',
      'end for'
    ].join('\n');

    const tokens = collectTokens(source);
    const sorted = [...tokens].sort((a, b) => a.rangeStart - b.rangeStart);

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (prev.rangeEnd > curr.rangeStart) {
        const prevDesc = `${TokenType[prev.type]}('${prev.value}') [range ${prev.rangeStart}-${prev.rangeEnd}]`;
        const currDesc = `${TokenType[curr.type]}('${curr.value}') [range ${curr.rangeStart}-${curr.rangeEnd}]`;
        throw new Error(
          `Overlapping tokens:\n  ${prevDesc}\n  ${currDesc}`
        );
      }
    }
  });
});
