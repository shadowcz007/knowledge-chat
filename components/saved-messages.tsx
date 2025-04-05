"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2, Brain, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMCPContext } from "@/contexts/mcp-context";
import { useGraphService } from "@/services/graph-service";

interface SavedMessage {
  content: string;
  timestamp: string;
}

interface SavedMessagesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SavedMessages({ open, onOpenChange }: SavedMessagesProps) {
  const [savedMessages, setSavedMessages] = useState<SavedMessage[]>([]);
  const [processingMessageIndex, setProcessingMessageIndex] = useState<number | null>(null);
  const { toast } = useToast();
  const { tools } = useMCPContext();
  const { fetchGraphData } = useGraphService();

  // 获取MCP工具
  const createEntitiesTools = tools.find(tool => tool.name === "create_entities");
  const createRelationsTools = tools.find(tool => tool.name === "create_relations");

  useEffect(() => {
    if (open) {
      const messages = JSON.parse(localStorage.getItem("savedMessages") || "[]");
      setSavedMessages(messages);
    }
  }, [open]);

  const deleteMessage = (index: number) => {
    const newMessages = [...savedMessages];
    newMessages.splice(index, 1);
    setSavedMessages(newMessages);
    localStorage.setItem("savedMessages", JSON.stringify(newMessages));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("zh-CN");
  };

  // 提取知识并创建图谱
  const extractKnowledgeAndCreateGraph = async (content: string, index: number) => {
    if (!createEntitiesTools || !createRelationsTools) {
      toast({
        title: "工具缺失",
        description: "缺少创建实体或关系的工具，请检查MCP连接",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessingMessageIndex(index);
      
      // 获取系统配置
      const savedConfig = localStorage.getItem("systemConfig");
      if (!savedConfig) {
        throw new Error("系统配置不存在");
      }
      
      const config = JSON.parse(savedConfig);
      if (!config.apiUrl || !config.apiKey || !config.aiModel) {
        throw new Error("API配置不完整");
      }

      // 构建提取知识的提示
      const extractionPrompt = [
        {
          role: "system",
          content: `你是一个知识图谱提取专家。请从以下文本中提取实体和关系，并使用提供的工具函数返回结果。
          
          实体类型可以是：person(人物), organization(组织), location(地点), concept(概念), event(事件)等。
          关系类型可以是：knows(认识), works_for(为...工作), located_in(位于), related_to(相关), created(创建)等。
          
          请尽可能提取完整的实体和关系信息。`
        },
        {
          role: "user",
          content: content
        }
      ];

      // 准备知识提取工具定义
      const extractKnowledgeTool = {
        type: 'function',
        function: {
          name: "extract_knowledge",
          description: "从文本中提取知识实体和关系",
          parameters: {
            type: "object",
            properties: {
              entities: {
                type: "array",
                description: "提取的实体列表",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "实体名称" },
                    entityType: { type: "string", description: "实体类型" },
                    observations: { 
                      type: "array", 
                      description: "实体相关描述",
                      items: { type: "string" }
                    }
                  },
                  required: ["name", "entityType"]
                }
              },
              relations: {
                type: "array",
                description: "提取的关系列表",
                items: {
                  type: "object",
                  properties: {
                    from: { type: "string", description: "源实体名称" },
                    to: { type: "string", description: "目标实体名称" },
                    relationType: { type: "string", description: "关系类型" }
                  },
                  required: ["from", "to", "relationType"]
                }
              }
            },
            required: ["entities", "relations"]
          }
        }
      };

      // 调用API提取知识
      const response = await fetch(config.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.aiModel,
          messages: extractionPrompt,
          tools: [extractKnowledgeTool],
          temperature: 0.2
        })
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      let extractedData;
      
      // 检查是否有工具调用
      if (data.choices[0].message.tool_calls && data.choices[0].message.tool_calls.length > 0) {
        const toolCall = data.choices[0].message.tool_calls[0];
        if (toolCall.function.name === "extract_knowledge") {
          try {
            extractedData = JSON.parse(toolCall.function.arguments);
          } catch (e) {
            console.error("解析工具调用参数失败:", e);
            // 尝试修复不完整的JSON
            const fixedJson = toolCall.function.arguments
              .replace(/,\s*}$/, '}')
              .replace(/,\s*]$/, ']');
            extractedData = JSON.parse(fixedJson);
          }
        }
      } else {
        // 尝试从普通内容中解析JSON
        const extractedContent = data.choices[0].message.content;
        try {
          const jsonMatch = extractedContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            extractedData = JSON.parse(jsonMatch[0]);
          } else {
            extractedData = JSON.parse(extractedContent);
          }
        } catch (e) {
          console.error("从内容中解析JSON失败:", e);
          throw new Error("无法从模型响应中提取有效的知识数据");
        }
      }

      // 验证提取的数据
      if (!extractedData || !extractedData.entities || !extractedData.relations) {
        throw new Error("提取的数据格式不正确");
      }

      // 创建实体
      if (extractedData.entities.length > 0) {
        await createEntitiesTools.execute({
          entities: extractedData.entities
        });
        
        toast({
          title: "实体创建成功",
          description: `已创建 ${extractedData.entities.length} 个实体`,
        });
      } else {
        toast({
          title: "提示",
          description: "未从文本中提取到实体",
        });
      }

      // 创建关系
      if (extractedData.relations.length > 0) {
        await createRelationsTools.execute({
          relations: extractedData.relations
        });
        
        toast({
          title: "关系创建成功",
          description: `已创建 ${extractedData.relations.length} 个关系`,
        });
      } else {
        toast({
          title: "提示",
          description: "未从文本中提取到关系",
        });
      }

      // 刷新图谱
      await fetchGraphData();
      
      // 添加延迟二次刷新以确保数据更新
      setTimeout(async () => {
        await fetchGraphData();
        
        // 添加成功提示
        toast({
          title: "图谱已更新",
          description: "知识图谱数据已成功刷新",
        });
      }, 500);

    } catch (error) {
      console.error("提取知识或创建图谱失败:", error);
      toast({
        title: "提取知识失败",
        description: error instanceof Error ? error.message : "提取知识或创建图谱时出错",
        variant: "destructive",
      });
    } finally {
      setProcessingMessageIndex(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect border-primary sm:max-w-[600px] h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-primary neon-glow">已保存的回复</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          {savedMessages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              暂无保存的回复
            </div>
          ) : (
            <div className="space-y-4">
              {savedMessages.map((message, index) => (
                <div key={index} className="bg-secondary/20 p-4 rounded-lg relative">
                  <div className="text-xs text-muted-foreground mb-2">
                    {formatDate(message.timestamp)}
                  </div>
                  <div className="whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-primary"
                      onClick={() => extractKnowledgeAndCreateGraph(message.content, index)}
                      disabled={processingMessageIndex === index}
                    >
                      {processingMessageIndex === index ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Brain className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMessage(index)}
                      disabled={processingMessageIndex === index}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {processingMessageIndex === index && (
                    <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center">
                      <div className="text-sm text-white bg-black/50 px-3 py-1 rounded-md">
                        正在提取知识并创建图谱...
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}