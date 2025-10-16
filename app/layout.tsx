import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Next.js on AWS',
    description: 'Deployed with CDK and OpenNext'
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang='en'>
            <body>
                {children}
            </body>
        </html>
    )
}