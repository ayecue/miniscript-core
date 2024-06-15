const { Parser, Lexer, ASTBase } = require('../dist');
const fs = require('fs');
const path = require('path');
const testFolder = path.resolve(__dirname, 'scripts');

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
          expect(payload.namespaces.length).toMatchSnapshot();
          expect(payload.literals.length).toMatchSnapshot();
          expect(payload.assignments.length).toMatchSnapshot();
        });
      });

    fs
      .readdirSync(testFolder)
      .forEach(file => {
        const filepath = path.resolve(testFolder, file);

        test(path.basename(filepath) + ' unsafe', () => {
          const content = fs.readFileSync(filepath, 'utf-8');
          const parser = new Parser(content, {
            tabWidth: 2,
            unsafe: true
          });
          const payload = parser.parseChunk().toString();

          expect(payload).toMatchSnapshot();
        });
      });

    test('invalid code', () => {
      const content = `
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
      const lexer = new Lexer(content, { unsafe: true, tabWidth: 2 });
      const parser = new Parser(content, {
        unsafe: true,
        lexer
      });

      parser.parseChunk();

      expect(lexer.errors).toMatchSnapshot();
      expect(parser.errors).toMatchSnapshot();
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
      const lexer = new Lexer(content, { unsafe: true, tabWidth: 2 });
      const parser = new Parser(content, {
        unsafe: true,
        lexer
      });

      parser.parseChunk();

      expect(lexer.errors).toMatchSnapshot();
      expect(parser.errors).toMatchSnapshot();
    });

    test('using repeat keyword', () => {
      const content = `
        repeat = function(foo)
          print(foo)
        end function
			`;
      const lexer = new Lexer(content, { unsafe: true, tabWidth: 2 });
      const parser = new Parser(content, {
        unsafe: true,
        lexer
      });

      parser.parseChunk();

      expect(lexer.errors).toMatchSnapshot();
      expect(parser.errors).toMatchSnapshot();
    });
  });
});