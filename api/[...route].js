import app, { ensureInitialized } from "../server/index.js";

export default async function handler(req, res) {
  await ensureInitialized();
  return app(req, res);
}
