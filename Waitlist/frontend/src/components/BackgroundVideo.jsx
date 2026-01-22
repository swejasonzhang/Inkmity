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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,.18)_0%,rgba(0,0,0,.58)_70%,rgba(0,0,0,.78)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,.68),rgba(0,0,0,.28)_20%,rgba(0,0,0,.28)_80%,rgba(0,0,0,.72))]" />
        <div className="absolute inset-0 backdrop-blur-[3px]" style={{ WebkitBackdropFilter: 'blur(3px) saturate(110%)' }} />
      </div>
    </div>
  );
}
