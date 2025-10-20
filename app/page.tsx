import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>🚀 Next.js on AWS</h1>
      <p>Successfully deployed with AWS CDK + OpenNext!</p>
      
      <div style={{ marginTop: '2rem' }}>
        <h2>Environment: {process.env.NEXT_PUBLIC_ENV || 'development'}</h2>
        <p>This is a server-side rendered page.</p>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h3>Features:</h3>
        <ul>
          <li>✅ Server-Side Rendering (SSR)</li>
          <li>✅ API Routes</li>
          <li>✅ Image Optimization</li>
          <li>✅ Incremental Static Regeneration (ISR)</li>
          <li>✅ CloudFront CDN</li>
        </ul>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <Link 
          href="/todos" style={{
            display: 'inline-block',
            padding: '12px 24px',
            backgroundColor: '#0070f3',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: 'bold'
          }}
        >
         Open Todo App
        </Link>
      </div>
      <div style={{ marginTop: '2rem' }}>
        <a 
          href="/api/health" 
          style={{ 
            padding: '0.5rem 1rem', 
            background: '#0070f3', 
            color: 'white', 
            textDecoration: 'none',
            borderRadius: '4px'
          }}
        >
          Check Health API
        </a>
      </div>
    </main>
  )
}