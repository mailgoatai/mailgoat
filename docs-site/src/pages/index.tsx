import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';

export default function Home(): JSX.Element {
  return (
    <Layout title="MailGoat Documentation" description="Interactive docs for MailGoat">
      <main className="hero hero--primary docsHero">
        <div className="container">
          <h1 className="hero__title">MailGoat Documentation</h1>
          <p className="hero__subtitle">Searchable guides, CLI docs, API references, and integration tutorials.</p>
          <div>
            <Link className="button button--secondary button--lg" to="/getting-started/quick-start">
              Quick Start
            </Link>
            <span> </span>
            <Link className="button button--info button--lg" to="/cli-reference/send">
              CLI Reference
            </Link>
          </div>
        </div>
      </main>
    </Layout>
  );
}
