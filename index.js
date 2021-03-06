'use strict';

/**
 * Sets the `start` position and returns a function for setting
 * the `end` position on a token.
 *
 * ```js
 * const position = require('snapdragon-position');
 * const Lexer = require('snapdragon-lexer');
 * const lexer = new Lexer('foo/bar');
 *
 * lexer.capture('slash', /^\//);
 * lexer.capture('text', /^\w+/);
 *
 * const pos = position(lexer);
 * const token = pos(lexer.advance());
 * console.log(token);
 * ```
 * @param {String|Object} `name` (optional) Snapdragon Lexer or Tokenizer instance, or the name to use for the position property on the token. Default is `position`.
 * @param {Object} `target` Snapdragon Lexer or Tokenizer instance
 * @return {Function} Returns a function that takes a `token` as its only argument
 * @api public
 */

function position(name, target) {
  if (isValidInstance(name)) return position('position', name);
  if (!isValidInstance(target)) return position.plugin(name);
  const start = new Location(target);

  return (token) => {
    token[name] = new Position(start, new Location(target), target);
    if (target.emit) target.emit('position', token);
    return token;
  };
}

/**
 * Use as a plugin to add a `.position` method to your [snapdragon-lexer][]
 * or [snapdragon-tokenizer][] instance to automatically add a position object
 * to tokens when the `.lex()` or `.handle()` methods are used.
 *
 * ```js
 * const Lexer = require('snapdragon-lexer');
 * const position = require('snapdragon-position');
 * const lexer = new Lexer();
 * lexer.use(position());
 * ```
 * @api public
 */

position.plugin = (name) => {
  if (typeof name !== 'string') name = 'position';

  return function(target) {
    if (!isValidInstance(target)) {
      throw new Error('expected a snapdragon Lexer or Tokenizer instance');
    }

    /**
     * Get the current source location, with `index`, `column` and `line`.
     * Used by [.position()](#position) to create the "start" and "end" locations.
     *
     * ```js
     * const Lexer = require('snapdragon-lexer');
     * const lexer = new Lexer();
     * console.log(lexer.location());
     * //=> Location { index: 0, column: 0, line: 1 };
     * ```
     * @return {Object} Returns an object with the current source location.
     * @api public
     */

    target.location = () => new Location(target);

    /**
     * Returns a function for getting the current position.
     *
     * ```js
     * const Lexer = require('snapdragon-lexer');
     * const lexer = new Lexer('foo/bar');
     * lexer.use(position());
     *
     * lexer.set('text', function(tok) {
     *   // get start position before advancing lexer
     *   const pos = this.position();
     *   const match = this.match(/^\w+/);
     *   if (match) {
     *     // get end position after advancing lexer (with .match)
     *     return pos(this.token(match));
     *   }
     * });
     * ```
     * @return {Function} Returns a function that takes a `token` as its only argument, and patches a `.position` property onto the token.
     * @api public
     */

    target.position = (key) => position(key || name, target);

    /**
     * Override the `.lex` method to automatically patch
     * position onto returned tokens in a future-proof way.
     */

    target.lex = (type) => {
      const pos = target.position();
      const tok = target.constructor.prototype.lex.call(target, type);
      if (tok) {
        return pos(tok);
      }
    };

    /**
     * Override the `.handle` method to automatically patch
     * position onto returned tokens in a future-proof way.
     */

    target.handle = (type) => {
      const pos = target.position();
      const tok = target.constructor.prototype.handle.call(target, type);
      if (tok) {
        return pos(tok);
      }
    };
  };
};

/**
 * Create a new Location object with `index`, `column`, and `line`.
 *
 * ```js
 * const Lexer = require('snapdragon-lexer');
 * const Location = require('snapdragon-position').Location;
 * const lexer = new Lexer('foo/bar');
 * lexer.capture('text', /^\w+/);
 * lexer.advance();
 * console.log(new Location(lexer));
 * //=> Location { index: 3, column: 4, line: 1 }
 * ```
 * @param {Object} `start` (required) Starting [location](#location)
 * @param {Object} `end` (required) Ending [location](#location)
 * @param {Object} `target` (optional) Snapdragon Lexer or Tokenizer instance
 * @return {Object}
 * @api public
 */

class Location {
  constructor(lexer) {
    this.index = lexer.loc.index;
    this.column = lexer.loc.column;
    this.line = lexer.loc.line;
  }
}

/**
 * Create a new Position with the given `start` and `end` locations.
 *
 * ```js
 * const Lexer = require('snapdragon-lexer');
 * const position = require('snapdragon-location');
 * const lexer = new Lexer('foo/bar')
 *   .capture('slash', /^\//)
 *   .capture('text', /^\w+/);
 *
 * const start = new position.Location(lexer);
 * lexer.advance();
 * const end = new position.Location(lexer);
 * console.log(new position.Position(start, end, lexer));
 * // Position {
 * //   source: undefined,
 * //   start: Location { index: 0, column: 1, line: 1 },
 * //   end: Location { index: 3, column: 4, line: 1 } }
 * ```
 * @param {Object} `start` (required) Starting [location](#location)
 * @param {Object} `end` (required) Ending [location](#location)
 * @param {Object} `target` (optional) Snapdragon Lexer or Tokenizer instance
 * @return {Object}
 * @api public
 */

class Position {
  constructor(start, end, target) {
    this.source = isValidInstance(target) ? target.options.source : undefined;
    this.start = start;
    this.end = end;
  }
  get range() {
    return [this.start.index, this.end.index];
  }
}

/**
 * Returns true if `target` is an instance of snapdragon lexer or tokenizer
 */

function isValidInstance(target) {
  if (isObject(target)) {
    return target.isLexer === true || target.isTokenizer === true;
  }
  return false;
}

function isObject(target) {
  return target && typeof target === 'object';
}

/**
 * Main export
 */

module.exports = position;

/**
 * Expose `Position` and `Location` classes as properties on main export
 */

module.exports.Position = Position;
module.exports.Location = Location;
