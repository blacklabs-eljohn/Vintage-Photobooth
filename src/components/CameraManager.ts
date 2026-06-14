export class CameraManager {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private facingMode: 'user' | 'environment' = 'user';

  constructor() {}

  // Request camera access and bind it to video element
  public async startCamera(videoEl: HTMLVideoElement): Promise<MediaStream> {
    this.stopCamera(); // Make sure any old instance is stopped
    this.videoElement = videoEl;

    const constraints: MediaStreamConstraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 960 },
        facingMode: this.facingMode
      },
      audio: false
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoElement.srcObject = this.stream;
      this.videoElement.setAttribute('playsinline', 'true');
      
      // Wait for metadata to load to play
      await new Promise<void>((resolve) => {
        if (!this.videoElement) return resolve();
        this.videoElement.onloadedmetadata = () => {
          this.videoElement?.play().then(() => resolve()).catch(() => resolve());
        };
      });

      return this.stream;
    } catch (error) {
      console.error('Camera access failed:', error);
      throw error;
    }
  }

  // Stop camera tracks to release device hardware
  public stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
  }

  // Toggle front/back camera if available
  public async switchCamera(videoEl: HTMLVideoElement): Promise<MediaStream> {
    this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
    return this.startCamera(videoEl);
  }

  public getFacingMode(): 'user' | 'environment' {
    return this.facingMode;
  }

  // Capture the current frame as a high-quality image URL
  public captureFrame(): string {
    if (!this.videoElement || !this.stream) {
      throw new Error('Camera is not active');
    }

    const video = this.videoElement;
    const canvas = document.createElement('canvas');
    
    // Capture at the video's actual resolution, not display size
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not create 2D canvas context');
    }

    // Mirror the captured photo if we are using the user-facing camera
    if (this.facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);

    // Reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Return as JPEG with high quality
    return canvas.toDataURL('image/jpeg', 0.92);
  }
}
