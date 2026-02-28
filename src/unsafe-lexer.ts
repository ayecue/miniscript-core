import Lexer from './lexer';
import UnsafeLexerMixin from './unsafe-lexer-mixin';

const UnsafeLexer = UnsafeLexerMixin(Lexer);
type UnsafeLexer = InstanceType<typeof UnsafeLexer>;
export default UnsafeLexer;
