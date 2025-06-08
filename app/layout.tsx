import type { Metadata } from 'next';
import './globals.css';
import Navigation from './components/Navigation';
import Notifications from './components/Notifications';

export const metadata: Metadata = {
  title: 'TerraFusion',
  description: 'Next generation civil infrastructure management',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-900 text-white">
        <Navigation />
        <main className="min-h-screen">
          {children}
        </main>
        <Notifications />
      </body>
    </html>
  );
} 