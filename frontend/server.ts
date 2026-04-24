import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mock FastAPI Endpoints
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      model_loaded: true,
      preprocessor_loaded: true,
      model_version: "2.4.1",
      run_id: "7b8d9c1e2f3a4b5c6d7e8f9a0b1c2d3e"
    });
  });

  // Alias / to health check if requested as relative /
  // But usually / is the SPA. The prompt says "GET / -> JSON health".
  // This is a bit ambiguous if / is also the SPA.
  // I'll put health at /api/health and have the frontend fetch that,
  // or handle the root specifically if it's an API request (e.g. Accept JSON).
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      model_loaded: true,
      preprocessor_loaded: true,
      model_version: "2.4.1",
      run_id: "7b8d9c1e2f3a4b5c6d7e8f9a0b1c2d3e"
    });
  });

  app.post("/predict", (req, res) => {
    // Simple heuristic for mock prediction
    const { balance, duration, campaign } = req.body;
    const prob = Math.min(0.95, Math.max(0.05, (duration / 1000) + (balance > 5000 ? 0.2 : 0) - (campaign * 0.05)));
    const prediction = prob > 0.5 ? "yes" : "no";
    
    setTimeout(() => {
      res.json({
        prediction,
        probability_yes: parseFloat(prob.toFixed(4)),
        model_version: "2.4.1"
      });
    }, 500); // Simulate network latency
  });

  app.post("/reload", (req, res) => {
    setTimeout(() => {
      res.json({ status: "reloaded", model_version: "2.4.2" });
    }, 2000);
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
