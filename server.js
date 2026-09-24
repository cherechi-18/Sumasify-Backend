import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import app from "./app.js";
import { env } from "./config/env.js";
import prisma from "./config/prisma.js";

async function start() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    app.listen(env.port, () => {
      console.log(`ThriftCircle backend running on port ${env.port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();