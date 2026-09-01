import { Router } from "express";
import { register, login, refresh, logout } from "./auth.controller";
import { requireAuth } from "./auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);

// A simple protected test route — proves the middleware actually works.
// This isn't a permanent endpoint; it's scaffolding to verify Step 5+6
// before Phase 3 starts building real protected routes on this pattern.
router.get("/me", requireAuth, (req, res) => {
  res.status(200).json({ success: true, data: { auth: req.auth } });
});

export default router;