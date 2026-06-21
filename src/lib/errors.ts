export class PromptRejectedError extends Error {
  constructor(public reason: string) {
    super(reason);
    this.name = "PromptRejectedError";
  }
}
