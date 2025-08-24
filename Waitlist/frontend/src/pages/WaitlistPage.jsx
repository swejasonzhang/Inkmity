import { useEffect, useRef } from "react";
import WaitlistForm from "../components/WaitlistForm";

export default function WaitlistPage() {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.warn("Autoplay blocked:", err);
      });
    }
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col justify-center">
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src="/Video.mp4" type="video/mp4" />
        <source src="/Video.webm" type="video/webm" />
        Your browser does not support the video tag.
      </video>

      <div className="absolute top-0 left-0 w-full h-full bg-black/40 z-0"></div>

      <div className="relative z-10 flex justify-center items-center w-full">
        <WaitlistForm />
      </div>
    </div>
  );
}
