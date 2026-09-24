export class AppError extends Error {
  constructor(
    message,
    status = 500,
    code = "INTERNAL_SERVER_ERROR",
    fields = null
  ) {
    super(message);

    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}