export default function BackgroundVideo() {
  return (
    <div className="fixed inset-0 -z-10">
      <video
        className="h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src="/Background.mp4" type="video/mp4" />
      </video>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,.15)_0%,rgba(0,0,0,.55)_70%,rgba(0,0,0,.75)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,.66),rgba(0,0,0,.25)_20%,rgba(0,0,0,.25)_80%,rgba(0,0,0,.7))]" />
        <div className="absolute inset-0 backdrop-blur-[2px]" />
      </div>
    </div>
  );
}
