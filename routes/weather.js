const express = require("express");
const router = express.Router();
const weatherController = require("../controllers/weatherController");

// 取得高雄天氣預報
router.get("/kaohsiung", weatherController.getKaohsiungWeather);
router.get('/:locationName', weatherController.getWeatherByLocation);
module.exports = router;
