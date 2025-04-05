"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Network, RefreshCw } from "lucide-react";
import { useGraphService } from "@/services/graph-service";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";

export default function Sidebar() {
  const { graphData, isLoading, error, fetchGraphData, hasReadGraphTool } = useGraphService();

  // 组件挂载时自动获取图谱数据
  useEffect(() => {
    if (hasReadGraphTool) {
      fetchGraphData();
    }
  }, [hasReadGraphTool, fetchGraphData]);

  // 添加对 graphData 的监听
  useEffect(() => {
    // 当图谱数据变化时，可以添加一些视觉反馈
    if (graphData.nodes.length > 0 || graphData.edges.length > 0) {
      console.log("侧边栏检测到图谱数据更新:", graphData);
    }
  }, [graphData]);

  return (
    <div className="w-80 border-l border-secondary glass-effect">
      <Tabs defaultValue="entities" className="h-full">
        <TabsList className="w-full justify-start p-2 glass-effect">
          <TabsTrigger value="entities" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            实体 ({graphData.nodes.length})
          </TabsTrigger>
          <TabsTrigger value="relations" className="flex items-center gap-2">
            <Network className="w-4 h-4" />
            关系 ({graphData.edges.length})
          </TabsTrigger>
        </TabsList>

        <div className="p-2 flex justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchGraphData}
            disabled={isLoading || !hasReadGraphTool}
            className="glass-effect text-xs"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            刷新数据
          </Button>
        </div>

        {error && (
          <div className="mx-4 p-2 bg-red-500/80 text-white rounded-md text-sm">
            {error}
          </div>
        )}

        <TabsContent value="entities" className="h-[calc(100vh-10rem)]">
          <ScrollArea className="h-full px-4">
            {isLoading ? (
              // 加载中状态
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="mb-4 glass-effect">
                  <CardHeader className="p-4">
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Skeleton className="h-3 w-full mb-2" />
                    <Skeleton className="h-3 w-3/4" />
                  </CardContent>
                </Card>
              ))
            ) : graphData.nodes.length > 0 ? (
              // 有数据状态
              graphData.nodes.map((node) => (
                <Card key={node.id} className="mb-4 glass-effect card-hover">
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm text-primary flex items-center justify-between">
                      <span>{node.label}</span>
                      {node.type && (
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/20">
                          {node.type}
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {node.properties && Object.keys(node.properties).length > 0 ? (
                      <div className="text-xs space-y-1">
                        {Object.entries(node.properties).map(([key, value]) => (
                          <div key={key} className="flex">
                            <span className="text-muted-foreground mr-2">{key}:</span>
                            <span className="text-foreground">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">无属性数据</p>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              // 无数据状态
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <Brain className="w-10 h-10 mb-2 opacity-20" />
                <p>暂无实体数据</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="relations" className="h-[calc(100vh-10rem)]">
          <ScrollArea className="h-full px-4">
            {isLoading ? (
              // 加载中状态
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="mb-4 glass-effect">
                  <CardHeader className="p-4">
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Skeleton className="h-3 w-full mb-2" />
                    <Skeleton className="h-3 w-3/4" />
                  </CardContent>
                </Card>
              ))
            ) : graphData.edges.length > 0 ? (
              // 有数据状态
              graphData.edges.map((edge) => (
                <Card key={edge.id} className="mb-4 glass-effect card-hover">
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm text-primary">
                      {edge.label || "关系"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">从:</span>
                        <span className="text-foreground">
                          {graphData.nodes.find(n => n.id === edge.from)?.label || edge.from}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">到:</span>
                        <span className="text-foreground">
                          {graphData.nodes.find(n => n.id === edge.to)?.label || edge.to}
                        </span>
                      </div>
                      
                      {edge.properties && Object.keys(edge.properties).length > 0 && (
                        <div className="pt-2 border-t border-border/30 mt-2">
                          <p className="text-muted-foreground mb-1">属性:</p>
                          {Object.entries(edge.properties).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-muted-foreground">{key}:</span>
                              <span className="text-foreground">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              // 无数据状态
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <Network className="w-10 h-10 mb-2 opacity-20" />
                <p>暂无关系数据</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}