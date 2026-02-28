const { Lexer, UnsafeLexer } = require('../dist');
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

describe('parse', function() {
	describe('default scripts', function() {
		fs
			.readdirSync(testFolder)
			.forEach(file => {
				const filepath = path.resolve(testFolder, file);

				test(path.basename(filepath), () => {
					const content = fs.readFileSync(filepath, 'utf-8');
					const lexer = new UnsafeLexer(content, {
						tabWidth: 4
					});
					let token = lexer.next();
					const payload = [];

					while (token.value !== '<eof>') {
						payload.push(token.toString());
						token = lexer.next();
					}

					expect(payload.join('\n')).toMatchSnapshot();
				});
			});

		test('invalid code', () => {
			const content = `
				print(" ad"

				print())

				print("was")

				function () .
				end func

				print("wo")
			`;
			const lexer = new UnsafeLexer(content);

			while (lexer.next().value !== '<eof>') {}

			expect(describeErrors(lexer.errors)).toMatchSnapshot();
		});
	});
});