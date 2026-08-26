const express = require("express");

const {
  getcrimes,
  createcrime,
} = require("../controllers/crimecontroller");

const router = express.Router();

router.get("/", getcrimes);

router.post("/", createcrime);

module.exports = router;