export class PromptRejectedError extends Error {
  constructor(public reason: string) {
    super(reason);
    this.name = "PromptRejectedError";
  }
}

export class ImageLimitExceededError extends Error {
  constructor(message: string = "Maximum of 3 reference images per character") {
    super(message);
    this.name = "ImageLimitExceededError";
  }
}
