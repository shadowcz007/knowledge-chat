"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect border-primary">
        <DialogHeader>
          <DialogTitle className="text-primary neon-glow">System Configuration</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="mcp-address">MCP Service Address</Label>
            <Input
              id="mcp-address"
              placeholder="Enter MCP service address"
              className="glass-effect"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-url">API URL</Label>
            <Input
              id="api-url"
              placeholder="Enter API URL"
              className="glass-effect"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="Enter API key"
              className="glass-effect"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-model">AI Model</Label>
            <Select>
              <SelectTrigger className="glass-effect">
                <SelectValue placeholder="Select AI model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4">GPT-4</SelectItem>
                <SelectItem value="gpt-3.5">GPT-3.5</SelectItem>
                <SelectItem value="claude">Claude</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button className="w-full neon-glow bg-primary hover:bg-primary/80">
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}