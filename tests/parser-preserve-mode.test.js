const { Parser, UnsafeParser, UnsafeLexer, ASTType } = require('../dist');

describe('preserve mode', function () {
  test('leading comments are attached to following statement', () => {
    const content = `// header comment\nx = 1`;
    const parser = new Parser(content, { preserve: true });
    const chunk = parser.parseChunk();
    // body[0] is a NoopStatement (for EOL after comment), body[1] is the assignment
    const assignment = chunk.body.find(n => n.type === ASTType.AssignmentStatement);

    expect(assignment.leadingComments).toBeDefined();
    expect(assignment.leadingComments.length).toBe(1);
    expect(assignment.leadingComments[0]).toBe(' header comment');
  });

  test('trailing comments are attached to preceding statement', () => {
    const content = `x = 1 // trailing comment\ny = 2`;
    const parser = new Parser(content, { preserve: true });
    const chunk = parser.parseChunk();
    const firstStatement = chunk.body[0];

    expect(firstStatement.trailingComments).toBeDefined();
    expect(firstStatement.trailingComments.length).toBe(1);
    expect(firstStatement.trailingComments[0]).toBe(' trailing comment');
  });

  test('multiple leading comments stack up', () => {
    const content = `// comment one\n// comment two\n// comment three\nx = 1`;
    const parser = new Parser(content, { preserve: true });
    const chunk = parser.parseChunk();
    const assignment = chunk.body.find(n => n.type === ASTType.AssignmentStatement);

    expect(assignment.leadingComments).toBeDefined();
    expect(assignment.leadingComments.length).toBe(3);
  });

  test('empty lines produce NoopStatement nodes', () => {
    const content = `x = 1\n\ny = 2`;
    const parser = new Parser(content, { preserve: true });
    const chunk = parser.parseChunk();

    const noopNodes = chunk.body.filter(n => n.type === ASTType.NoopStatement);
    expect(noopNodes.length).toBeGreaterThanOrEqual(1);
  });

  test('comments are not attached without preserve mode', () => {
    const content = `// a comment\nx = 1`;
    const parser = new Parser(content, { preserve: false });
    const chunk = parser.parseChunk();

    const hasLeadingComments = chunk.body.some(n => n.leadingComments);
    expect(hasLeadingComments).toBe(false);
  });

  test('comment inside if block is preserved', () => {
    const content = `if true then\n  // inner comment\n  x = 1\nend if`;
    const parser = new Parser(content, { preserve: true });
    const chunk = parser.parseChunk();
    const ifStatement = chunk.body.find(n => n.type === ASTType.IfStatement);
    // if statements have clauses, each clause has a body
    const clauseBody = ifStatement.clauses[0].body;

    const hasComment = clauseBody.some(s =>
      s.leadingComments && s.leadingComments.length > 0
    );
    expect(hasComment).toBe(true);
  });

  test('comment at top of file before any statement', () => {
    const content = `// file header\n// second line\n\nprint("hello")`;
    const parser = new Parser(content, { preserve: true });
    const chunk = parser.parseChunk();
    const printStmt = chunk.body.find(n =>
      n.type !== ASTType.NoopStatement && n.type !== ASTType.AssignmentStatement
    );

    expect(printStmt).toBeDefined();
    expect(printStmt.leadingComments).toBeDefined();
    expect(printStmt.leadingComments.length).toBe(2);
  });

  test('comments are tracked in state.comments', () => {
    const content = `// comment one\nx = 1\n// comment two\ny = 2`;
    const parser = new Parser(content, { preserve: true });
    parser.parseChunk();

    expect(parser.state.comments.length).toBe(2);
    expect(parser.state.comments[0].value).toBe(' comment one');
    expect(parser.state.comments[1].value).toBe(' comment two');
  });
});
