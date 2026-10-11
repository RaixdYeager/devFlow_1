import { Link } from "react-router-dom";

function LandingPage() {
  return (
    <div className="app">
      {/* =========================
          NAVBAR
          ========================= */}
      <nav className="navbar">
        <Link to="/" className="logo">
          Dev<span>Flow</span>
        </Link>

        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#about">About</a>
        </div>

        <div className="nav-actions">
          <Link to="/login" className="login-btn">
            Log in
          </Link>

          <Link to="/signup" className="signup-btn">
            Get started
          </Link>
        </div>
      </nav>

      <main>
        {/* =========================
            HERO
            ========================= */}
        <section className="hero">
          <div className="hero-content">
            <p className="hero-badge">Built for modern development teams</p>

            <h1>
              Manage your development work
              <span> in one place.</span>
            </h1>

            <p className="hero-description">
              DevFlow brings projects, tasks, teams, and development activity
              together so your team can build better, faster.
            </p>

            <div className="hero-actions">
              <Link to="/signup" className="primary-btn">
                Start building
              </Link>

              <a href="#how-it-works" className="secondary-btn">
                See how it works
              </a>
            </div>
          </div>
        </section>

        {/* =========================
            DASHBOARD PREVIEW
            ========================= */}
        <section className="preview-section">
          <div className="preview-container">
            <div className="preview-header">
              <div>
                <p className="preview-label">PROJECT DASHBOARD</p>
                <h2>Everything your team needs.</h2>
              </div>
            </div>

            <div className="kanban-preview">
              <div className="kanban-column">
                <div className="column-title">
                  <span>Backlog</span>
                  <span>3</span>
                </div>

                <div className="task-card">
                  <h3>Design authentication flow</h3>
                  <p>UI / UX</p>
                </div>

                <div className="task-card">
                  <h3>Setup PostgreSQL database</h3>
                  <p>Backend</p>
                </div>
              </div>

              <div className="kanban-column">
                <div className="column-title">
                  <span>In Progress</span>
                  <span>2</span>
                </div>

                <div className="task-card">
                  <h3>Build Login API</h3>
                  <p>High Priority</p>
                </div>

                <div className="task-card">
                  <h3>Create dashboard UI</h3>
                  <p>Frontend</p>
                </div>
              </div>

              <div className="kanban-column">
                <div className="column-title">
                  <span>Testing</span>
                  <span>1</span>
                </div>

                <div className="task-card">
                  <h3>Checkout API tests</h3>
                  <p>Testing</p>
                </div>
              </div>

              <div className="kanban-column">
                <div className="column-title">
                  <span>Done</span>
                  <span>2</span>
                </div>

                <div className="task-card">
                  <h3>Database setup</h3>
                  <p>Completed</p>
                </div>

                <div className="task-card">
                  <h3>User authentication</h3>
                  <p>Completed</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            FEATURES
            ========================= */}
        <section className="features-section" id="features">
          <div className="features-container">
            <div className="features-heading">
              <p className="preview-label">WHY DEVFLOW</p>

              <h2>Everything your development team needs.</h2>

              <p>
                Keep your projects organized, your team aligned, and your
                development workflow moving forward.
              </p>
            </div>

            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">✓</div>

                <h3>Task Management</h3>

                <p>
                  Create, assign, prioritize, and track tasks from one
                  centralized workspace.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">↗</div>

                <h3>Kanban Workflow</h3>

                <p>
                  Move work from backlog to completion and understand your
                  team's progress at a glance.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">◆</div>

                <h3>Team Collaboration</h3>

                <p>
                  Keep developers, managers, and stakeholders aligned around the
                  same project.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">⌁</div>

                <h3>GitHub Integration</h3>

                <p>
                  Connect development activity with commits, issues, and pull
                  requests.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">◷</div>

                <h3>Project Analytics</h3>

                <p>
                  Understand project completion, workload, overdue tasks, and
                  overall progress.
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">!</div>

                <h3>Smart Notifications</h3>

                <p>
                  Stay informed about assignments, deadlines, comments, and
                  important project activity.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            HOW IT WORKS
            ========================= */}
        <section className="how-section" id="how-it-works">
          <div className="how-container">
            <div className="how-heading">
              <p className="preview-label">HOW IT WORKS</p>

              <h2>From idea to done.</h2>

              <p>
                DevFlow keeps your entire development workflow organized from
                the first task to the final release.
              </p>
            </div>

            <div className="steps-grid">
              <div className="step-card">
                <div className="step-number">01</div>

                <h3>Create a project</h3>

                <p>
                  Set up your project, define deadlines, and bring your
                  development team together.
                </p>
              </div>

              <div className="step-card">
                <div className="step-number">02</div>

                <h3>Organize the work</h3>

                <p>
                  Create tasks, assign responsibilities, set priorities, and
                  organize everything on the Kanban board.
                </p>
              </div>

              <div className="step-card">
                <div className="step-number">03</div>

                <h3>Build & track</h3>

                <p>
                  Track progress, collaborate with your team, and connect your
                  project with GitHub development activity.
                </p>
              </div>

              <div className="step-card">
                <div className="step-number">04</div>

                <h3>Ship with confidence</h3>

                <p>
                  Use analytics and project insights to understand progress and
                  get your work across the finish line.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            ABOUT
            ========================= */}
        <section className="about-section" id="about">
          <div className="about-container">
            <div className="about-content">
              <p className="preview-label">BUILT FOR DEVELOPERS</p>

              <h2>
                Less project chaos.
                <span> More building.</span>
              </h2>

              <p>
                DevFlow gives development teams a single place to plan work,
                collaborate, track progress, and connect their projects with the
                development tools they already use.
              </p>

              <p>
                Whether you're building a small side project or managing a
                growing development team, DevFlow keeps everyone moving in the
                same direction.
              </p>
            </div>

            <div className="about-stats">
              <div className="stat-card">
                <strong>1</strong>
                <span>Central workspace</span>
              </div>

              <div className="stat-card">
                <strong>4</strong>
                <span>Workflow stages</span>
              </div>

              <div className="stat-card">
                <strong>6+</strong>
                <span>Core features</span>
              </div>

              <div className="stat-card">
                <strong>∞</strong>
                <span>Possibilities</span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            FINAL CTA
            ========================= */}
        <section className="cta-section">
          <div className="cta-container">
            <p className="preview-label">START BUILDING</p>

            <h2>Ready to get your team moving?</h2>

            <p>
              Bring your projects, tasks, and development activity together with
              DevFlow.
            </p>

            <div className="cta-actions">
              <Link to="/signup" className="primary-btn">
                Get started
              </Link>

              <a href="#features" className="secondary-btn">
                Explore DevFlow
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* =========================
          FOOTER
          ========================= */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-brand">
            <Link to="/" className="logo">
              Dev<span>Flow</span>
            </Link>

            <p>
              A modern project management platform built for development teams.
            </p>
          </div>

          <div className="footer-links">
            <div>
              <h4>Product</h4>

              <a href="#features">Features</a>
              <a href="#how-it-works">How it works</a>
              <a href="#about">About</a>
            </div>

            <div>
              <h4>Platform</h4>

              <a href="#features">Task Management</a>
              <a href="#features">GitHub Integration</a>
              <a href="#features">Analytics</a>
            </div>

            <div>
              <h4>Get Started</h4>

              <Link to="/login">Log in</Link>
              <Link to="/signup">Sign up</Link>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2026 DevFlow. All rights reserved.</p>

          <p>Built for developers.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
