import WaitlistForm from "../components/WaitlistForm";

export default function WaitlistPage() {
  return (
    <div className="relative min-h-screen w-screen flex flex-col justify-center overflow-hidden">
      <video
        autoPlay
        loop
        muted
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/Video.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      <div className="absolute inset-0 bg-black/40"></div>

      <div className="relative z-10 flex justify-center items-center w-full px-4">
        <WaitlistForm />
      </div>
    </div>
  );
}
