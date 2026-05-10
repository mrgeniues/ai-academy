import express, { type Express } from "express";
import cors from "cors";
import compression from "compression";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

app.use(compression());
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

if (process.env["NODE_ENV"] === "production") {
  const staticPath = process.env["STATIC_PATH"]
    ? path.resolve(process.cwd(), process.env["STATIC_PATH"])
    : path.resolve(__dirname, "../../lms/dist/public");
  // Cache hashed assets (JS/CSS) for 1 year, HTML never cached
  app.use(express.static(staticPath, {
    maxAge: "1y",
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      }
    },
  }));
  app.use((_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });
}

export default app;
