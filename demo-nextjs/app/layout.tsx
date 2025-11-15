import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'React Form Builder Demo',
  description: 'A powerful form builder based on JSON Schema with flexible UI Schema',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
