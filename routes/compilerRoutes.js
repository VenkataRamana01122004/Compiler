const express = require("express");

const router = express.Router();

const {
    runCode,
    getLanguages
} = require("../controllers/compilerController");

router.post("/run", runCode);
router.get("/languages", getLanguages);

module.exports = router;