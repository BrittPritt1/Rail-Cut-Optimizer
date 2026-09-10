import { Router, type IRouter } from "express";
import {
  GetAdminSessionResponse,
  UnlockAdminSessionBody,
  UnlockAdminSessionResponse,
} from "@workspace/api-zod";
import {
  clearAdminSession,
  isAdminSession,
  isValidAdminPin,
  setAdminSession,
} from "../lib/admin-auth";

const router: IRouter = Router();

router.get("/admin/session", (req, res): void => {
  res.json(GetAdminSessionResponse.parse({ authenticated: isAdminSession(req) }));
});

router.post("/admin/session", (req, res): void => {
  const parsed = UnlockAdminSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (!isValidAdminPin(parsed.data.pin)) {
    res.status(401).json({ error: "Incorrect admin PIN" });
    return;
  }

  setAdminSession(res);
  res.json(UnlockAdminSessionResponse.parse({ authenticated: true }));
});

router.delete("/admin/session", (req, res): void => {
  clearAdminSession(res);
  res.sendStatus(204);
});

export default router;