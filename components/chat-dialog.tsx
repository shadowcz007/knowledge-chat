"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bookmark, BookmarkCheck, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMCPContext } from "@/contexts/mcp-context";
import { useGraphService } from "@/services/graph-service"; 

interface Message {
  role: "user" | "assistant";
  content: string;
  id: string;
}

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ChatDialog({ open, onOpenChange }: ChatDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [savedMessageIds, setSavedMessageIds] = useState<Set<string>>(new Set());
  const [isExtractingKnowledge, setIsExtractingKnowledge] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { tools,prompts } = useMCPContext();
  const { fetchGraphData } = useGraphService(); 

  // 获取MCP工具
  const createEntitiesTools = tools.find(tool => tool.name === "create_entities");
  const createRelationsTools = tools.find(tool => tool.name === "create_relations");
  const updateUserPreferenceTools = tools.find(tool => tool.name === "update_user_preference");
  const userPreferencePrompt = prompts.find(prompt => prompt.name === "user_preference_extract_prompt");

  // 加载已保存的消息
  useEffect(() => {
    if (open) {
      loadSavedMessages();
    }
  }, [open]);

  // 加载已保存的消息并标记
  const loadSavedMessages = () => {
    try {
      const savedMessages = JSON.parse(localStorage.getItem("savedMessages") || "[]");
      const savedContentSet = new Set(savedMessages.map((msg: any) => msg.content));
      
      const savedIds = new Set<string>();
      messages.forEach(msg => {
        if (msg.role === "assistant" && savedContentSet.has(msg.content)) {
          savedIds.add(msg.id);
        }
      });
      
      setSavedMessageIds(savedIds);
    } catch (error) {
      console.error("加载已保存消息失败:", error);
    }
  };

  // 自动滚动到底部
  useEffect(() => {
    if (scrollAreaRef.current) {
      // 使用setTimeout确保DOM更新后再滚动
      setTimeout(() => {
        const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }, 0);
    }
  }, [messages]);

  // 发送消息
  const sendMessage = async () => {
    if (!input.trim()) return;
    
    // 获取系统配置
    const savedConfig = localStorage.getItem("systemConfig");
    if (!savedConfig) {
      toast({
        title: "配置错误",
        description: "请先在系统设置中配置API信息",
        variant: "destructive",
      });
      return;
    }
    
    const config = JSON.parse(savedConfig);
    if (!config.apiUrl || !config.apiKey || !config.aiModel) {
      toast({
        title: "配置错误",
        description: "API配置不完整，请检查系统设置",
        variant: "destructive",
      });
      return;
    }
    
    // 添加用户消息
    const userMessage: Message = {
      role: "user",
      content: input,
      id: Date.now().toString(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    
    // 创建AI消息占位
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessagePlaceholder: Message = {
      role: "assistant",
      content: "",
      id: aiMessageId,
    };
    
    setMessages(prev => [...prev, aiMessagePlaceholder]);
    
    try {
      // 准备对话历史
      const chatHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      chatHistory.push({
        role: "user",
        content: input
      });
      
      // 创建API请求体 - 不包含工具
      const requestBody = {
        model: config.aiModel,
        messages: chatHistory,
        stream: true
      };
      
      // 创建API请求
      const response = await fetch(config.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
      }
      
      // 处理流式响应
      const reader = response.body?.getReader();
      if (reader) {
        let aiResponse = "";
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // 解析流式数据
          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split("\n");
          
          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const data = JSON.parse(line.substring(6));
                if (data.choices && data.choices.length > 0) {
                  const choice = data.choices[0];
                  const delta = choice.delta;
                  
                  // 处理普通内容
                  if (delta?.content) {
                    aiResponse += delta.content;
                    setMessages(prev => 
                      prev.map(msg => 
                        msg.id === aiMessageId 
                          ? { ...msg, content: aiResponse } 
                          : msg
                      )
                    );
                  }
                }
              } catch (e) {
                console.error("解析流式数据失败:", e);
              }
            }
          }
        }
      }

      // 提取用户偏好
      await extractUserPreference(userMessage);

    } catch (error) {
      console.error("API请求错误:", error);
      toast({
        title: "请求失败",
        description: error instanceof Error ? error.message : "与AI服务通信时出错",
        variant: "destructive",
      });
      
      // 更新错误消息
      setMessages(prev => 
        prev.map(msg => 
          msg.id === aiMessageId 
            ? { ...msg, content: "抱歉，请求失败，请稍后再试。" } 
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 检查消息是否已保存
  const isMessageSaved = (message: Message) => {
    return savedMessageIds.has(message.id);
  };

  // 保存消息
  const saveMessage = async (message: Message) => {
    // 仅保存AI回复
    if (message.role !== "assistant" || !message.content.trim()) return;
    
    const savedMessages = JSON.parse(localStorage.getItem("savedMessages") || "[]");
    
    // 检查是否已经保存过相同内容的消息
    const isDuplicate = savedMessages.some((savedMsg: any) => 
      savedMsg.content === message.content
    );
    
    if (!isDuplicate) {
      savedMessages.push({
        content: message.content,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem("savedMessages", JSON.stringify(savedMessages));
      
      // 更新已保存消息ID集合
      setSavedMessageIds(prev => {
        const newSet = new Set(prev);
        newSet.add(message.id);
        return newSet;
      });
      
      toast({
        title: "已保存",
        description: "回复已保存到本地存储",
      });

      // 提取知识并创建实体和关系
      await extractKnowledgeAndCreateGraph(message.content);
    } else {
      toast({
        title: "已存在",
        description: "该回复已经保存过",
      });
    }
  };

  // 提取知识并创建图谱
  const extractKnowledgeAndCreateGraph = async (content: string) => {
    if (!createEntitiesTools || !createRelationsTools) {
      toast({
        title: "工具缺失",
        description: "缺少创建实体或关系的工具，请检查MCP连接",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsExtractingKnowledge(true);
      
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
        //   tool_choice: { type: "function", function: { name: "extract_knowledge" } }, // 强制使用工具
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
      setIsExtractingKnowledge(false);
    }
  };

  const extractUserPreference = async (message: Message) => {
    if (!updateUserPreferenceTools || !userPreferencePrompt) {
      console.error("缺少用户偏好相关工具或提示");
      return;
    }

    try {
      // 获取系统配置
      const savedConfig = localStorage.getItem("systemConfig");
      if (!savedConfig) {
        throw new Error("系统配置不存在");
      }
      
      const config = JSON.parse(savedConfig);
      if (!config.apiUrl || !config.apiKey || !config.aiModel) {
        throw new Error("API配置不完整");
      }

      // 获取用户偏好提取提示
      const {messages} = await userPreferencePrompt.execute({
        message: JSON.stringify(message)
      });

      // 调用API提取用户偏好
      const response = await fetch(config.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.aiModel,
          messages: [ 
            {
              role: "user",
              content: messages[0].content.text
            }
          ],
          temperature: 0.2
        })
      });
      
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const preferenceContent = data.choices[0].message.content;
      
      try {
        // 解析返回的JSON数据
        const preferences = JSON.parse(preferenceContent);
        
        // 更新用户偏好
        await updateUserPreferenceTools.execute({
          preferences: preferences
        });

        // 添加成功提示
        toast({
          title: "用户偏好已更新",
          description: "已成功提取并更新用户偏好",
        });

      } catch (e) {
        console.error("解析用户偏好数据失败:", e);
        throw new Error("无法解析用户偏好数据");
      }
    } catch (error) {
      console.error("提取用户偏好失败:", error);
      toast({
        title: "提取用户偏好失败",
        description: error instanceof Error ? error.message : "提取用户偏好时出错",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect border-primary sm:max-w-[500px] h-[600px] flex flex-col">
        <div className="text-xl font-bold text-primary neon-glow mb-2">AI 助手</div>
        
        {/* 消息区域 */}
        <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                发送消息开始对话
              </div>
            ) : (
              messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div 
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.role === "user" 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-secondary/30 text-foreground"
                    } relative group`}
                  >
                    <div className="whitespace-pre-wrap break-words">
                      {message.content || (message.role === "assistant" && isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : "")}
                    </div>
                    
                    {/* 保存按钮 - 仅对AI消息显示 */}
                    {message.role === "assistant" && message.content && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`absolute -right-10 top-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                          isMessageSaved(message) ? "text-primary" : "text-muted-foreground"
                        } ${isExtractingKnowledge ? "pointer-events-none" : ""}`}
                        onClick={() => saveMessage(message)}
                        disabled={isExtractingKnowledge}
                      >
                        {isExtractingKnowledge ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isMessageSaved(message) ? (
                          <BookmarkCheck className="h-4 w-4" />
                        ) : (
                          <Bookmark className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
            
            {/* 知识提取状态 */}
            {isExtractingKnowledge && (
              <div className="text-center text-sm text-muted-foreground animate-pulse">
                正在提取知识并创建图谱...
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* 输入区域 */}
        <div className="flex items-center gap-2 pt-4">
          <Input
            placeholder="输入消息..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            disabled={isLoading}
            className="glass-effect"
          />
          <Button 
            onClick={sendMessage} 
            disabled={isLoading || !input.trim()}
            className="bg-primary hover:bg-primary/80"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
