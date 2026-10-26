import { Router } from "express";
import { register, login, refresh, logout, changePassword, getTeam, postCashier, deleteCashier } from "./auth.controller";
import { requireAuth, requireOwner } from "./auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/change-password", requireAuth, changePassword);

// Team management endpoints (Store Owner only)
router.get("/team", requireAuth, requireOwner, getTeam);
router.post("/team", requireAuth, requireOwner, postCashier);
router.delete("/team/:id", requireAuth, requireOwner, deleteCashier);

router.get("/me", requireAuth, (req, res) => {
  res.status(200).json({ success: true, data: { auth: req.auth } });
});

export default router;