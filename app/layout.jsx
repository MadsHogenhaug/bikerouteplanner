// app/layout.js
import './globals.css'; // Import the main CSS entry point


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
