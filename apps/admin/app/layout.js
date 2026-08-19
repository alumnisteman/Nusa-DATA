import React from 'react';

export const metadata = {
  title: 'RESTART AI Admin',
  description: 'RESTART AI Admin Dashboard',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
