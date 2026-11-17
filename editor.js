
(() => {
  const $ = id => document.getElementById(id);

  const canvas = $("editCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const videoInput = $("clipFiles");
  const audioInput = $("audioFile");
  const clipList = $("clipList");
  const videoTrack = $("videoTrack");
  const captionTrack = $("captionTrack");
  const captionText = $("captionText");

  let clips = [];
  let current = 0;
  let playing = false;
  let animation = null;
  let recorder = null;
  let recordedChunks = [];

  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  let audioUrl = null;
  let audioElement = null;

  function draw(message = "VYRO AI VIDEO EDITOR") {
    ctx.fillStyle = "#080d18";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (video.readyState >= 2 && !video.paused) {
      const scale = Math.max(
        canvas.width / video.videoWidth,
        canvas.height / video.videoHeight
      );

      const w = video.videoWidth * scale;
      const h = video.videoHeight * scale;

      ctx.drawImage(
        video,
        (canvas.width - w) / 2,
        (canvas.height - h) / 2,
        w,
        h
      );
    } else {
      ctx.fillStyle = "#a78bfa";
      ctx.font = "bold 42px Arial";
      ctx.textAlign = "center";
      ctx.fillText(message, canvas.width / 2, canvas.height / 2);
    }

    const captions = captionText.value
      .split("\n")
      .filter(line => line.trim());

    if (captions.length) {
      const caption = captions[current % captions.length];

      ctx.font = "bold 34px Arial";
      ctx.textAlign = "center";

      const style = $("captionStyle").value;

      if (style === "box") {
        ctx.fillStyle = "rgba(0,0,0,.7)";
        ctx.fillRect(80, canvas.height - 110, canvas.width - 160, 65);
      }

      ctx.fillStyle = style === "yellow" ? "#ffe66d" : "#ffffff";
      ctx.fillText(caption, canvas.width / 2, canvas.height - 65);
    }
  }

  function renderClips() {
    clipList.innerHTML = "";
    videoTrack.innerHTML = "";

    if (!clips.length) {
      clipList.textContent = "No clips added yet.";
      videoTrack.textContent = "Add video clips to start editing.";
      return;
    }

    clips.forEach((clip, index) => {
      const row = document.createElement("div");
      row.className = "clip-row";

      const name = document.createElement("span");
      name.textContent = clip.name;

      const up = document.createElement("button");
      up.textContent = "↑";
      up.className = "secondary";
      up.onclick = () => moveClip(index, -1);

      const down = document.createElement("button");
      down.textContent = "↓";
      down.className = "secondary";
      down.onclick = () => moveClip(index, 1);

      const remove = document.createElement("button");
      remove.textContent = "×";
      remove.className = "secondary";
      remove.onclick = () => removeClip(index);

      row.append(name, up, down, remove);
      clipList.appendChild(row);

      const chip = document.createElement("div");
      chip.className = "clip-chip";
      chip.textContent = clip.name;
      chip.onclick = () => selectClip(index);
      videoTrack.appendChild(chip);
    });

    $("videoTrackMeta").textContent = clips.length + " clips";
  }

  function selectClip(index) {
    if (!clips[index]) return;

    current = index;
    video.pause();
    video.src = clips[index].url;
    video.load();

    video.onloadeddata = () => draw();
    $("editorStatus").textContent = "Clip " + (index + 1);
  }

  function moveClip(index, direction) {
    const target = index + direction;

    if (target < 0 || target >= clips.length) return;

    [clips[index], clips[target]] = [clips[target], clips[index]];

    renderClips();
    selectClip(target);
  }

  function removeClip(index) {
    URL.revokeObjectURL(clips[index].url);
    clips.splice(index, 1);

    current = Math.min(current, clips.length - 1);
    renderClips();

    if (clips.length) selectClip(current);
    else draw();
  }

  videoInput.onchange = () => {
    [...videoInput.files].forEach(file => {
      if (!file.type.startsWith("video/")) return;

      clips.push({
        name: file.name,
        url: URL.createObjectURL(file)
      });
    });

    renderClips();

    if (clips.length === 1) selectClip(0);
  };

  audioInput.onchange = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);

    const file = audioInput.files[0];
    if (!file) return;

    audioUrl = URL.createObjectURL(file);
    audioElement = new Audio(audioUrl);
    $("audioInfo").textContent = file.name;
    $("audioTrackMeta").textContent = "Audio selected";
  };

  $("applyCaptions").onclick = () => {
    const lines = captionText.value
      .split("\n")
      .filter(line => line.trim());

    captionTrack.innerHTML = "";

    lines.forEach(line => {
      const item = document.createElement("div");
      item.className = "clip-chip caption-block";
      item.textContent = line;
      captionTrack.appendChild(item);
    });

    $("captionTrackMeta").textContent = lines.length + " captions";
    draw();
  };

  $("previewPlay").onclick = async () => {
    if (!clips.length) {
      alert("Add a video clip first.");
      return;
    }

    playing = true;
    selectClip(current);

    try {
      await video.play();
      $("editorStatus").textContent = "Playing";
      animate();
    } catch {
      playing = false;
      alert("This video could not be played.");
    }
  };

  function animate() {
    if (!playing) return;

    draw();
    animation = requestAnimationFrame(animate);

    if (video.ended) {
      video.pause();

      if (current + 1 < clips.length) {
        current++;
        selectClip(current);
        video.play().catch(() => {});
      } else {
        stopPreview();
      }
    }
  }

  function stopPreview() {
    playing = false;
    cancelAnimationFrame(animation);
    video.pause();

    if (audioElement) audioElement.pause();

    $("editorStatus").textContent = "Stopped";
    draw();
  }

  $("previewStop").onclick = stopPreview;

  $("clearEditor").onclick = () => {
    stopPreview();

    clips.forEach(clip => URL.revokeObjectURL(clip.url));
    clips = [];
    current = 0;

    videoInput.value = "";
    audioInput.value = "";
    captionText.value = "";

    renderClips();
    captionTrack.innerHTML = "";
    $("audioInfo").textContent = "No audio selected.";
    $("audioTrackMeta").textContent = "No audio";
    $("captionTrackMeta").textContent = "No captions";

    draw();
  };

  $("exportVideo").onclick = async () => {
    if (!clips.length) {
      alert("Add a video clip before exporting.");
      return;
    }

    if (!window.MediaRecorder) {
      alert("Video export is not supported by this browser.");
      return;
    }

    const button = $("exportVideo");
    const status = $("exportStatus");

    button.disabled = true;
    status.textContent = "Preparing WebM export…";

    const stream = canvas.captureStream(30);
    recordedChunks = [];

    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    recorder = new MediaRecorder(stream, { mimeType: mime });

    recorder.ondataavailable = event => {
      if (event.data.size) recordedChunks.push(event.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "vyro-ai-export.webm";
      link.textContent = "Download your WebM video";

      status.innerHTML = "";
      status.appendChild(link);
      button.disabled = false;
      $("editorStatus").textContent = "Export complete";
    };

    recorder.start();

    let index = 0;

    async function recordNext() {
      if (index >= clips.length) {
        recorder.stop();
        return;
      }

      video.pause();
      video.src = clips[index].url;
      video.load();

      await new Promise(resolve => {
        video.onloadeddata = resolve;
      });

      draw();
      await video.play();

      const frame = () => {
        draw();

        if (video.ended) {
          video.pause();
          index++;
          recordNext();
        } else {
          requestAnimationFrame(frame);
        }
      };

      requestAnimationFrame(frame);
    }

    try {
      await recordNext();
    } catch (error) {
      if (recorder.state !== "inactive") recorder.stop();
      status.textContent = "Export error: " + error.message;
      button.disabled = false;
    }
  };

  window.VyroEditor = {
    resize: () => draw()
  };

  renderClips();
  draw();
})();
