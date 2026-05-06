// Type declarations for Node.js process environment
declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_PATH?: string;
    [key: string]: string | undefined;
  }
}
