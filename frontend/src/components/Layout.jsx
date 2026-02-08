import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main style={{ marginLeft: 260, padding: '32px 40px', width: 'calc(100% - 260px)', minHeight: '100vh' }}>
        <Outlet />
      </main>
    </div>
  );
}
