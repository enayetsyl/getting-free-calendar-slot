const express = require("express");
const bodyParser = require("body-parser");
const { DateTime } = require("luxon");

const app = express();
app.use(bodyParser.json()); // Parse JSON request body

// Function to find available 15-min slots
function findAvailableSlots(busyTimesUTC) {
    const startOfDay = DateTime.fromISO("2025-02-17T00:00:00", { zone: "America/New_York" });
    const endOfDay = DateTime.fromISO("2025-02-17T23:45:00", { zone: "America/New_York" });

    // Convert busy times from UTC to EST
    let busyTimesEST = busyTimesUTC.map(range => ({
        start: DateTime.fromISO(range.start, { zone: "utc" }).setZone("America/New_York"),
        end: DateTime.fromISO(range.end, { zone: "utc" }).setZone("America/New_York")
    }));

    let availableSlots = [];
    let currentSlot = startOfDay;

    while (currentSlot <= endOfDay) {
        let nextSlot = currentSlot.plus({ minutes: 15 });

        let isOverlapping = busyTimesEST.some(busy =>
            currentSlot < busy.end && nextSlot > busy.start
        );
        

        if (!isOverlapping) {
            availableSlots.push(currentSlot.toFormat("yyyy-MM-dd'T'HH:mm:ss"));
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
    if (!Array.isArray(busyTimes)) {
        return res.status(400).json({ error: "Invalid input, expected an array of busy times" });
    }

    const result = findAvailableSlots(busyTimes);
    return res.json(result);
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
