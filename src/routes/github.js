import { Router } from "express";
const router = Router();
import {
  getAllProfiles,
  getProfileByUsername,
  analyzeProfile,
} from "../controllers/githubController.js";

router.get("/profiles", getAllProfiles);
router.get("/profiles/:username", getProfileByUsername);
router.post("/analyze/:username", analyzeProfile);

export default router;
