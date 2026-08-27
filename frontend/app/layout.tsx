import { AuthWrapper } from '@/components/AuthWrapper';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SeaSon — Ship Management System',
  description: 'The Son of Sea. Enterprise maritime fleet management platform for GPS tracking, maintenance, inventory, and compliance.',
  keywords: 'ship management, fleet tracking, maritime, GPS, maintenance, compliance',
  openGraph: {
    title: 'SeaSon — Ship Management System',
    description: 'Enterprise maritime fleet management platform',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <AuthWrapper>
          <div className="page-enter p-6 md:p-8 w-full h-full">
            {children}
          </div>
        </AuthWrapper>
      </body>
    </html>
  );
}
