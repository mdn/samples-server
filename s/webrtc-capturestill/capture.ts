(() => {
  // The width and height of the captured photo. We will set the
  // width to the value defined here, but the height will be
  // calculated based on the aspect ratio of the input stream.

  const width = 320;    // We will scale the photo width to this
  let height = 0;     // This will be computed based on the input stream

  // |streaming| indicates whether or not we're currently streaming
  // video from the camera. Obviously, we start at false.

  let streaming = false;

  // The various HTML elements we need to configure or control. These
  // will be set by the startup() function.

  let video: HTMLVideoElement;
  let canvas: HTMLCanvasElement;
  let photo: HTMLImageElement;
  let startbutton: HTMLButtonElement;

  // Capture a photo by fetching the current contents of the video
  // and drawing it into a canvas, then converting that to a PNG
  // format data URL. By drawing it on an offscreen canvas and then
  // drawing that to the screen, we can change its size and/or apply
  // other changes before drawing it.
  const takepicture = () => {
    const context = canvas.getContext('2d')!;
    if (width && height) {
      canvas.width = width;
      canvas.height = height;
      context.drawImage(video, 0, 0, width, height);

      const data = canvas.toDataURL('image/png');
      photo.setAttribute('src', data);
    } else {
      clearphoto();
    }
  };

  const startup = () => {
    video = document.getElementById('video') as HTMLVideoElement;
    canvas = document.getElementById('canvas') as HTMLCanvasElement;
    photo = document.getElementById('photo') as HTMLImageElement;
    startbutton = document.getElementById('startbutton') as HTMLButtonElement;

    navigator.mediaDevices.getUserMedia({video: true, audio: false})
    .then((stream) => {
      video.srcObject = stream;
      video.play();
    })
    .catch(err =>
      console.error("An error occurred: ", err)
    );

    video.addEventListener('canplay', ev => {
      if (!streaming) {
        height = video.videoHeight / (video.videoWidth/width);

        // Firefox currently has a bug where the height can't be read from
        // the video, so we will make assumptions if this happens.

        if (isNaN(height)) {
          height = width / (4/3);
        }

        video.setAttribute('width', width.toString());
        video.setAttribute('height', height.toString());
        canvas.setAttribute('width', width.toString());
        canvas.setAttribute('height', height.toString());
        streaming = true;
      }
    }, false);

    startbutton.addEventListener('click', ev => {
      takepicture();
      ev.preventDefault();
    }, false);

    clearphoto();
  };

  // Fill the photo with an indication that none has been
  // captured.
  const clearphoto = () => {
    const context = canvas.getContext('2d')!;
    context.fillStyle = "#AAA";
    context.fillRect(0, 0, canvas.width, canvas.height);

    const data = canvas.toDataURL('image/png');
    photo.setAttribute('src', data);
  };

  // Set up our event listener to run the startup process
  // once loading is complete.
  window.addEventListener('load', startup, false);
})();
