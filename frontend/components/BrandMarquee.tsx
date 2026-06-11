const BRANDS = [
  { name: "Noon", logo: "/landing/brands/noon.svg" },
  { name: "Careem", logo: "/landing/brands/careem.svg" },
  { name: "Lulu", logo: "/landing/brands/lulu.png" },
  { name: "Damas", logo: "/landing/brands/damas.svg" },
  { name: "Emirates", logo: "/landing/brands/emirates.svg" },
  { name: "Etihad", logo: "/landing/brands/etihad.svg" },
] as const;

function BrandLogo({ name, logo }: { name: string; logo: string }) {
  return (
    <div className="landing-brand-logo" aria-label={name}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} alt="" loading="lazy" decoding="async" />
    </div>
  );
}

export function BrandMarquee() {
  const track = [...BRANDS, ...BRANDS];

  return (
    <section className="landing-brands" aria-label="Brands that work with us">
      <div className="landing-shell">
        <p className="landing-brands-title">Brands that work with us</p>
      </div>
      <div className="landing-marquee">
        <div className="landing-marquee-track">
          {track.map((brand, index) => (
            <BrandLogo key={`${brand.name}-${index}`} name={brand.name} logo={brand.logo} />
          ))}
        </div>
      </div>
    </section>
  );
}
