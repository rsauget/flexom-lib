export class FlexomLibError extends Error {
  constructor(msg: string) {
    super(`[flexom-lib] ERROR: ${msg}`);
  }
}
