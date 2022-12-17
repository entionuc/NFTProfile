const { createLogger, format, transports } = require("winston");

const logger = createLogger({
  format: format.combine(
    format.errors({ stack: true }),
    format.timestamp(),
    format.printf(({ level, message, timestamp, stack }) => {
      return stack
        ? `${timestamp} (${level}): ${message}\n${stack}`
        : `${timestamp.split("T")[1].slice(0, -1)} (${level.slice(
            0,
            1
          )}): ${message}`;
    })
  ),
  transports: [
    new transports.Console({ level: "info" }),
    new transports.File({ filename: "combined.log", level: "silly" }),
  ],
});

exports.logger = logger;
