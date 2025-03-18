const express = require("express");
const bodyParser = require("body-parser");
const { DateTime } = require("luxon");

const app = express();
app.use(bodyParser.json()); // Parse JSON request body

// Function to find available 10-min slots after the current time in EST
function findAvailableSlots(busyTimesUTC) {
    if (busyTimesUTC.length === 0) return { message: "No busy times provided" };

    // Get the current time in EST (New York time) and round it down to the nearest 10 minutes
    let currentTimeEST = DateTime.now().setZone("America/New_York").startOf("minute");
    let roundedMinutes = Math.floor(currentTimeEST.minute / 10) * 10;
    currentTimeEST = currentTimeEST.set({ minute: roundedMinutes });

    // Convert currentTimeEST to UTC for accurate comparison with busy times
    let currentTimeUTC = currentTimeEST.setZone("utc");

    // Find the earliest and latest busy time to dynamically set the date range
    const earliestBusyTime = DateTime.fromISO(busyTimesUTC[0].start, { zone: "utc" }).startOf("day");
    const latestBusyTime = DateTime.fromISO(busyTimesUTC[busyTimesUTC.length - 1].end, { zone: "utc" }).endOf("day");

    let busyTimes = busyTimesUTC.map(range => ({
        start: DateTime.fromISO(range.start, { zone: "utc" }),
        end: DateTime.fromISO(range.end, { zone: "utc" })
    }));

    let availableSlots = [];
    let currentSlot = DateTime.max(currentTimeUTC, earliestBusyTime); // Ensure we start from the later of the two

    while (currentSlot <= latestBusyTime) {
        let nextSlot = currentSlot.plus({ minutes: 10 });

        let isOverlapping = busyTimes.some(busy =>
            (currentSlot >= busy.start && currentSlot < busy.end) ||
            (nextSlot > busy.start && nextSlot < busy.end)
        );

        if (!isOverlapping) {
            // Convert available slots to New York time
            availableSlots.push(currentSlot.setZone("America/New_York").toISO());
        }

        currentSlot = nextSlot;
    }

    if (availableSlots.length > 0) {
        availableSlots.shift(); // Remove the first item
    }

    return availableSlots.length > 0
        ? { alternateTimes: availableSlots }
        : { message: "No slots available after current time" };
}

// POST route to check available slots
app.post("/available-slots", (req, res) => {
    const { busyTimes } = req.body;
    console.log('busyTimes:', busyTimes);

    if (!Array.isArray(busyTimes) || busyTimes.length === 0) {
        return res.status(400).json({ error: "Invalid input, expected a non-empty array of busy times" });
    }

    const result = findAvailableSlots(busyTimes);
    console.log("result:", result);
    return res.json(result);
});


app.post('/filter', (req, res) => {
    const { now, resultList } = req.body;
    
    if (!now || !resultList) {
        return res.status(400).json({ error: "Missing required fields: 'now' and/or 'resultList'" });
    }
    console.log('now', now)
    console.log('resultList', resultList)
    
    // Parse the provided now timestamp
    const nowDate = new Date(now);
    if (isNaN(nowDate.getTime())) {
      return res.status(400).json({ error: "Invalid 'now' timestamp format" });
    }
    
    // Calculate the time 30 minutes from now (in milliseconds)
    const thirtyMinutesMs = 30 * 60 * 1000;
    const nowPlus30 = new Date(nowDate.getTime() + thirtyMinutesMs);
  
    // Filter the resultList to only include records scheduled within the next 30 minutes
    const validResults = resultList.filter(record => {
      // Field "4" contains the scheduled time (in ISO 8601 format)
      if (!record["4"]) return false;
      
      const scheduledTime = new Date(record["4"]);
      // Check if scheduledTime is valid and falls between now and now+30 minutes
      return !isNaN(scheduledTime.getTime()) && scheduledTime >= nowDate && scheduledTime <= nowPlus30;
    });

    console.log("valid result", validResults)
  
    // Return the filtered data in the response
    res.status(200).json({
      valid_results: validResults,
      fileSize: JSON.stringify(validResults).length // optional: size of the result payload
    });
  });

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
