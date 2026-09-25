import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import app from "./app.js";
import { env } from "./src/config/env.js";
import prisma from "./src/config/prisma.js";

async function start() {
  try {
    // Verify database connectivity before starting the server
    await prisma.$queryRaw`SELECT 1`;

    app.listen(env.port, () => {
      console.log(`SUMASIFY backend running on port ${env.port}`);
    });
  } catch (err) {
    console.error("Failed to start SUMASIFY backend:", err);
    process.exit(1);
  }
}

start();
