"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { MCPProvider as ExternalMCPProvider, useMCP } from "mcp-uiux";

// 定义 MCP 上下文类型
interface MCPContextType {
  connect: (address: string) => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  tools: any[];
}

// 创建上下文
const MCPContext = createContext<MCPContextType | undefined>(undefined);

// 自定义 Hook 用于访问 MCP 上下文
export function useMCPContext() {
  const context = useContext(MCPContext);
  if (context === undefined) {
    throw new Error("useMCPContext 必须在 MCPProvider 内部使用");
  }
  return context;
}

// 内部 MCP 连接组件
function MCPConnection({ children }: { children: ReactNode }) {
  const {
    connect: mcpConnect,
    loading,
    error: mcpError,
    tools: mcpTools,
  } = useMCP();
  
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tools, setTools] = useState<any[]>([]);
  const [mcpAddress, setMcpAddress] = useState<string>("");

  // 从本地存储加载配置
  useEffect(() => {
    const savedConfig = localStorage.getItem("systemConfig");
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        setMcpAddress(config.mcpAddress);
      } catch (error) {
        console.error("无法解析保存的配置:", error);
      }
    }
  }, []);

  // 如果有 MCP 地址，尝试自动连接
  useEffect(() => {
    if (mcpAddress) {
      connect(mcpAddress).catch(console.error);
    }
  }, [mcpAddress]);

  // 监听 MCP 工具变化
  useEffect(() => {
    if (mcpTools && mcpTools.length > 0) {
      setTools(mcpTools);
      setIsConnected(true);
    }
  }, [mcpTools]);

  // 监听 MCP 错误
  useEffect(() => {
    if (mcpError) {
      setError(mcpError);
      setIsConnected(false);
    }
  }, [mcpError]);

  // 连接到 MCP
  const connect = async (address: string) => {
    try {
      setError(null);
      await mcpConnect(address, '');
      setMcpAddress(address);
    } catch (err) {
      setError(err instanceof Error ? err.message : "连接失败");
      setIsConnected(false);
    }
  };

  // 断开连接
  const disconnect = () => {
    setIsConnected(false);
    setTools([]);
  };

  return (
    <MCPContext.Provider
      value={{
        connect,
        disconnect,
        isConnected,
        isConnecting: loading,
        error,
        tools
      }}
    >
      {children}
    </MCPContext.Provider>
  );
}

// MCP 提供器组件
export function MCPProvider({ children }: { children: ReactNode }) {
  return (
    <ExternalMCPProvider>
      <MCPConnection>{children}</MCPConnection>
    </ExternalMCPProvider>
  );
}