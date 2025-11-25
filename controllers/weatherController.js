const axios = require("axios");

// CWA API 設定
const CWA_API_BASE_URL = "https://opendata.cwa.gov.tw/api";
const CWA_API_KEY = "CWA-3C2658AB-B0DF-4F5D-A22A-CD5AEB89237D";

/**
 * 取得高雄天氣預報
 * CWA 氣象資料開放平臺 API
 * 使用「一般天氣預報-今明 36 小時天氣預報」資料集
 */
const getKaohsiungWeather = async (req, res) => {
  try {
    // 檢查是否有設定 API Key
    if (!CWA_API_KEY) {
      return res.status(500).json({
        error: "伺服器設定錯誤",
        message: "請在 .env 檔案中設定 CWA_API_KEY",
      });
    }

    // 呼叫 CWA API - 一般天氣預報（36小時）
    // API 文件: https://opendata.cwa.gov.tw/dist/opendata-swagger.html
    const response = await axios.get(
      `${CWA_API_BASE_URL}/v1/rest/datastore/F-C0032-001`,
      {
        params: {
          Authorization: CWA_API_KEY,
          locationName: "桃園市",
        },
      }
    );

    // 取得高雄市的天氣資料
    const locationData = response.data.records.location[0];
    // console.log(locationData.weatherElement);
    
    if (!locationData) {
      return res.status(404).json({
        error: "查無資料",
        message: "無法取得高雄市天氣資料",
      });
    }

    // 整理天氣資料
    const weatherData = {
      city: locationData.locationName,
      updateTime: response.data.records.datasetDescription,
      forecasts: [],
    };

    // 解析天氣要素
    const weatherElements = locationData.weatherElement;
    const timeCount = weatherElements[0].time.length;

    for (let i = 0; i < timeCount; i++) {
      const forecast = {
        startTime: weatherElements[0].time[i].startTime,
        endTime: weatherElements[0].time[i].endTime,
        weather: "",
        rain: "",
        minTemp: "",
        maxTemp: "",
        comfort: "",
        windSpeed: "",
      };

      weatherElements.forEach((element) => {
        const value = element.time[i].parameter;
        switch (element.elementName) {
          case "Wx":
            forecast.weather = value.parameterName;
            break;
          case "PoP":
            forecast.rain = value.parameterName + "%";
            break;
          case "MinT":
            forecast.minTemp = value.parameterName + "°C";
            break;
          case "MaxT":
            forecast.maxTemp = value.parameterName + "°C";
            break;
          case "CI":
            forecast.comfort = value.parameterName;
            break;
          case "WS":
            forecast.windSpeed = value.parameterName;
            break;
        }
      });

      weatherData.forecasts.push(forecast);
    }

    res.json({
      success: true,
      data: weatherData,
    });
  } catch (error) {
    console.error("取得天氣資料失敗:", error.message);

    if (error.response) {
      // API 回應錯誤
      return res.status(error.response.status).json({
        error: "CWA API 錯誤",
        message: error.response.data.message || "無法取得天氣資料",
        details: error.response.data,
      });
    }

    // 其他錯誤
    res.status(500).json({
      error: "伺服器錯誤",
      message: "無法取得天氣資料，請稍後再試",
    });
  }
};

const getWeatherByLocation = async (req, res) => {
  // 1. 從請求參數中取得地點名稱
  // 假設 API 路徑為 /api/weather/:locationName
  const locationName = req.params.locationName; 
  
  if (!locationName) {
    return res.status(400).json({
      error: "請求錯誤",
      message: "請在路徑中提供地點名稱，例如 /api/weather/臺北市",
    });
  }

  // CWA API 要求地點名稱必須是「縣市」的全名，例如：臺北市, 桃園市, 臺南市
  // 這裡可以選擇將用戶傳入的名稱進行清理或標準化（可選）
  const standardizedLocation = locationName.includes("台") ? locationName.replace(/台/g, "臺") : locationName;


  try {
    if (!CWA_API_KEY) {
      return res.status(500).json({
        error: "伺服器設定錯誤",
        message: "請在 .env 檔案中設定 CWA_API_KEY",
      });
    }

    // 2. 呼叫 CWA API - 替換 locationName 參數
    const response = await axios.get(
      `${CWA_API_BASE_URL}/v1/rest/datastore/F-C0032-001`,
      {
        params: {
          Authorization: CWA_API_KEY,
          locationName: standardizedLocation, // <--- 替換為動態地點名稱
        },
      }
    );

    // 取得指定地點的天氣資料
    const locationData = response.data.records.location[0];
    
    if (!locationData) {
      // 檢查是否取得資料，如果地點名稱錯誤 CWA 可能回傳空陣列
      return res.status(404).json({
        error: "查無資料",
        message: `無法取得 ${standardizedLocation} 的天氣資料，請確認地點名稱是否正確 (需為縣市全名)`,
      });
    }

    // 3. 整理天氣資料 (保留原來的整理邏輯，它非常完善)
    const weatherData = {
      city: locationData.locationName,
      // datasetDescription 可能是固定的，我們使用當前時間或 CWA 的發布時間會更好
      updateTime: new Date().toISOString(), 
      forecasts: [],
    };

    const weatherElements = locationData.weatherElement;
    const timeCount = weatherElements[0].time.length;

    for (let i = 0; i < timeCount; i++) {
      const forecast = {
        startTime: weatherElements[0].time[i].startTime,
        endTime: weatherElements[0].time[i].endTime,
        weather: "",
        rain: "",
        minTemp: "",
        maxTemp: "",
        comfort: "",
        windSpeed: "",
      };

      weatherElements.forEach((element) => {
        const value = element.time[i].parameter;
        switch (element.elementName) {
          case "Wx":
            forecast.weather = value.parameterName;
            break;
          case "PoP":
            // 這裡調整為確保 PoP 是數字
            const popValue = value.parameterName;
            forecast.rain = popValue ? popValue + "%" : "0%"; 
            break;
          case "MinT":
            forecast.minTemp = value.parameterName + "°";
            break;
          case "MaxT":
            forecast.maxTemp = value.parameterName + "°";
            break;
          case "CI":
            forecast.comfort = value.parameterName;
            break;
          case "WS":
            forecast.windSpeed = value.parameterName;
            break;
        }
      });

      weatherData.forecasts.push(forecast);
    }

    res.json({
      success: true,
      data: weatherData,
    });
  } catch (error) {
    console.error("取得天氣資料失敗:", error.message);

    if (error.response) {
      // API 回應錯誤
      return res.status(error.response.status).json({
        error: "CWA API 錯誤",
        message: error.response.data.message || "無法取得天氣資料",
        details: error.response.data,
      });
    }

    // 其他錯誤
    res.status(500).json({
      error: "伺服器錯誤",
      message: "無法取得天氣資料，請稍後再試",
    });
  }
};


module.exports = {
  getKaohsiungWeather,getWeatherByLocation
};
