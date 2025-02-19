const videoUpload = document.getElementById("videoUpload");

const videoPlayer = document.getElementById("videoPlayer");

const startHandle = document.getElementById("start-handle");

const endHandle = document.getElementById("end-handle");

const startTimeLabel = document.getElementById("start-time-label");

const endTimeLabel = document.getElementById("end-time-label");

const sliderTrack = document.getElementById("slider-track");

const downloadBtn = document.getElementById("downloadBtn");

let videoDuration = 0;

let startTime = 0;

let endTime = 0;

videoUpload.addEventListener("change", function(event) 
{
    const file = event.target.files[0];

    if (file) 
    {
        const url = URL.createObjectURL(file);

        videoPlayer.src = url;

        videoPlayer.addEventListener("loadedmetadata", () => 
        {
            videoDuration = videoPlayer.duration;

            startTime = 0;

            endTime = videoDuration;

            updateHandles();
        });
    }
});

let activeHandle = null;

[startHandle, endHandle].forEach(handle => 
{
    handle.addEventListener("mousedown", (event) => 
    {
        activeHandle = event.target;

        document.addEventListener("mousemove", onDrag);

        document.addEventListener("mouseup", () => 
        {
            activeHandle = null;

            document.removeEventListener("mousemove", onDrag);
        });
    });
});

function onDrag(event) 
{
    if (!activeHandle || videoDuration === 0) return;

    const sliderRect = sliderTrack.parentElement.getBoundingClientRect();

    let newPosition = (event.clientX - sliderRect.left) / sliderRect.width;

    newPosition = Math.max(0, Math.min(1, newPosition));

    if (activeHandle === startHandle) 
    {
        startTime = newPosition * videoDuration;
        
        if (startTime >= endTime) startTime = endTime - 0.1;
    } 
    
    else if (activeHandle === endHandle) 
    {
        endTime = newPosition * videoDuration;

        if (endTime <= startTime) endTime = startTime + 0.1;
    }

    updateHandles();

    syncVideoPlayback();
}

function formatTime(seconds) 
{
    const mins = Math.floor(seconds / 60);

    const secs = Math.floor(seconds % 60);

    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function updateHandles() 
{
    const startPercent = (startTime / videoDuration) * 100;

    const endPercent = (endTime / videoDuration) * 100;

    startHandle.style.left = `${startPercent}%`;

    endHandle.style.left = `${endPercent}%`;

    startTimeLabel.style.left = `${startPercent}%`;

    startTimeLabel.textContent = formatTime(startTime);

    endTimeLabel.style.left = `${endPercent}%`;

    endTimeLabel.textContent = formatTime(endTime);

    sliderTrack.style.left = `${startPercent}%`;

    sliderTrack.style.width = `${endPercent - startPercent}%`;
}

function syncVideoPlayback() 
{
    videoPlayer.currentTime = startTime;

    videoPlayer.play();
}

videoPlayer.addEventListener("timeupdate", () => 
{
    if (videoPlayer.currentTime >= endTime) 
    {
        videoPlayer.currentTime = startTime;

        videoPlayer.play();
    }
});

downloadBtn.addEventListener("click", async () => 
{
    if (!videoUpload.files.length) 
    {
        alert("Please upload a video first.");

        return;
    }

    videoPlayer.currentTime = startTime;

    videoPlayer.play();

    videoPlayer.onseeked = () => 
    {
        const canvas = document.createElement("canvas");

        const ctx = canvas.getContext("2d");

        canvas.width = videoPlayer.videoWidth;

        canvas.height = videoPlayer.videoHeight;

        const audioStream = videoPlayer.captureStream().getAudioTracks();

        const outputStream = canvas.captureStream();

        if (audioStream.length > 0) outputStream.addTrack(audioStream[0]);

        const recorder = new MediaRecorder(outputStream, { mimeType: "video/webm" });

        let recordedChunks = [];

        recorder.ondataavailable = (event) => recordedChunks.push(event.data);

        recorder.onstop = () => 
        {
            const trimmedBlob = new Blob(recordedChunks, { type: "video/webm" });

            const url = URL.createObjectURL(trimmedBlob);

            const a = document.createElement("a");

            a.href = url;

            a.download = "trimmed_video.webm";

            document.body.appendChild(a);

            a.click();

            document.body.removeChild(a);
        };

        recorder.start();

        const frameInterval = setInterval(() => 
        {
            ctx.drawImage(videoPlayer, 0, 0, canvas.width, canvas.height);
        }, 1000 / 30);

        setTimeout(() => 
        {
            clearInterval(frameInterval);

            recorder.stop();

            videoPlayer.pause();
            
        }, (endTime - startTime) * 1000);
    };
});
