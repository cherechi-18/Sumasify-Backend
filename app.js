import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/utils/errorHandler.js";
import { notFound } from "./middleware/utils/notFound.js";
import { env } from "./config/env.js";

const app = express();

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (env.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
};

app.use(cors(corsOptions));

app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(":method :url :status :response-time ms"));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/v1", routes);
app.use(notFound);
app.use(errorHandler);

export default app;