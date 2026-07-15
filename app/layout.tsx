import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});

const playfair = Playfair_Display({
  variable: '--font-serif',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Chess Grand | Premium AAA 3D Chess Experience',
  description: 'An elegant, AAA-quality 3D chess game powered by Stockfish WASM. Experience polished animations, walnut and marble finishes, dynamic camera works, and synthesised wood acoustics.',
  keywords: ['chess', '3D chess', 'Stockfish AI', 'Next.js 15', 'Three.js', 'React Three Fiber', 'web audio chess', 'premium chess game'],
  authors: [{ name: 'Chess Grand Dev Team' }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} h-full dark antialiased`}>
      <body className="min-h-full h-full flex flex-col bg-[#0e0906] text-white overflow-hidden select-none">
        {children}
      </body>
    </html>
  );
}
