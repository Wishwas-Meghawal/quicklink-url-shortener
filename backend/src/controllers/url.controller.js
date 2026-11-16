
import URLModel  from "../models/url.model.js";
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

    // 2. Validate URL format and protocol
    let parsedUrl;

    try {
      parsedUrl = new globalThis.URL(originalUrl.trim());
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

    // 3. Generate unique short code and save
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
        // Retry only if shortCode has a duplicate key
        if (error.code === 11000) {
          continue;
        }

        throw error;
      }
    }

    if (!savedUrl) {
      return res.status(503).json({
        success: false,
        message: "Unable to generate a unique short code. Try again.",
      });
    }

    // 4. Return response
    const shortUrl = `${process.env.BASE_URL}/${savedUrl.shortCode}`;

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
