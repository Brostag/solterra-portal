import Link from "next/link";

interface CTASectionProps {
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
}

export default function CTASection({
  title,
  subtitle,
  buttonText,
  buttonLink,
}: CTASectionProps) {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source
          src="https://ext.same-assets.com/2134444905/256108929.mp4"
          type="video/mp4"
        />
      </video>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
          {title}
        </h2>
        <p className="text-lg text-gray-200 mb-8 tracking-widest uppercase">
          {subtitle}
        </p>
        <Link
          href={buttonLink}
          className="inline-flex items-center gap-2 px-8 py-3 border border-white text-white hover:bg-white hover:text-[#253158] transition-all font-medium"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          {buttonText}
        </Link>
      </div>
    </section>
  );
}
