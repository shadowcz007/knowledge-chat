"use client";

import { useMCPContext } from "@/contexts/mcp-context";
import { useState, useCallback } from "react";

export interface GraphNode {
  id: string | number;
  label: string;
  type?: string;
  properties?: Record<string, any>;
}

export interface GraphEdge {
  id: string | number;
  from: string | number;
  to: string | number;
  label: string;
  properties?: Record<string, any>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function useGraphService() {
  const { tools, isConnected } = useMCPContext();
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readGraphTool = tools.find(tool => tool.name === "read_graph");

  const fetchGraphData = useCallback(async () => {
    if (!isConnected || !readGraphTool) {
      setError("MCP 未连接或缺少读取图谱工具");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const result = await readGraphTool.execute({});
      
      // 添加控制台输出，查看返回的原始数据
      console.log("图谱服务返回的原始数据:", result);
      
      if (result && result.length > 0 && result[0].text) {
        try {
          // 解析返回的JSON字符串
          const parsedData = JSON.parse(result[0].text);
          console.log("解析后的数据:", parsedData);
          
          if (parsedData.entities && parsedData.relations) {
            // 将entities转换为nodes
            const nodes = parsedData.entities.map((entity: any, index: number) => ({
              id: entity.name,
              label: entity.name,
              type: entity.entityType,
              shape: "hexagon",
              color: {
                background: getNodeColor(entity.entityType),
                border: getLighterColor(getNodeColor(entity.entityType))
              },
              title: formatNodeTooltip({
                id: entity.name,
                label: entity.name,
                type: entity.entityType,
                properties: {
                  observations: entity.observations?.join(", ") || ""
                }
              }),
              properties: {
                observations: entity.observations || []
              }
            }));

            // 将relations转换为edges
            const edges = parsedData.relations.map((relation: any, index: number) => ({
              id: `e${index}`,
              from: relation.from,
              to: relation.to,
              label: relation.relationType || "",
              arrows: "to",
              color: {
                color: getEdgeColor(relation.relationType),
                highlight: getLighterColor(getEdgeColor(relation.relationType))
              },
              width: 2,
              title: formatEdgeTooltip({
                label: relation.relationType,
                properties: {}
              }),
              properties: {}
            }));

            console.log("转换后的节点数据:", nodes);
            console.log("转换后的边数据:", edges);
            
            setGraphData({ nodes, edges });
          } else {
            setError("返回的图谱数据缺少实体或关系信息");
          }
        } catch (parseError) {
          console.error("解析JSON数据失败:", parseError);
          setError("解析图谱数据失败");
        }
      } else {
        setError("返回的图谱数据格式不正确");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取图谱数据失败");
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, readGraphTool]);

  return {
    graphData,
    isLoading,
    error,
    fetchGraphData,
    hasReadGraphTool: !!readGraphTool
  };
}

// 辅助函数：根据节点类型获取颜色
function getNodeColor(type: string): string {
  const colorMap: Record<string, string> = {
    person: "#3B82F6",  // 蓝色
    concept: "#8B5CF6",  // 紫色
    event: "#EC4899",   // 粉色
    location: "#10B981", // 绿色
    organization: "#F59E0B", // 橙色
    default: "#6B7280"  // 灰色
  };
  
  return colorMap[type?.toLowerCase()] || colorMap.default;
}

// 辅助函数：根据边类型获取颜色
function getEdgeColor(label: string): string {
  const colorMap: Record<string, string> = {
    knows: "#60A5FA",      // 浅蓝
    related_to: "#A78BFA", // 浅紫
    located_in: "#34D399", // 浅绿
    works_for: "#FBBF24",  // 浅橙
    created: "#F472B6",    // 浅粉
    default: "#9CA3AF"     // 浅灰
  };
  
  return colorMap[label?.toLowerCase()] || colorMap.default;
}

// 辅助函数：获取更亮的颜色用于边框
function getLighterColor(color: string): string {
  // 简单实现，实际可以使用颜色处理库
  return color.replace(/^#/, '').match(/.{2}/g)?.map(hex => {
    const num = Math.min(255, parseInt(hex, 16) + 40);
    return num.toString(16).padStart(2, '0');
  }).join('') || color;
}

// 辅助函数：格式化节点提示信息
function formatNodeTooltip(node: any): string {
  let tooltip = `<div><strong>${node.label || node.name || `节点 ${node.id}`}</strong>`;
  if (node.type) {
    tooltip += `<div>类型: ${node.type}</div>`;
  }
  
  if (node.properties) {
    tooltip += '<div>属性:</div><ul>';
    for (const [key, value] of Object.entries(node.properties)) {
      tooltip += `<li>${key}: ${value}</li>`;
    }
    tooltip += '</ul>';
  }
  
  tooltip += '</div>';
  return tooltip;
}

// 辅助函数：格式化边提示信息
function formatEdgeTooltip(edge: any): string {
  let tooltip = `<div><strong>${edge.label || "关系"}</strong>`;
  
  if (edge.properties) {
    tooltip += '<div>属性:</div><ul>';
    for (const [key, value] of Object.entries(edge.properties)) {
      tooltip += `<li>${key}: ${value}</li>`;
    }
    tooltip += '</ul>';
  }
  
  tooltip += '</div>';
  return tooltip;
}