const isDevelopment = process.env.NODE_ENV !== "production";

export const logger = {
  info: (dataOrMsg: any, msg?: string) => {
    if (msg) console.log(`[INFO] ${msg}`, dataOrMsg);
    else console.log(`[INFO]`, dataOrMsg);
  },
  warn: (dataOrMsg: any, msg?: string) => {
    if (msg) console.warn(`[WARN] ${msg}`, dataOrMsg);
    else console.warn(`[WARN]`, dataOrMsg);
  },
  error: (dataOrMsg: any, msg?: string) => {
    if (msg) console.error(`[ERROR] ${msg}`, dataOrMsg);
    else console.error(`[ERROR]`, dataOrMsg);
  },
  debug: (dataOrMsg: any, msg?: string) => {
    if (isDevelopment) {
      if (msg) console.debug(`[DEBUG] ${msg}`, dataOrMsg);
      else console.debug(`[DEBUG]`, dataOrMsg);
    }
  },
};

