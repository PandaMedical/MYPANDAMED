import handler from "../_handler.js";

export default async function authCatchAll(req, res) {
  return handler(req, res);
}
