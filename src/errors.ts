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
 * Error thrown when a request times out (504).
 */
export class TimeoutError extends QuercleError {
  constructor(detail?: string) {
    super("Request timed out. Try a simpler query.", 504, detail);
    this.name = "TimeoutError";
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}
