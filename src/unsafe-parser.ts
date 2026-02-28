import UnsafeLexer from './unsafe-lexer';
import Parser, { ParserOptions } from './parser';
import UnsafeParserMixin from './unsafe-parser-mixin';

const UnsafeParserBase = UnsafeParserMixin(Parser);

export default class UnsafeParser extends UnsafeParserBase {
  declare lexer: UnsafeLexer;

  constructor(content: string, options: ParserOptions = {}) {
    const lexer = (options.lexer as UnsafeLexer) || new UnsafeLexer(content, {
      tabWidth: options.tabWidth
    });
    super(content, { ...options, lexer });
  }
}
