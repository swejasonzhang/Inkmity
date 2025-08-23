import WaitlistForm from "../components/WaitlistForm";

export default function WaitlistPage() {
  return (
    <div
      className="relative min-h-screen flex flex-col justify-center bg-cover bg-center"
      style={{
        backgroundImage: "url('/Background.jpg')",
      }}
    >

      <div className="relative z-10 flex justify-center items-center w-full">
        <WaitlistForm />
      </div>
    </div>
  );
}
