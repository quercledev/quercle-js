/**
 * Base error class for all Quercle SDK errors.
 */
export class QuercleError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly detail?: string
  ) {
    super(message);
    this.name = "QuercleError";
    Object.setPrototypeOf(this, QuercleError.prototype);
  }
}

/**
 * Error thrown when authentication fails (401).
 * Usually indicates an invalid or missing API key.
 */
export class AuthenticationError extends QuercleError {
  constructor(detail?: string) {
    super(
      "Invalid or missing API key. Get one at https://quercle.dev",
      401,
      detail
    );
    this.name = "AuthenticationError";
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Error thrown when the account has insufficient credits (402).
 */
export class InsufficientCreditsError extends QuercleError {
  constructor(detail?: string) {
    super("Insufficient credits. Top up at https://quercle.dev", 402, detail);
    this.name = "InsufficientCreditsError";
    Object.setPrototypeOf(this, InsufficientCreditsError.prototype);
  }
}

/**
 * Error thrown when the account is inactive (403).
 */
export class InactiveAccountError extends QuercleError {
  constructor(detail?: string) {
    super("Account is inactive. Contact support at https://quercle.dev", 403, detail);
    this.name = "InactiveAccountError";
    Object.setPrototypeOf(this, InactiveAccountError.prototype);
  }
}

/**
 * Error thrown when a resource is not found (404).
 */
export class NotFoundError extends QuercleError {
  constructor(detail?: string) {
    super("Resource not found", 404, detail);
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Error thrown when a request times out (504).
 */
export class TimeoutError extends QuercleError {
  constructor(detail?: string) {
    super("Request timed out. Try a simpler query.", 504, detail);
    this.name = "TimeoutError";
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}
