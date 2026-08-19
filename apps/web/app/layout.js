import './globals.css';

export const metadata = {
  title: 'RESTART AI — Platform Pemulihan & Akselerasi Karir Indonesia',
  description: 'Platform berbasis AI untuk membantu korban PHK, pensiunan, dan calon pensiunan membangun karir baru melalui Work DNA, Experience Bank, dan Opportunity Engine.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="bg-grid" />
        {children}
      </body>
    </html>
  )
}
