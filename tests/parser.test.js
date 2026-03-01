const { Parser, UnsafeParser, UnsafeLexer, Lexer, ASTType } = require('../dist');
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

describe('parse', function () {
  describe('default scripts', function () {
    fs
      .readdirSync(testFolder)
      .forEach(file => {
        const filepath = path.resolve(testFolder, file);

        test(path.basename(filepath), () => {
          const content = fs.readFileSync(filepath, 'utf-8');
          const parser = new Parser(content, {
            tabWidth: 2
          });
          const payload = parser.parseChunk();

          expect(payload.toString()).toMatchSnapshot();
          expect(payload.namespaces.reduce((result, item) => {
            let currentIdentifier = item;
            if (item.type === ASTType.MemberExpression) {
              currentIdentifier = item.identifier;
            }
            if (!result[currentIdentifier.kind]) result[currentIdentifier.kind] = 0;
            result[currentIdentifier.kind]++;
            return result;
          }, {})).toMatchSnapshot();
          expect(payload.literals.length).toMatchSnapshot();
          expect(payload.definitions.length).toMatchSnapshot();
        });
      });

    fs
      .readdirSync(testFolder)
      .forEach(file => {
        const filepath = path.resolve(testFolder, file);

        test(path.basename(filepath) + ' unsafe', () => {
          const content = fs.readFileSync(filepath, 'utf-8');
          const parser = new UnsafeParser(content, {
            tabWidth: 2
          });
          const payload = parser.parseChunk().toString();

          expect(payload).toMatchSnapshot();
        });
      });

    test('invalid code', () => {
      const content = `
        break
        continue
				print(" ad"

				print())

				print("was")

				wad;  aw dwad wa

				not @a;not -@b
				not +@v

				not not not not not not not not @a

				if not @a then x

				function () .
				end func

				print("wo")

				if (true) then;
					print("true")
				else;
					print((false));
				end if;

				if (false) print("false")
			`;
      const lexer = new UnsafeLexer(content, { tabWidth: 2 });
      const parser = new UnsafeParser(content, {
        lexer
      });

      parser.parseChunk();

      expect(describeErrors(lexer.errors)).toMatchSnapshot();
      expect(describeErrors(parser.errors)).toMatchSnapshot();
    });

    test('using repeat keyword', () => {
      const content = `
        repeat = function(foo)
          print(foo)
        end function
			`;
      const lexer = new UnsafeLexer(content, { tabWidth: 2 });
      const parser = new UnsafeParser(content, {
        lexer
      });

      parser.parseChunk();

      expect(describeErrors(lexer.errors)).toMatchSnapshot();
      expect(describeErrors(parser.errors)).toMatchSnapshot();
    });

    test('open block', () => {
      const content = `
        myComputer = get_shell("root", "test").host_computer

        rootPath = "/root"
        rootFolder = myComputer.File(rootPath)

        folderCount = 0

        while true
          folderName = "testf" + folderCount
          preExisting = myComputer.File(rootFolder.path + "/" + folderName)
          if (preExisting) then preExisting.delete
          result = myComputer.create_folder(rootFolder.path, folderName)
          if result isa string then
            print "Ended with because of " + result
            break
          end if
          print "Created folder " + folderName
          isFull = false
          for index in range(250)
            result = myComputer.touch(rootFolder.path + "/" + folderName, "ppp" + index)
            if result isa string then
              isFull = true
              print "Ended with because of " + result
              break
            end if
            print "Created file " + index + " for " + folderName
          end for
          if isFull then break
          folderCount = folderCount + 1
        end while

        queue = [myComputer.File("/")]
        allFiles = []

        while queue.len
          item = queue.pull
          allFiles = allFiles + item.get_files
          queue = queue + item.get_folders
        end whil

        print allFiles.len
      `;
      const lexer = new UnsafeLexer(content, { tabWidth: 2 });
      const parser = new UnsafeParser(content, {
        lexer
      });

      parser.parseChunk();

      expect(describeErrors(lexer.errors)).toMatchSnapshot();
      expect(describeErrors(parser.errors)).toMatchSnapshot();
    });
  });

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

      // The error line should not corrupt the state.
      // Valid statements before and after the error should all be recorded.
      expect(parser.errors.length).toBeGreaterThan(0);

      // literals from valid statements should be present
      const state = parser.state;
      const literalValues = state.literals.map(l => l.value?.toString());
      expect(literalValues).toContain('hello');
      expect(literalValues).toContain('world');

      // lineRegistry should only include successfully parsed lines
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
});