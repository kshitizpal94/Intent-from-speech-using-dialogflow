const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const dialogflow = require("@google-cloud/dialogflow");
const util = require("util");
const { struct } = require("pb-util");

const serviceAccountKey = ""

const CREDENTIALS = JSON.parse(
  fs.readFileSync(serviceAccountKey)
);

// Configuration for the client
const CONFIGURATION = {
  credentials: {
    private_key: CREDENTIALS["private_key"],
    client_email: CREDENTIALS["client_email"],
  },
};

// Instantiates a session client
const sessionClient = new dialogflow.SessionsClient(CONFIGURATION);
let projectId = CREDENTIALS.project_id;
let sessionId = "123892759";// Random session id
const languageCode = "en";

const app = express();
const port = 8000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `audio_${Date.now()}.webm`);
  },
});

const upload = multer({ storage });

// Serve static files from the "public" directory
app.use(express.static(__dirname));

// Handle audio file uploads and send to Dialogflow
app.post("/upload", upload.single("audio"), async (req, res) => {
  const filePath = path.join(uploadsDir, req.file.filename);
  // path to saved audio file

  try {
    const sessionPath = sessionClient.projectAgentSessionPath(
      projectId,
      sessionId
    );

    const readFile = util.promisify(fs.readFile);
    const inputAudio = await readFile(filePath);

    const request = {
      session: sessionPath,
      queryInput: {
        audioConfig: {
          audioEncoding: "FLAC",
          sampleRateHertz: 48000,
          languageCode: languageCode,
        },
      },
      inputAudio: inputAudio,
    };

    const [response] = await sessionClient.detectIntent(request);
    const result = response.queryResult;
    console.log(result);
    // res.json({
    //     queryText: result.queryText,
    //     intent: result.intent.displayName,
    //     confidence: result.intentDetectionConfidence,
    //     fulfillmentText: result.fulfillmentText,
    // });
    const contextClient = new dialogflow.ContextsClient();

    console.log(`  Query: ${result.queryText}`);
    console.log(`  Response: ${result.fulfillmentText}`);
    if (result.intent) {
      console.log(`  Intent: ${result.intent.displayName}`);
    } else {
      console.log("  No intent matched.");
    }
    const parameters = JSON.stringify(struct.decode(result.parameters));
    console.log(`  Parameters: ${parameters}`);
    if (result.outputContexts && result.outputContexts.length) {
      console.log("  Output contexts:");
      result.outputContexts.forEach((context) => {
        const contextId =
          contextClient.matchContextFromProjectAgentSessionContextName(
            context.name
          );
        const contextParameters = JSON.stringify(
          struct.decode(context.parameters)
        );
        console.log(`    ${contextId}`);
        console.log(`      lifespan: ${context.lifespanCount}`);
        console.log(`      parameters: ${contextParameters}`);
      });
    }
  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).send("Error processing audio");
  } 
  finally {
    // Optionally, delete the file after processing
    fs.unlinkSync(filePath);
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
