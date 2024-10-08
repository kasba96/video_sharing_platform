import express from "express";
import { convertVideo, deleteProcessedVideo, deleteRawVideo, downloadRawVideo, setupDirectories, uploadProcessedVideo } from "./storage";
import { error } from "console";
import { isVideoNew, setVideo } from "./firestore";

setupDirectories();

const app = express();
app.use(express.json());

app.post("/process-video", async (req, res) => {
    // Get the bucket and file name from the Pub/Sub message.
    let data;
    try {
        const message = Buffer.from(req.body.message.data, "base64").toString(`utf8`);
        data = JSON.parse(message);
        if (!data.name) {
            throw new Error("Invalid message payload received.");
        }
    } catch {
        console.error(error);
        return res.status(400).send(`Bad request: missing file name.`);
    }

    const inputFileName = data.name;
    const outputFileName = `processed-${inputFileName}`;
    const videoID = inputFileName.split(".")[0];

    if (!isVideoNew(videoID)) {
        return res.status(400).send(`Bad Request: video already processing or processed`);
    } else {
        await setVideo(videoID, {
            id: videoID,
            uid: videoID.split("-")[0],
            status: "processing"
        });
    }

    // Download raw video from cloud storage.
    await downloadRawVideo(inputFileName);

    // Process the downloaded video - convert the video to 360p.
    try {
        await convertVideo(inputFileName, outputFileName);
    } catch (err) {
        await Promise.all([deleteRawVideo(inputFileName), deleteProcessedVideo(outputFileName)]);
        console.log(err);
        return res.status(500).send(`Internal Server Error: video processing failed.`);
    }

    //Upload the processed video to cloud storage.
    await uploadProcessedVideo(outputFileName);

    await setVideo(videoID, {
        status: "processed",
        filename: outputFileName
    })

    await Promise.all([deleteRawVideo(inputFileName), deleteProcessedVideo(outputFileName)]);

    return res.status(200).send(`Processing finished successfully.`);
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(
        `Video processing service listening at http://localhost:${port}`
    );
});