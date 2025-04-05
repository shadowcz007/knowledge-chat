"use client";

import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import dynamic from 'next/dynamic';
import SettingsDialog from '@/components/settings-dialog';
import Sidebar from '@/components/sidebar';
import ConnectionStatus from '@/components/connection-status';
import { MCPProvider, useMCPContext } from '@/contexts/mcp-context';

const NetworkGraph = dynamic(() => import('@/components/network-graph'), {
  ssr: false,
});

function HomeContent() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { connect } = useMCPContext();

  const handleConfigSaved = (config: any) => {
    // 当配置保存时，尝试连接到 MCP
    if (config.mcpAddress) {
      connect(config.mcpAddress);
    }
  };

  return (
    <div className="min-h-screen bg-background tech-grid">
      <div className="particle-effect" />
      
      {/* 头部 */}
      <header className="fixed top-0 w-full z-50 glass-effect">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary neon-glow">
            记忆核心
          </h1>
          <div className="flex items-center gap-2">
            <ConnectionStatus />
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-full hover:bg-secondary transition-colors duration-200"
            >
              <Settings className="w-6 h-6 text-primary" />
            </button>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
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
        onConfigSaved={handleConfigSaved}
      />
    </div>
  );
}

export default function Home() {
  return (
    <MCPProvider>
      <HomeContent />
    </MCPProvider>
  );
}