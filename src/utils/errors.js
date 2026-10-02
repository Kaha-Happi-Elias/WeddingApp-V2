/** An error that carries the HTTP status to send back. */
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
module.exports = { HttpError };
