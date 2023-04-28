import Head from 'next/head';
import { ReactNode } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import React from 'react';

type LayoutProps = {
  children: ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  return (
    <>
      <Head>
        <title>Weather Traffic App</title>
      </Head>
      <nav>
        {/* Navigation links */}        
      </nav>
      <main className="container p-1 mt-5">{children}</main>
      <footer>
        {/* Footer content */}
      </footer>
    </>
  );
}
