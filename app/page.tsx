"use client";

import { useState } from 'react';
import { Settings } from 'lucide-react';
import dynamic from 'next/dynamic';
import SettingsDialog from '@/components/settings-dialog';
import Sidebar from '@/components/sidebar';

const NetworkGraph = dynamic(() => import('@/components/network-graph'), {
  ssr: false,
});

export default function Home() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background tech-grid">
      <div className="particle-effect" />
      
      {/* Header */}
      <header className="fixed top-0 w-full z-50 glass-effect">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary neon-glow">
            Memory Core
          </h1>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-full hover:bg-secondary transition-colors duration-200"
          >
            <Settings className="w-6 h-6 text-primary" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-screen pt-16">
        <main className="flex-1 p-4">
          <div className="w-full h-full rounded-lg overflow-hidden border border-secondary glass-effect">
            <NetworkGraph />
          </div>
        </main>
        
        <Sidebar />
      </div>

      <SettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </div>
  );
}