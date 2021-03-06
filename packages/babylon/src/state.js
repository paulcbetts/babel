import { reservedWords, keywords } from "./identifier";
import { types as tt } from "./tokentype";
import { lineBreak } from "./whitespace";

export function Parser(options, input, startPos) {
  this.options = options;
  this.isKeyword = keywords[6];
  this.isReservedWord = reservedWords[6];
  this.input = input;
  this.loadPlugins(this.options.plugins);

  // Set up token state

  // The current position of the tokenizer in the input.
  if (startPos) {
    this.pos = startPos;
    this.lineStart = Math.max(0, this.input.lastIndexOf("\n", startPos));
    this.curLine = this.input.slice(0, this.lineStart).split(lineBreak).length;
  } else {
    this.pos = this.lineStart = 0;
    this.curLine = 1;
  }

  // Properties of the current token:
  // Its type
  this.type = tt.eof;
  // For tokens that include more information than their type, the value
  this.value = null;
  // Its start and end offset
  this.start = this.end = this.pos;
  // And, if locations are used, the {line, column} object
  // corresponding to those offsets
  this.startLoc = this.endLoc = this.curPosition();

  // Position information for the previous token
  this.lastTokEndLoc = this.lastTokStartLoc = null;
  this.lastTokStart = this.lastTokEnd = this.pos;

  // The context stack is used to superficially track syntactic
  // context to predict whether a regular expression is allowed in a
  // given position.
  this.context = this.initialContext();
  this.exprAllowed = true;

  // Figure out if it's a module code.
  this.inModule = this.options.sourceType === "module";
  this.strict = this.options.strictMode === false ? false : this.inModule;

  // Used to signify the start of a potential arrow function
  this.potentialArrowAt = -1;

  // Flags to track whether we are in a function, a generator.
  this.inFunction = this.inGenerator = false;
  // Labels in scope.
  this.labels = [];

  // Leading decorators.
  this.decorators = [];

  // Token store.
  this.tokens = [];

  // Comment store.
  this.comments = [];

  // Comment attachment store
  this.trailingComments = [];
  this.leadingComments = [];
  this.bottomRightStack = [];

  // If enabled, skip leading hashbang line.
  if (this.pos === 0 && this.input[0] === "#" && this.input[1] === "!") {
    this.skipLineComment(2);
  }
}

Parser.prototype.extend = function (name, f) {
  this[name] = f(this[name]);
};

// Registered plugins

export const plugins = {};

Parser.prototype.loadPlugins = function (plugins) {
  for (let name in plugins) {
    let plugin = exports.plugins[name];
    if (!plugin) throw new Error(`Plugin '${name}' not found`);
    plugin(this, plugins[name]);
  }
};

Parser.prototype.parse = function () {
  let file = this.startNode();
  let program = this.startNode();
  this.nextToken();
  return this.parseTopLevel(file, program);
};
