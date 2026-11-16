
import URLModel from "../models/url.model.js";
import { customAlphabet } from "nanoid";

const generateCode = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  6
);

export const createShortUrl = async (req, res) => {
  try {
    const { originalUrl } = req.body;

    // 1. Validate input
    if (!originalUrl || typeof originalUrl !== "string") {
      return res.status(400).json({
        success: false,
        message: "Original URL is required",
      });
    }

    const trimmedUrl = originalUrl.trim();

    if (trimmedUrl.length > 2048) {
      return res.status(400).json({
        success: false,
        message: "URL cannot exceed 2048 characters",
      });
    }

    // 2. Validate URL
    let parsedUrl;

    try {
      parsedUrl = new globalThis.URL(trimmedUrl);
    } catch {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid URL",
      });
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return res.status(400).json({
        success: false,
        message: "Only HTTP and HTTPS URLs are allowed",
      });
    }

    // 3. Generate unique code and save
    let savedUrl;

    for (let attempt = 0; attempt < 5; attempt++) {
      const shortCode = generateCode();

      try {
        savedUrl = await URLModel.create({
          originalUrl: parsedUrl.href,
          shortCode,
        });

        break;
      } catch (error) {
        if (
          error.code === 11000 &&
          error.keyPattern?.shortCode
        ) {
          continue;
        }

        throw error;
      }
    }

    // 4. Handle code generation failure
    if (!savedUrl) {
      return res.status(503).json({
        success: false,
        message: "Unable to generate unique short code",
      });
    }

    // 5. Generate short URL
    const baseUrl = (
      process.env.BASE_URL || "http://localhost:5000"
    ).replace(/\/+$/, "");

    const shortUrl = `${baseUrl}/${savedUrl.shortCode}`;

    // 6. Send response
    return res.status(201).json({
      success: true,
      message: "Short URL created successfully",
      data: {
        originalUrl: savedUrl.originalUrl,
        shortCode: savedUrl.shortCode,
        shortUrl,
        clicks: savedUrl.clicks,
        createdAt: savedUrl.createdAt,
      },
    });

  } catch (error) {
    console.error("Create Short URL Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};




export const redirectUrl = async (req, res) => {
  try {
    const { shortCode } = req.params;

    // Find URL and increment click count
    const url = await URLModel.findOneAndUpdate(
      {
        shortCode,
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } },
        ],
      },
      {
        $inc: { clicks: 1 },
      },
      {
        new: true,
      }
    );

    // URL not found or expired
    if (!url) {
      const existingUrl = await URLModel.findOne({ shortCode });

      if (!existingUrl) {
        return res.status(404).json({
          success: false,
          message: "Short URL not found",
        });
      }

      return res.status(410).json({
        success: false,
        message: "This short URL has expired",
      });
    }

    // Redirect to original URL
    return res.redirect(302, url.originalUrl);

  } catch (error) {
    console.error("Redirect URL Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};





