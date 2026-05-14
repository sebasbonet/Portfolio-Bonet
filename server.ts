import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Google OAuth configuration
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL}/auth/callback`
  );

  // 1. Get Auth URL
  app.get("/api/auth/google/url", (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === "YOUR_GOOGLE_CLIENT_ID") {
      return res.status(400).json({ 
        error: "Google OAuth is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment variables/secrets." 
      });
    }

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
      prompt: "consent",
    });
    res.json({ url });
  });

  // 2. Callback handler
  app.get("/auth/callback", async (req, res) => {
    const { code } = req.query;
    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      // In a real app, you'd store tokens in a session or database.
      // For this demo, we'll send it back to the client via postMessage
      // Note: This is a bit insecure for production but works for the AI Studio preview.
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'GOOGLE_AUTH_SUCCESS', 
                  tokens: ${JSON.stringify(tokens)} 
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. You can close this window.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Error exchanging code for tokens", error);
      res.status(500).send("Authentication failed");
    }
  });

  // 3. API to fetch sheet data using tokens
  app.post("/api/sheets/holdings", async (req, res) => {
    const { tokens, spreadsheetId, range } = req.body;
    if (!tokens || !spreadsheetId) {
      return res.status(400).json({ error: "Missing tokens or spreadsheetId" });
    }

    try {
      oauth2Client.setCredentials(tokens);
      const sheets = google.sheets({ version: "v4", auth: oauth2Client });
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: range || "A:Z", // Default to all columns
      });
      res.json(response.data.values || []);
    } catch (error) {
      console.error("Error fetching sheet data", error);
      res.status(500).json({ error: "Failed to fetch spreadsheet data. Is the ID correct?" });
    }
  });

  // Search News
  app.get("/api/market/news/:symbol", async (req, res) => {
    const { symbol } = req.params;
    const apiKey = process.env.FINNHUB_API_KEY;
    
    // If no API key, return mock data for demo purposes
    if (!apiKey || apiKey === "YOUR_FINNHUB_API_KEY") {
      return res.json([
        { 
          headline: `Major analyst upgrade for ${symbol}`, 
          source: 'Market Intelligence', 
          datetime: Date.now() / 1000, 
          summary: `Analysts are increasingly bullish on ${symbol} following recent performance and market expansion strategies.`
        },
        { 
          headline: `${symbol} expands global footprint`, 
          source: 'Reuters', 
          datetime: (Date.now() / 1000) - 3600, 
          summary: `The company has announced new partnerships across emerging markets.`
        }
      ]);
    }

    try {
      const response = await fetch(`https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=2024-01-01&to=2026-12-31&token=${apiKey}`);
      const data = await response.json();
      res.json(data.slice(0, 10)); // Return top 10 articles
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  // Market Data Proxy (to avoid CORS issues if needed, or hide keys)
  app.get("/api/market/price/:symbol", async (req, res) => {
    const { symbol } = req.params;
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      // Mock data if no key
      return res.json({ c: Math.random() * 200 + 50 });
    }
    try {
      const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Market data fetch failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
