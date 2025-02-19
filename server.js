const express = require("express");
const bodyParser = require("body-parser");
const { DateTime } = require("luxon");

const app = express();
app.use(bodyParser.json()); // Parse JSON request body

// Function to find available 15-min slots
function findAvailableSlots(busyTimesUTC) {
    if (busyTimesUTC.length === 0) return { message: "No busy times provided" };

    // Find the earliest and latest busy time to dynamically set the date range
    const earliestBusyTime = DateTime.fromISO(busyTimesUTC[0].start, { zone: "utc" }).startOf("day");
    const latestBusyTime = DateTime.fromISO(busyTimesUTC[busyTimesUTC.length - 1].start, { zone: "utc" }).endOf("day");

    let busyTimes = busyTimesUTC.map(range => ({
        start: DateTime.fromISO(range.start, { zone: "utc" }),
        end: DateTime.fromISO(range.end, { zone: "utc" })
    }));

    let availableSlots = [];
    let currentSlot = earliestBusyTime;

    while (currentSlot <= latestBusyTime) {
        let nextSlot = currentSlot.plus({ minutes: 10 });

        let isOverlapping = busyTimes.some(busy =>
            (currentSlot >= busy.start && currentSlot < busy.end) ||
            (nextSlot > busy.start && nextSlot < busy.end)
        );

        if (!isOverlapping) {
            availableSlots.push(currentSlot.toISO()); // Keep in ISO format
        }

        currentSlot = nextSlot;
    }

    return availableSlots.length > 0
        ? { alternateTimes: availableSlots }
        : { message: "No slots available" };
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
