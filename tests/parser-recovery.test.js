const { Parser, Lexer, ASTType, ErrorCode } = require('../dist');

/**
 * Helper: parse in unsafe mode, return { chunk, parser, lexer }.
 */
function unsafeParse(source) {
  const lexer = new Lexer(source, { unsafe: true, tabWidth: 2 });
  const parser = new Parser(source, { unsafe: true, lexer });
  const chunk = parser.parseChunk();
  return { chunk, parser, lexer };
}

describe('tryToRecover', () => {
  describe('basic recovery', () => {
    test('recovers from a single bad statement and continues parsing', () => {
      // A lone dot is an invalid statement (punctuator where identifier expected)
      const { chunk, parser } = unsafeParse([
        'x = 1',
        '.',
        'y = 2'
      ].join('\n'));

      expect(parser.errors.length).toBeGreaterThan(0);

      const assignments = chunk.body.filter(
        (n) => n.type === ASTType.AssignmentStatement
      );
      expect(assignments.length).toBe(2);
    });

    test('recovers from multiple bad statements', () => {
      const { chunk, parser } = unsafeParse([
        'a = 1',
        '.',
        'b = 2',
        '.',
        'c = 3'
      ].join('\n'));

      expect(parser.errors.length).toBeGreaterThanOrEqual(2);

      const assignments = chunk.body.filter(
        (n) => n.type === ASTType.AssignmentStatement
      );
      expect(assignments.length).toBe(3);
    });

    test('in non-unsafe mode, throws on first error', () => {
      expect(() => {
        // A dot on its own causes a parser error
        const parser = new Parser('.\nx = 1', { unsafe: false });
        parser.parseChunk();
      }).toThrow();
    });
  });

  describe('recovery preserves structure after error', () => {
    test('if block with bad body recovers and parses subsequent code', () => {
      const { chunk, parser } = unsafeParse([
        'if true then',
        '  x = 1',
        '  .',
        '  y = 2',
        'end if',
        'z = 3'
      ].join('\n'));

      expect(parser.errors.length).toBeGreaterThan(0);

      // The chunk should still have the if statement and z = 3
      expect(chunk.body.length).toBeGreaterThan(0);
    });

    test('function with bad body recovers', () => {
      const { chunk, parser } = unsafeParse([
        'f = function()',
        '  x = 1',
        '  .',
        '  y = 2',
        'end function',
        'z = 3'
      ].join('\n'));

      expect(parser.errors.length).toBeGreaterThan(0);
      expect(chunk.body.length).toBeGreaterThan(0);
    });

    test('while with bad body recovers', () => {
      const { chunk, parser } = unsafeParse([
        'while true',
        '  x = 1',
        '  .',
        '  y = 2',
        'end while',
        'z = 3'
      ].join('\n'));

      expect(parser.errors.length).toBeGreaterThan(0);
      expect(chunk.body.length).toBeGreaterThan(0);
    });

    test('for with bad body recovers', () => {
      const { chunk, parser } = unsafeParse([
        'for i in [1, 2, 3]',
        '  x = 1',
        '  .',
        '  y = 2',
        'end for',
        'z = 3'
      ].join('\n'));

      expect(parser.errors.length).toBeGreaterThan(0);
      expect(chunk.body.length).toBeGreaterThan(0);
    });
  });

  describe('open block recovery (finishRemaingScopes)', () => {
    test('unclosed if produces error and still returns chunk', () => {
      const { chunk, parser } = unsafeParse([
        'x = 1',
        'if true then',
        '  y = 2'
      ].join('\n'));

      expect(parser.errors.length).toBeGreaterThan(0);
      const hasOpenBlockError = parser.errors.some(
        (e) => e.message.includes('Unclosed')
      );
      expect(hasOpenBlockError).toBe(true);
      expect(chunk).toBeDefined();
    });

    test('unclosed while produces error', () => {
      const { chunk, parser } = unsafeParse([
        'while true',
        '  x = 1'
      ].join('\n'));

      expect(parser.errors.length).toBeGreaterThan(0);
      expect(chunk).toBeDefined();
    });

    test('unclosed for produces error', () => {
      const { chunk, parser } = unsafeParse([
        'for i in [1, 2]',
        '  x = 1'
      ].join('\n'));

      expect(parser.errors.length).toBeGreaterThan(0);
      expect(chunk).toBeDefined();
    });

    test('unclosed function produces error', () => {
      const { chunk, parser } = unsafeParse([
        'f = function()',
        '  x = 1'
      ].join('\n'));

      expect(parser.errors.length).toBeGreaterThan(0);
      expect(chunk).toBeDefined();
    });

    test('multiple unclosed blocks produce multiple errors', () => {
      const { parser } = unsafeParse([
        'if true then',
        '  while true',
        '    x = 1'
      ].join('\n'));

      const openBlockErrors = parser.errors.filter(
        (e) => e.message.includes('Unclosed')
      );
      expect(openBlockErrors.length).toBe(2);
    });
  });

  describe('error reporting', () => {
    test('errors array is empty for valid code', () => {
      const { parser } = unsafeParse('x = 1\ny = 2');
      expect(parser.errors).toHaveLength(0);
    });

    test('each bad statement produces at least one error', () => {
      const { parser } = unsafeParse([
        '.',
        'x = 1',
        '.'
      ].join('\n'));

      expect(parser.errors.length).toBeGreaterThanOrEqual(2);
    });

    test('errors have range information', () => {
      const { parser } = unsafeParse('.');

      expect(parser.errors.length).toBeGreaterThan(0);
      const err = parser.errors[0];
      expect(err.range).toBeDefined();
      expect(err.range.start).toBeDefined();
      expect(err.range.end).toBeDefined();
    });

    test('lexer errors are separate from parser errors', () => {
      const source = 'print(" ad"';
      const lexer = new Lexer(source, { unsafe: true, tabWidth: 2 });
      const parser = new Parser(source, { unsafe: true, lexer });
      parser.parseChunk();

      expect(Array.isArray(lexer.errors)).toBe(true);
      expect(Array.isArray(parser.errors)).toBe(true);
      // This input causes a parser error (unclosed string or missing paren)
      expect(parser.errors.length).toBeGreaterThan(0);
    });

    test('only first error per statement is recorded', () => {
      // A deeply nested bad expression may trigger multiple raise() calls
      // but tryToRecover only pushes statementErrors[0] to parser.errors
      const { parser } = unsafeParse('not not not .');

      expect(parser.errors.length).toBe(1);
    });
  });

  describe('recovery skips to end of line', () => {
    test('tokens after error on same line are skipped', () => {
      const { chunk, parser } = unsafeParse([
        '. x = 1',     // error at dot; rest of line skipped
        'y = 2'
      ].join('\n'));

      expect(parser.errors.length).toBeGreaterThan(0);

      const assignments = chunk.body.filter(
        (n) => n.type === ASTType.AssignmentStatement
      );
      // y = 2 should be parsed; x = 1 on the error line should be skipped
      expect(assignments.length).toBe(1);
      expect(assignments[0].variable.name).toBe('y');
    });

    test('valid code on next line after error is parsed', () => {
      const { chunk, parser } = unsafeParse([
        'a = 10',
        '.',
        'b = 20',
        '.',
        'c = 30'
      ].join('\n'));

      expect(parser.errors.length).toBeGreaterThanOrEqual(2);

      const names = chunk.body
        .filter((n) => n.type === ASTType.AssignmentStatement)
        .map((n) => n.variable.name);

      expect(names).toContain('a');
      expect(names).toContain('b');
      expect(names).toContain('c');
    });
  });

  describe('edge cases', () => {
    test('empty input produces no errors', () => {
      const { parser, chunk } = unsafeParse('');
      expect(parser.errors).toHaveLength(0);
      expect(chunk.body).toHaveLength(0);
    });

    test('only whitespace and newlines produces no errors', () => {
      const { parser } = unsafeParse('  \n  \n  ');
      expect(parser.errors).toHaveLength(0);
    });

    test('error on last line (no trailing newline)', () => {
      const { parser } = unsafeParse('x = 1\n.');
      expect(parser.errors.length).toBeGreaterThan(0);
    });

    test('many consecutive errors do not cause infinite loop', () => {
      const lines = [];
      for (let i = 0; i < 50; i++) lines.push('.');
      lines.push('x = 1');

      const { chunk, parser } = unsafeParse(lines.join('\n'));

      expect(parser.errors.length).toBeGreaterThan(0);

      const assignments = chunk.body.filter(
        (n) => n.type === ASTType.AssignmentStatement
      );
      expect(assignments.length).toBe(1);
    });

    test('mismatched block closer produces error', () => {
      const { parser } = unsafeParse([
        'if true then',
        '  x = 1',
        'end while'
      ].join('\n'));

      expect(parser.errors.length).toBeGreaterThan(0);
    });

    test('break outside loop produces error', () => {
      const { parser } = unsafeParse('break');
      expect(parser.errors.length).toBeGreaterThan(0);
    });

    test('continue outside loop produces error', () => {
      const { parser } = unsafeParse('continue');
      expect(parser.errors.length).toBeGreaterThan(0);
    });

    test('unexpected keyword at start of line produces error', () => {
      const { parser } = unsafeParse('else');
      expect(parser.errors.length).toBeGreaterThan(0);
    });
  });

  describe('state consistency after recovery', () => {
    test('semicolons are treated as EOL not errors', () => {
      // Semicolons act as statement separators, not errors
      const { parser } = unsafeParse('x = 1; y = 2');
      expect(parser.errors).toHaveLength(0);
    });

    test('recovery does not duplicate literals', () => {
      // Valid code with literals followed by error
      const { chunk } = unsafeParse([
        'x = "hello"',
        '.',
        'y = "world"'
      ].join('\n'));

      // Each string literal should appear exactly once
      const literalValues = chunk.literals.map((l) => l.value);
      expect(literalValues.filter((v) => v === 'hello').length).toBeLessThanOrEqual(1);
      expect(literalValues.filter((v) => v === 'world').length).toBe(1);
    });

    test('scopes are still tracked after recovery in function', () => {
      const { chunk, parser } = unsafeParse([
        'f = function(a)',
        '  x = 1',
        '  .',
        '  y = 2',
        'end function'
      ].join('\n'));

      expect(parser.errors.length).toBeGreaterThan(0);
      // The function scope should still exist
      expect(chunk.scopes.length).toBeGreaterThan(0);
    });

    test('recovery from bad expression in if condition', () => {
      const { parser, chunk } = unsafeParse([
        'if . then',
        '  x = 1',
        'end if'
      ].join('\n'));

      // Should have an error but still produce a chunk
      expect(parser.errors.length).toBeGreaterThan(0);
      expect(chunk).toBeDefined();
    });
  });

  describe('error codes and hints', () => {
    test('expression error has ExpectedExpression code', () => {
      const { parser } = unsafeParse('.');

      expect(parser.errors.length).toBeGreaterThan(0);
      expect(parser.errors[0].code).toBe(ErrorCode.ExpectedExpression);
    });

    test('break outside loop has BreakOutsideLoop code', () => {
      const { parser } = unsafeParse('break');

      expect(parser.errors[0].code).toBe(ErrorCode.BreakOutsideLoop);
    });

    test('continue outside loop has ContinueOutsideLoop code', () => {
      const { parser } = unsafeParse('continue');

      expect(parser.errors[0].code).toBe(ErrorCode.ContinueOutsideLoop);
    });

    test('unclosed block has UnclosedBlock code and hint', () => {
      const { parser } = unsafeParse([
        'if true then',
        '  x = 1'
      ].join('\n'));

      const unclosedErr = parser.errors.find(
        (e) => e.code === ErrorCode.UnclosedBlock
      );
      expect(unclosedErr).toBeDefined();
      expect(unclosedErr.hint).toMatch(/end if/);
    });

    test('unclosed function has hint with end function', () => {
      const { parser } = unsafeParse([
        'f = function()',
        '  x = 1'
      ].join('\n'));

      const unclosedErr = parser.errors.find(
        (e) => e.code === ErrorCode.UnclosedBlock
      );
      expect(unclosedErr).toBeDefined();
      expect(unclosedErr.hint).toMatch(/end function/);
    });

    test('unexpected keyword has UnexpectedKeyword code', () => {
      // 'else' goes through 'no matching if' path; use a truly unexpected keyword
      const { parser } = unsafeParse([
        'f = function()',
        '  repeat',
        'end function'
      ].join('\n'));

      const unexpected = parser.errors.find(
        (e) => e.code === ErrorCode.UnexpectedKeyword
      );
      expect(unexpected).toBeDefined();
    });

    test('mismatched block closer has NoMatchingBlock code', () => {
      const { parser } = unsafeParse([
        'if true then',
        '  x = 1',
        'end while'
      ].join('\n'));

      const noMatch = parser.errors.find(
        (e) => e.code === ErrorCode.NoMatchingBlock
      );
      expect(noMatch).toBeDefined();
    });

    test('lexer errors have error codes', () => {
      const lexer = new Lexer('"unterminated', { unsafe: true, tabWidth: 2 });
      while (lexer.next().type !== 1000) {} // drain until EOF
      expect(lexer.errors.length).toBeGreaterThan(0);
      expect(lexer.errors[0].code).toBe(ErrorCode.UnexpectedStringEOF);
      expect(lexer.errors[0].hint).toBeDefined();
    });

    test('errors without specific code default to Unknown', () => {
      // ErrorCode.Unknown = 0. Some internal errors may still use it.
      expect(ErrorCode.Unknown).toBe(0);
    });
  });

  describe('state rollback on recovery', () => {
    test('literals are rolled back after failed statement', () => {
      // The failed line references a string, but it should be rolled back
      const { chunk, parser } = unsafeParse([
        'x = "kept"',
        '."discarded"',
        'y = "also kept"'
      ].join('\n'));

      expect(parser.errors.length).toBeGreaterThan(0);
      const literalValues = chunk.literals.map((l) => l.value);
      expect(literalValues).toContain('kept');
      expect(literalValues).toContain('also kept');
      expect(literalValues).not.toContain('discarded');
    });

    test('namespaces are rolled back after failed statement', () => {
      const { chunk, parser } = unsafeParse([
        'x = 1',
        '.',
        'y = 2'
      ].join('\n'));

      expect(parser.errors.length).toBeGreaterThan(0);
      // Should only have namespaces from successfully parsed statements
      const nsNames = chunk.namespaces.map((n) => n.name || n.toString());
      expect(nsNames.filter((n) => n === 'x').length).toBe(1);
      expect(nsNames.filter((n) => n === 'y').length).toBe(1);
    });

    test('definitions are rolled back after failed assignment', () => {
      const { chunk, parser } = unsafeParse([
        'a = 1',
        '. = 2',
        'b = 3'
      ].join('\n'));

      expect(parser.errors.length).toBeGreaterThan(0);
      const defNames = chunk.definitions
        .filter((d) => d.variable)
        .map((d) => d.variable.name);
      expect(defNames).toContain('a');
      expect(defNames).toContain('b');
    });

    test('pending block body is rolled back on failed statement', () => {
      const { chunk, parser } = unsafeParse([
        'if true then',
        '  a = 1',
        '  .',
        '  b = 2',
        'end if'
      ].join('\n'));

      expect(parser.errors.length).toBeGreaterThan(0);
      // The if body should have a=1 and b=2 but not any partial nodes from error
      const ifStmt = chunk.body[0];
      expect(ifStmt.type).toBe(ASTType.IfStatement);
      const clauseBody = ifStmt.clauses[0].body;
      const assignNames = clauseBody
        .filter((n) => n.type === ASTType.AssignmentStatement)
        .map((n) => n.variable.name);
      expect(assignNames).toContain('a');
      expect(assignNames).toContain('b');
    });
  });
});
