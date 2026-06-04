import dotenv from "dotenv";
import path from "node:path";
import process from "node:process";

const ENV = process.env.NODE_ENV || "development";

const tryEnv = (p) => {
  if (!p) return false;
  const abs = path.resolve(process.cwd(), p);
  const res = dotenv.config({ path: abs });
  return !res.error;
};

if (
  !tryEnv(`.env.${ENV}`) &&
  !tryEnv(`.env`) &&
  !tryEnv(path.join("..", `.env.${ENV}`)) &&
  !tryEnv(path.join("..", `.env`))
) {
  console.warn(`[env] No .env file found (NODE_ENV=${ENV}). Relying on process env.`);
}

export const ENV_NAME = ENV;
