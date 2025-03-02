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

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
