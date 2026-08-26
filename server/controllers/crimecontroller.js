const crime = require("../models/crime");

const getcrimes = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const crimes = await crime.find({
      createdAt: { $gte: sevenDaysAgo },
    });

    res.status(200).json(crimes);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const createcrime = async (req, res) => {
  try {
    const newCrime = await crime.create(req.body);

    res.status(201).json(newCrime);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

module.exports = {
  getcrimes,
  createcrime,
};