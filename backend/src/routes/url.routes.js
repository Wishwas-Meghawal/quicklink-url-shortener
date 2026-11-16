
import express from "express";
import { createShortUrl,  redirectUrl, } from "../controllers/url.controller.js";

const router = express.Router();

// POST /api/urls/shorten
router.post("/shorten", createShortUrl);
router.get("/:shortCode", redirectUrl);

export default router;
