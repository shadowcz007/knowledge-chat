"use client";

import { useEffect, useRef } from 'react';
import { Network } from 'vis-network';
import { useGraphService } from '@/services/graph-service';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export default function NetworkGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const { graphData, isLoading, error, fetchGraphData, hasReadGraphTool } = useGraphService();

  // 初始化网络图
  useEffect(() => {
    if (!containerRef.current) return;

    const options = {
      nodes: {
        font: {
          color: "#fff",
          size: 14,
        },
        borderWidth: 2,
        shadow: {
          enabled: true,
          color: "rgba(59, 130, 246, 0.5)",
          size: 10,
        },
      },
      edges: {
        smooth: {
          enabled: true,
          type: "continuous",
          roundness: 0.5
        },
        shadow: {
          enabled: true,
          color: "rgba(59, 130, 246, 0.3)",
          size: 10,
        },
        font: {
          color: "#fff",
          size: 12,
        },
      },
      physics: {
        enabled: true,
        barnesHut: {
          gravitationalConstant: -2000,
          centralGravity: 0.3,
          springLength: 200,
        },
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        zoomView: true,
        dragView: true,
      },
    };

    // 创建空的网络图
    networkRef.current = new Network(
      containerRef.current, 
      { nodes: [], edges: [] }, 
      options
    );

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, []);

  // 当图谱数据更新时，更新网络图
  useEffect(() => {
    if (!networkRef.current) return;
    
    // 清空当前数据
    networkRef.current.setData({ nodes: [], edges: [] });
    
    // 短暂延迟后设置新数据
    setTimeout(() => {
      networkRef.current?.setData({
        nodes: graphData.nodes,
        edges: graphData.edges,
      });
      
      // 如果有数据，适应视图
      if (graphData.nodes.length > 0) {
        networkRef.current?.fit();
      }
    }, 50);
  }, [graphData]);

  // 组件挂载时自动获取图谱数据
  useEffect(() => {
    if (hasReadGraphTool) {
      fetchGraphData();
    }
  }, [hasReadGraphTool, fetchGraphData]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full network-container" />
      
      {/* 刷新按钮 */}
      <div className="absolute top-4 right-4 z-10">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchGraphData}
          disabled={isLoading || !hasReadGraphTool}
          className="glass-effect"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          刷新图谱
        </Button>
      </div>
      
      {/* 错误提示 */}
      {error && (
        <div className="absolute bottom-4 left-4 right-4 p-2 bg-red-500/80 text-white rounded-md text-sm">
          {error}
        </div>
      )}
      
      {/* 加载中提示 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="text-white">正在加载图谱数据...</div>
        </div>
      )}
    </div>
  );
}