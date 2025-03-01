class CustomError extends Error {
  constructor(message, statusCode, status) {
    super(message);
    this.statusCode = statusCode || 500;
    this.status = status || "server error";
  }
}

module.exports = CustomError;
