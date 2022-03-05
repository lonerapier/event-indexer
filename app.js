const express = require("express");
const app = express();
const { connectToServer, getDb } = require("./db/conn");

const port = process.env.PORT ? process.env.PORT : 8001;
app.set("port", port);

connectToServer(() => {
    app.listen(port, (err) => {
        if (err) console.error(err);
        else console.log(`Listening on port ${port}`);
    });
});

app.get("/from", async (req, res) => {
    const db = await getDb();

    const from = req.body.from;
    const limit = req.body.limit ? parseInt(req.body.limit) : 10;
    const skip = req.body.skip ? parseInt(req.body.skip) : 0;

    const events = db
        .collection("events")
        .find({ from: from })
        .skip(skip)
        .limit(limit);

    res.status(200).send(events);
});
module.exports = app;
