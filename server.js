const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const compilerRoutes = require("./routes/compilerRoutes");

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Compiler API Running"
    });
});

app.use("/api/compiler", compilerRoutes);

app.get("/health", (req, res) => {
    res.json({
        status: "UP",
        uptime: process.uptime()
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Ramana Server running on port ${PORT}`);
});