import { LoggerService } from "@nestjs/common";

export class JsonLogger implements LoggerService {
  log(message: unknown) {
    this.write("INFO", message);
  }
  error(message: unknown) {
    this.write("ERROR", message);
  }
  warn(message: unknown) {
    this.write("WARNING", message);
  }
  debug(message: unknown) {
    this.write("DEBUG", message);
  }
  verbose(message: unknown) {
    this.write("DEBUG", message);
  }
  private write(severity: string, message: unknown) {
    process.stdout.write(
      JSON.stringify({
        severity,
        message: typeof message === "string" ? message : "Application event",
      }) + "\n",
    );
  }
}
