"use client";

import { useMCPContext } from "@/contexts/mcp-context";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Wifi, WifiOff } from "lucide-react";

export default function ConnectionStatus() {
  const { isConnected, isConnecting, error, tools } = useMCPContext();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 p-2 rounded-full hover:bg-secondary/20 transition-colors duration-200">
            {isConnecting ? (
              <div className="animate-pulse">
                <Wifi className="w-5 h-5 text-yellow-500" />
              </div>
            ) : isConnected ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {isConnecting ? (
            <p>正在连接到 MCP 服务...</p>
          ) : isConnected ? (
            <div>
              <p>已连接到 MCP 服务</p>
              <p className="text-xs text-muted-foreground">已加载 {tools.length} 个工具</p>
            </div>
          ) : (
            <div>
              <p>未连接到 MCP 服务</p>
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}