const { LineRegistry, LineRegistryView } = require('../dist');

/**
 * Helper: create a minimal object with startLine/endLine matching ASTBase's
 * shape. We don't use `new ASTBase(...)` because ts-transform-args converts
 * the options-object constructor to positional args in the compiled output.
 */
function item(startLine, endLine, label) {
  return { type: label || 'Test', startLine, startChar: 0, endLine, endChar: 0, rangeStart: 0, rangeEnd: 0 };
}

describe('LineRegistry', () => {
  test('register adds items', () => {
    const reg = new LineRegistry();
    const a = item(1, 5);
    const b = item(3, 7);
    reg.register(a);
    reg.register(b);
    expect(reg.items).toHaveLength(2);
    expect(reg.items).toContain(a);
    expect(reg.items).toContain(b);
  });

  test('build returns a LineRegistryView', () => {
    const reg = new LineRegistry();
    reg.register(item(1, 3));
    const view = reg.build();
    expect(view).toBeInstanceOf(LineRegistryView);
  });
});

describe('LineRegistryView', () => {
  describe('empty', () => {
    test('get returns empty array for any line', () => {
      const view = new LineRegistryView([]);
      expect(view.get(1)).toBeUndefined();
      expect(view.get(0)).toBeUndefined();
      expect(view.get(100)).toBeUndefined();
    });
  });

  describe('single item', () => {
    const a = item(3, 7, 'A');
    const view = new LineRegistryView([a]);

    test('returns item for lines within range', () => {
      for (let line = 3; line <= 7; line++) {
        const result = view.get(line);
        expect(result).toContain(a);
      }
    });

    test('returns empty array for lines before range', () => {
      expect(view.get(1)).toEqual([]);
      expect(view.get(2)).toEqual([]);
    });

    test('returns undefined for lines beyond tree range', () => {
      expect(view.get(8)).toBeUndefined();
      expect(view.get(100)).toBeUndefined();
    });

    test('returns undefined for line 0', () => {
      expect(view.get(0)).toBeUndefined();
    });
  });

  describe('single-line items', () => {
    const a = item(5, 5, 'A');
    const b = item(10, 10, 'B');
    const view = new LineRegistryView([a, b]);

    test('returns correct item for exact line', () => {
      expect(view.get(5)).toContain(a);
      expect(view.get(10)).toContain(b);
    });

    test('returns empty array for other lines', () => {
      expect(view.get(4)).toEqual([]);
      expect(view.get(6)).toEqual([]);
      expect(view.get(9)).toEqual([]);
      expect(view.get(11)).toEqual([]);
    });
  });

  describe('overlapping intervals', () => {
    const a = item(1, 10, 'A');
    const b = item(3, 7, 'B');
    const c = item(5, 15, 'C');
    const view = new LineRegistryView([a, b, c]);

    test('returns all overlapping items for a line', () => {
      // Line 5 is covered by all three
      const result = view.get(5);
      expect(result).toContain(a);
      expect(result).toContain(b);
      expect(result).toContain(c);
      expect(result).toHaveLength(3);
    });

    test('line 1 only has A', () => {
      const result = view.get(1);
      expect(result).toEqual([a]);
    });

    test('line 2 only has A', () => {
      const result = view.get(2);
      expect(result).toEqual([a]);
    });

    test('line 3 has A and B', () => {
      const result = view.get(3);
      expect(result).toContain(a);
      expect(result).toContain(b);
      expect(result).toHaveLength(2);
    });

    test('line 8 has A and C', () => {
      const result = view.get(8);
      expect(result).toContain(a);
      expect(result).toContain(c);
      expect(result).toHaveLength(2);
    });

    test('line 11 only has C', () => {
      const result = view.get(11);
      expect(result).toEqual([c]);
    });

    test('line 15 only has C', () => {
      const result = view.get(15);
      expect(result).toEqual([c]);
    });

    test('line 16 returns undefined (beyond tree range)', () => {
      expect(view.get(16)).toBeUndefined();
    });
  });

  describe('nested intervals', () => {
    const outer = item(1, 20, 'outer');
    const mid = item(5, 15, 'mid');
    const inner = item(8, 12, 'inner');
    const view = new LineRegistryView([outer, mid, inner]);

    test('line 1 only has outer', () => {
      expect(view.get(1)).toEqual([outer]);
    });

    test('line 5 has outer and mid', () => {
      const r = view.get(5);
      expect(r).toContain(outer);
      expect(r).toContain(mid);
      expect(r).toHaveLength(2);
    });

    test('line 10 has all three', () => {
      const r = view.get(10);
      expect(r).toContain(outer);
      expect(r).toContain(mid);
      expect(r).toContain(inner);
      expect(r).toHaveLength(3);
    });

    test('line 16 only has outer', () => {
      expect(view.get(16)).toEqual([outer]);
    });
  });

  describe('adjacent non-overlapping intervals', () => {
    const a = item(1, 3, 'A');
    const b = item(4, 6, 'B');
    const c = item(7, 9, 'C');
    const view = new LineRegistryView([a, b, c]);

    test('each line maps to exactly one item', () => {
      expect(view.get(1)).toEqual([a]);
      expect(view.get(2)).toEqual([a]);
      expect(view.get(3)).toEqual([a]);
      expect(view.get(4)).toEqual([b]);
      expect(view.get(5)).toEqual([b]);
      expect(view.get(6)).toEqual([b]);
      expect(view.get(7)).toEqual([c]);
      expect(view.get(8)).toEqual([c]);
      expect(view.get(9)).toEqual([c]);
    });

    test('line 10 returns empty array', () => {
      expect(view.get(10)).toEqual([]);
    });
  });

  describe('touching intervals (shared boundary)', () => {
    const a = item(1, 5, 'A');
    const b = item(5, 10, 'B');
    const view = new LineRegistryView([a, b]);

    test('shared line 5 returns both', () => {
      const r = view.get(5);
      expect(r).toContain(a);
      expect(r).toContain(b);
      expect(r).toHaveLength(2);
    });
  });

  describe('many items stress test', () => {
    const items = [];
    for (let i = 1; i <= 100; i++) {
      items.push(item(i, i + 10, `item${i}`));
    }
    const view = new LineRegistryView(items);

    test('line 50 contains expected items', () => {
      const result = view.get(50);
      // Items covering line 50: startLine <= 50 && endLine >= 50
      // startLine range: [1..100], endLine = startLine + 10
      // startLine <= 50 && startLine + 10 >= 50 → startLine >= 40
      // So items 40..50 (11 items)
      const expected = items.filter(
        (it) => it.startLine <= 50 && it.endLine >= 50
      );
      expect(result).toHaveLength(expected.length);
      for (const e of expected) {
        expect(result).toContain(e);
      }
    });

    test('line 1 contains only the first item', () => {
      expect(view.get(1)).toEqual([items[0]]);
    });

    test('line 111 returns empty array (beyond all endLines)', () => {
      expect(view.get(111)).toEqual([]);
    });
  });

  describe('matches real parser usage', () => {
    test('parsed chunk lines.get works', () => {
      const { Parser } = require('../dist');
      const code = [
        'x = 1',
        'if x > 0 then',
        '  y = 2',
        '  z = 3',
        'end if',
        'w = 4'
      ].join('\n');

      const parser = new Parser(code);
      const chunk = parser.parseChunk();

      // Line 2 (the if statement) should be findable
      const line2 = chunk.lines.get(2);
      expect(line2).toBeDefined();
      expect(line2.length).toBeGreaterThan(0);

      // Line 1 should have the assignment
      const line1 = chunk.lines.get(1);
      expect(line1).toBeDefined();
      expect(line1.length).toBeGreaterThan(0);
    });
  });
});
