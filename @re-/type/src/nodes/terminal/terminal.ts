import { Base } from "../base/index.js"
import { ErrorToken, Expression, Lexer } from "../parser/index.js"
import { Lex } from "../parser/lex.js"
import { AliasNode, AliasType } from "./alias.js"
import { Keyword } from "./keyword/index.js"
import {
    BigintLiteralNode,
    InferLiteral,
    LiteralDefinition,
    NumberLiteralNode,
    RegexLiteralDefinition,
    regexLiteralToNode,
    StringLiteralDefinition,
    StringLiteralNode
} from "./literal/index.js"

export namespace Terminal {
    export type IsResolvableName<Def, Dict> = Def extends Keyword.Definition
        ? true
        : Def extends keyof Dict
        ? true
        : false

    export type Parse<S extends Expression.T.State, Dict> = Expression.T.From<{
        tree: Reduce<S["tree"], S["scanner"]["lookahead"], Dict>
        scanner: Lex.ShiftToken<S["scanner"]["unscanned"]>
    }>

    export type Reduce<
        Tree extends Expression.T.Tree,
        Token,
        Dict
    > = IsResolvableName<Token, Dict> extends true
        ? Expression.T.SetRoot<Tree, Token>
        : Token extends LiteralDefinition
        ? Expression.T.SetRoot<Tree, Token>
        : Token extends ErrorToken<string>
        ? Expression.T.SetRoot<Tree, Token>
        : Expression.T.SetRoot<
              Tree,
              ErrorToken<`'${Token &
                  string}' is not a builtin type and does not exist in your space.`>
          >

    export const parse = (s: Expression.State, ctx: Base.Parsing.Context) => {
        if (Keyword.matches(s.scanner.lookahead)) {
            s.root = Keyword.parse(s.scanner.lookahead)
        } else if (AliasNode.matches(s.scanner.lookahead, ctx)) {
            s.root = new AliasNode(s.scanner.lookahead, ctx)
            /**
             * The Lexer is responsible for validating EnclosedLiterals.
             * As long as the first character is <'><"> or </>,
             * we are assuming the rest of the token is of the expected literal type.
             **/
        } else if (
            s.scanner.lookahead[0] === `'` ||
            s.scanner.lookahead[0] === `"`
        ) {
            s.root = new StringLiteralNode(
                s.scanner.lookahead as StringLiteralDefinition
            )
        } else if (s.scanner.lookahead[0] === `/`) {
            s.root = regexLiteralToNode(
                s.scanner.lookahead as RegexLiteralDefinition
            )
        } else if (NumberLiteralNode.matches(s.scanner.lookahead)) {
            s.root = new NumberLiteralNode(s.scanner.lookahead)
        } else if (BigintLiteralNode.matches(s.scanner.lookahead)) {
            s.root = new BigintLiteralNode(s.scanner.lookahead)
        } else if (s.scanner.lookahead === "") {
            throw new Error("Expected an expression.")
        } else {
            throw new Error(
                `'${s.scanner.lookahead}' is not a builtin type and does not exist in your space.`
            )
        }
        Lexer.shiftOperator(s.scanner)
    }
}

export type InferTerminalStr<
    Token extends string,
    Ctx extends Base.Parsing.InferenceContext
> = Token extends Keyword.Definition
    ? Keyword.Types[Token]
    : Token extends keyof Ctx["dict"]
    ? AliasType.Infer<Token, Ctx>
    : InferLiteral<Token>
