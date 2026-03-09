const { createLogger, format, transports } = require("winston");

const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: format.combine(
    format.timestamp({ format: "HH:mm:ss.SSS" }),
    format.colorize(),
    format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
  ),
  transports: [
    new transports.Console(),
    new transports.File({
      filename: "agent-wallet.log",
      format: format.combine(format.timestamp(), format.json()),
    }),
  ],
});

module.exports = logger;