const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const environmentRoutes = require("./routes/environments");
const objectRoutes = require("./routes/objects");
const envObjectRoutes = require("./routes/env_objects");
const userRoutes = require("./routes/users");
const tourRoutes = require("./routes/tour_routes");
const tourStops = require("./routes/tour_stops");
const envPois = require("./routes/env_pois");
const totemRoutes = require("./routes/totems");
const trellisRoutes = require("./routes/trellis");
const generationsRoutes = require("./routes/generations");
const { startQueueProcessor } = require("./services/trellisQueue");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Timeout per le richieste API (30s default) - evita che richieste bloccate occupino il server
app.use("/api", (req, res, next) => {
  // Trellis routes get longer timeout (120s) for large image uploads and downloads
  const timeout = req.path.startsWith("/trellis") ? 120000 : 30000;
  req.setTimeout(timeout, () => {
    if (!res.headersSent) {
      res.status(503).json({ message: "Richiesta scaduta: il server è temporaneamente sovraccarico" });
    }
  });
  next();
});

// Rotte
app.use("/api/auth", authRoutes);
app.use("/api/environments", environmentRoutes);
app.use("/api/objects", objectRoutes);
app.use("/api/env_objects", envObjectRoutes);
app.use("/api/users", userRoutes);

app.use("/api/tour_routes", tourRoutes);
app.use("/api/tour_stops", tourStops);
app.use("/api/env_pois", envPois);
app.use("/api/totems", totemRoutes);

// AI 3D Builder routes
app.use("/api/trellis", trellisRoutes);
app.use("/api/generations", generationsRoutes);

// Aggiungi la rotta per gli oggetti 3D
app.use("/uploads", express.static("uploads")); // Servire i file caricati


app.listen(PORT, () => {
  console.log(`✅ Eurekabackend in esecuzione su http://localhost:${PORT}`);

  // Start TRELLIS queue processor
  startQueueProcessor();
});
