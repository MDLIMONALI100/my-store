export default function Home() {
  return (
    <main>
      <section
        className="hero"
        style={{ backgroundImage: "url('/img/hero.webp')" }}
      >
        <div className="container hero-content">
          <span className="eyebrow">New drop · Leather season</span>
          <h1>
            <span>Wear it</span>
            <br />
            <span className="outline">loud.</span>
          </h1>
          <p>Biker, bomber, café racer and suede.</p>
          <div className="hero-actions">
            <a href="#shop" className="btn btn-lg">Shop the drop</a>
            <a href="#" className="btn btn-lg btn-outline">Biker jackets</a>
          </div>
        </div>
      </section>
    </main>
  );
}
