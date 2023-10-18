const { Parser, Lexer, ASTBase } = require('../dist');
const fs = require('fs');
const path = require('path');
const testFolder = path.resolve(__dirname, 'scripts');

describe('parse', function() {
	describe('default scripts', function() {
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
	});
});