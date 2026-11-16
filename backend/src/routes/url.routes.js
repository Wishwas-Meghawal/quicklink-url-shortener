
import express from "express";
import { createShortUrl } from "../controllers/url.controller.js";

const router = express.Router();

// POST /api/urls/shorten
router.post("/shorten", createShortUrl);

export default router;
