export interface Logger {
  log(message: string): void;
  error(message: string, ...args: unknown[]): void;
}
