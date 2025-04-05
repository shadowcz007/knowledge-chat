"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bookmark, BookmarkCheck, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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
      
      // 更新已保存消息ID集合
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
    
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    
    // 准备AI消息占位
    const aiMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", id: aiMessageId },
    ]);
    
    try {
      // 准备API请求
      const response = await fetch(`${config.apiUrl}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.aiModel,
          messages: [
            ...messages.map(({ role, content }) => ({ role, content })),
            { role: "user", content: input }
          ],
          stream: true,
          max_tokens: 1000,
          temperature: 0.7,
          top_p: 0.7,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }
      
      // 处理流式响应
      const reader = response.body?.getReader();
      if (!reader) throw new Error("无法读取响应流");
      
      let aiResponse = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // 解析流式数据
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split("\n").filter(line => line.trim() !== "");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.substring(6);
            if (data === "[DONE]") continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || parsed.choices[0]?.message?.content || "";
              if (content) {
                aiResponse += content;
                // 更新AI消息内容
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === aiMessageId 
                      ? { ...msg, content: aiResponse } 
                      : msg
                  )
                );
              }
            } catch (e) {
              console.error("解析流式数据失败:", e);
            }
          }
        }
      }
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
  const saveMessage = (message: Message) => {
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
    } else {
      toast({
        title: "已存在",
        description: "该回复已经保存过",
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
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="whitespace-pre-wrap break-words">
                        {message.content || (isLoading && message.role === "assistant" ? "思考中..." : "")}
                      </div>
                      
                      {message.role === "assistant" && message.content && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={`h-5 w-5 -mt-1 -mr-1 ${
                            isMessageSaved(message) 
                              ? "text-primary" 
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                          onClick={() => saveMessage(message)}
                        >
                          {isMessageSaved(message) ? (
                            <BookmarkCheck className="h-4 w-4" />
                          ) : (
                            <Bookmark className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        
        {/* 输入区域 */}
        <div className="flex items-center gap-2 mt-4">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入消息..."
            className="glass-effect"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            disabled={isLoading}
          />
          <Button 
            onClick={sendMessage} 
            disabled={isLoading || !input.trim()}
            className="bg-primary hover:bg-primary/80"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
