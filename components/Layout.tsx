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
        <title>My Next.js App</title>
      </Head>
      <nav>
        {/* Navigation links */}        
      </nav>
      <main className="container p-5">{children}</main>
      <footer>
        {/* Footer content */}
      </footer>
    </>
  );
}
