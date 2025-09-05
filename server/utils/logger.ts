// Logger utility
export function log(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

export function logError(message: string, error?: Error): void {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR: ${message}`);
  if (error) {
    console.error(error.stack);
  }
}

export function logInfo(message: string): void {
  const timestamp = new Date().toISOString();
  console.info(`[${timestamp}] INFO: ${message}`);
}

export function logWarning(message: string): void {
  const timestamp = new Date().toISOString();
  console.warn(`[${timestamp}] WARNING: ${message}`);
}
