"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// 定义配置类型
interface SystemConfig {
  mcpAddress: string;
  apiUrl: string;
  apiKey: string;
  aiModel: string;
}

// 默认配置
const DEFAULT_CONFIG: SystemConfig = {
  mcpAddress: "http://0.0.0.0:6688",
  apiUrl: "",
  apiKey: "",
  aiModel: "gpt-4",
};

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfigSaved: (config: SystemConfig) => void;
}

export default function SettingsDialog({ open, onOpenChange, onConfigSaved }: SettingsDialogProps) {
  const [config, setConfig] = useState<SystemConfig>(DEFAULT_CONFIG);
  const { toast } = useToast();

  // 组件加载时从本地存储读取配置
  useEffect(() => {
    const savedConfig = localStorage.getItem("systemConfig");
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (error) {
        console.error("无法解析保存的配置:", error);
      }
    }
  }, []);

  // 处理输入变化
  const handleInputChange = (field: keyof SystemConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  // 保存配置
  const saveConfiguration = () => {
    localStorage.setItem("systemConfig", JSON.stringify(config));
    toast({
      title: "配置已保存",
      description: "系统配置已成功保存到本地存储。",
    });
    onConfigSaved(config);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect border-primary">
        <DialogHeader>
          <DialogTitle className="text-primary neon-glow">系统配置</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="mcp-address">MCP 服务地址</Label>
            <Input
              id="mcp-address"
              value={config.mcpAddress}
              onChange={(e) => handleInputChange("mcpAddress", e.target.value)}
              placeholder="输入 MCP 服务地址"
              className="glass-effect"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-url">API URL</Label>
            <Input
              id="api-url"
              value={config.apiUrl}
              onChange={(e) => handleInputChange("apiUrl", e.target.value)}
              placeholder="输入 API URL"
              className="glass-effect"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key">API 密钥</Label>
            <Input
              id="api-key"
              type="password"
              value={config.apiKey}
              onChange={(e) => handleInputChange("apiKey", e.target.value)}
              placeholder="输入 API 密钥"
              className="glass-effect"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-model">AI 模型</Label>
            <Select 
              value={config.aiModel}
              onValueChange={(value) => handleInputChange("aiModel", value)}
            >
              <SelectTrigger className="glass-effect">
                <SelectValue placeholder="选择 AI 模型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Qwen/Qwen2-7B-Instruct">Qwen/Qwen2-7B-Instruct</SelectItem>
                <SelectItem value="gpt-3.5">GPT-3.5</SelectItem>
                <SelectItem value="claude">Claude</SelectItem>
                <SelectItem value="deepseek-ai/DeepSeek-V3">DeepSeek-V3</SelectItem>
                <SelectItem value="deepseek-ai/DeepSeek-R1">DeepSeek-R1</SelectItem>
                <SelectItem value="meta-llama/Llama-3.3-70B-Instruct">Llama-3.3-70B</SelectItem>
                <SelectItem value="Qwen/Qwen2.5-72B-Instruct">Qwen2.5-72B</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            className="w-full neon-glow bg-primary hover:bg-primary/80"
            onClick={saveConfiguration}
          >
            保存配置
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}