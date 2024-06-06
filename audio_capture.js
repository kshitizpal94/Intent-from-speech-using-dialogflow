document.addEventListener("DOMContentLoaded", () => {
  const startButton = document.getElementById("startButton");
  const stopButton = document.getElementById("stopButton");
  const audioPlayback = document.getElementById("audioPlayback");

  let mediaRecorder;
  let audioChunks = [];

  startButton.addEventListener("click", async () => {
    // Request access to the microphone
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Create a MediaRecorder instance 
    mediaRecorder = new MediaRecorder(stream, { type: "audio/webm" });

    // Handle the dataavailable event
    mediaRecorder.addEventListener("dataavailable", (event) => {
      audioChunks.push(event.data);
    });

    // Handle the stop event
    mediaRecorder.addEventListener("stop", async () => {
      // Combine the audio chunks into a single Blob 
      const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
      const audioUrl = URL.createObjectURL(audioBlob);
      audioPlayback.src = audioUrl;

      // Send the audio data to the server
      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.webm");
      console.log(audioBlob);
      console.log(formData);
      await fetch("/upload", {
        method: "POST",
        body: formData,
      });
    });

    // Start recording
    mediaRecorder.start();
  });

  stopButton.addEventListener("click", () => {
    // Stop the recording
    mediaRecorder.stop();
    audioChunks = [];
  });
});
