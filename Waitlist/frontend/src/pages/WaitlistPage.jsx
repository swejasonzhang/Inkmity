import WaitlistForm from "../components/WaitlistForm";

export default function WaitlistPage() {
  return (
    <div className="relative min-h-screen flex flex-col justify-center">
      <video
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
        src="Video.mp4" 
        autoPlay
        loop
        muted
      />

      <div className="absolute top-0 left-0 w-full h-full bg-black/40 z-0"></div>

      <div className="relative z-10 flex justify-center items-center w-full">
        <WaitlistForm />
      </div>
    </div>
  );
}
