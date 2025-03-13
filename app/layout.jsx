// app/layout.js
import './globals.css'; // If you have a globals.css in app/ for universal resets, optional


export const metadata = {
  title: 'Bike Lane Route Planner',
  description: 'Plan your bike route through Next.js 13 + Mapbox!',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head />
      <body>{children}</body>
    </html>
  );
}
