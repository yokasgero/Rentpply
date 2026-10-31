type LandingPageProps = {
  onOpenApp: (role: 'student' | 'tenant' | 'owner' | 'admin') => void;
};

function Brand() {
  return (
    <a className="landing-brand" href="/" aria-label="Rentpply home">
      <span className="landing-brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>
      </span>
      <span>rentpply</span>
    </a>
  );
}

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

function PinIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>;
}

function ShieldIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></svg>;
}

function HomeIllustration() {
  return (
    <div className="landing-visual" role="img" aria-label="Illustration of student housing in Kampala">
      <div className="landing-sun" />
      <div className="landing-building landing-building-back"><i /><i /><i /><i /><i /><i /></div>
      <div className="landing-building landing-building-front"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
      <div className="landing-plant"><i /><i /><b /></div>
      <div className="landing-visual-label landing-visual-label-top"><span className="landing-label-icon"><ShieldIcon /></span><span><b>Clear from the start</b><small>Price, location and amenities</small></span></div>
      <div className="landing-visual-label landing-visual-label-bottom"><span className="landing-label-pin"><PinIcon /></span><span><b>Find your campus fit</b><small>Student stays around Kampala</small></span></div>
      <span className="landing-spark landing-spark-one">✳</span>
      <span className="landing-spark landing-spark-two">✳</span>
    </div>
  );
}

const steps = [
  { number: '01', title: 'Choose your area', body: 'Start with your campus, budget and the kind of place you need.' },
  { number: '02', title: 'Compare with confidence', body: 'Review prices, amenities and listing status in one place.' },
  { number: '03', title: 'Make it yours', body: 'Save places, connect with roommates and keep housing details together.' },
];

export default function LandingPage({ onOpenApp }: LandingPageProps) {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-header-inner">
          <Brand />
          <nav className="landing-nav" aria-label="Main navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#for-owners">For property owners</a>
          </nav>
          <div className="landing-header-actions">
            <button className="landing-login" onClick={() => onOpenApp('tenant')}>Open demo</button>
            <button className="landing-header-cta" onClick={() => onOpenApp('student')}>Find a place <ArrowIcon /></button>
          </div>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-grid">
            <div className="landing-hero-copy">
              <div className="landing-kicker"><span /> STUDENT LIVING, MADE EASIER</div>
              <h1>Find a place<br />to <em>feel at home.</em></h1>
              <p className="landing-lede">A clearer way to find student housing in Kampala. Explore stays, compare the details and find people you’ll live well with.</p>
              <div className="landing-hero-actions">
                <button className="landing-primary" onClick={() => onOpenApp('student')}>Explore student stays <ArrowIcon /></button>
                <a className="landing-secondary" href="#how-it-works">See how it works <span>↓</span></a>
              </div>
              <div className="landing-proof-row">
                <div className="landing-avatars" aria-hidden="true"><span>J</span><span>A</span><span>M</span><b>+</b></div>
                <p><strong>One place for the details</strong><br /><span>Places · roommates · housing info</span></p>
              </div>
            </div>
            <HomeIllustration />
          </div>
          <div className="landing-hero-note"><span>✳</span> A more considered move-in starts here.</div>
        </section>

        <section className="landing-value-strip" aria-label="Rentpply features">
          <div><span className="landing-strip-icon"><ShieldIcon /></span><p><b>Listing status at a glance</b><small>Know what has been checked</small></p></div>
          <div><span className="landing-strip-icon"><PinIcon /></span><p><b>Made for Kampala</b><small>Explore areas around campus</small></p></div>
          <div><span className="landing-strip-icon landing-strip-spark">✳</span><p><b>Roommate connections</b><small>Find a better shared fit</small></p></div>
        </section>

        <section className="landing-section" id="how-it-works">
          <div className="landing-section-heading">
            <div><span className="landing-kicker">A simpler search</span><h2>From “where do I start?”<br /><em>to “this feels right.”</em></h2></div>
            <p>Moving for school is a lot. Rentpply brings the important housing details into one calm, easy-to-use space.</p>
          </div>
          <div className="landing-steps">
            {steps.map((step) => <article className="landing-step" key={step.number}>
              <span className="landing-step-number">{step.number}</span>
              <div className="landing-step-mark" aria-hidden="true">{step.number === '01' ? <PinIcon /> : step.number === '02' ? <ShieldIcon /> : <ArrowIcon />}</div>
              <h3>{step.title}</h3><p>{step.body}</p>
            </article>)}
          </div>
        </section>

        <section className="landing-owner-section" id="for-owners">
          <div className="landing-owner-art" aria-hidden="true"><div className="landing-owner-building"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div><div className="landing-owner-stat"><span>RENT PPLY</span><b>Spaces<br />students<br />can trust.</b><i>● ● ●</i></div></div>
          <div className="landing-owner-copy"><span className="landing-kicker">For property owners</span><h2>Good spaces deserve<br /><em>good visibility.</em></h2><p>Keep units, requests and rent information organized. Give students the details they need to make a confident choice.</p><button className="landing-primary" onClick={() => onOpenApp('owner')}>Explore the owner demo <ArrowIcon /></button></div>
        </section>

        <section className="landing-final-cta">
          <div><span className="landing-kicker">Your next move</span><h2>A good place changes<br />the whole semester.</h2></div>
          <button className="landing-primary landing-primary-light" onClick={() => onOpenApp('student')}>Start exploring <ArrowIcon /></button>
          <span className="landing-cta-decoration" aria-hidden="true">✳</span>
        </section>
      </main>

      <footer className="landing-footer">
        <Brand />
        <p>Student housing, with a little more clarity.</p>
        <span className="landing-demo-note">Demo experience · Sample listings and transactions</span>
      </footer>
    </div>
  );
}
