"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMessage(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}