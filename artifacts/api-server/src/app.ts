import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

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

// The imported ViMore app owns its API routes in Next.js. The workspace proxy
// sends /api traffic to this shared service first, so forward any route that
// is not handled by the shared health router to ViMore's web service.
const vimoreOrigin = `http://127.0.0.1:${process.env["VIMORE_WEB_PORT"] ?? "23778"}`;

app.use("/api", async (req, res) => {
  try {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (key === "host" || value === undefined) continue;
      if (Array.isArray(value)) {
        headers.set(key, value.join(", "));
      } else {
        headers.set(key, value);
      }
    }

    const hasBody = !["GET", "HEAD"].includes(req.method);
    const response = await fetch(`${vimoreOrigin}${req.originalUrl}`, {
      method: req.method,
      headers,
      body: hasBody ? JSON.stringify(req.body) : undefined,
    });

    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (key !== "content-encoding" && key !== "content-length") {
        res.setHeader(key, value);
      }
    });

    const body = Buffer.from(await response.arrayBuffer());
    res.send(body);
  } catch (error) {
    req.log.error({ err: error }, "Failed to forward request to ViMore API");
    res.status(502).json({ error: "ViMore API is unavailable" });
  }
});

export default app;
