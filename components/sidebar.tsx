"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Network } from "lucide-react";

export default function Sidebar() {
  return (
    <div className="w-80 border-l border-secondary glass-effect">
      <Tabs defaultValue="entities" className="h-full">
        <TabsList className="w-full justify-start p-2 glass-effect">
          <TabsTrigger value="entities" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Entities
          </TabsTrigger>
          <TabsTrigger value="relations" className="flex items-center gap-2">
            <Network className="w-4 h-4" />
            Relations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entities" className="h-[calc(100vh-8rem)]">
          <ScrollArea className="h-full px-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Card key={i} className="mb-4 glass-effect card-hover">
                <CardHeader className="p-4">
                  <CardTitle className="text-sm text-primary">Entity #{i + 1}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm text-muted-foreground">
                    Memory fragment details and metadata...
                  </p>
                </CardContent>
              </Card>
            ))}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="relations" className="h-[calc(100vh-8rem)]">
          <ScrollArea className="h-full px-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Card key={i} className="mb-4 glass-effect card-hover">
                <CardHeader className="p-4">
                  <CardTitle className="text-sm text-primary">Relation #{i + 1}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm text-muted-foreground">
                    Connection type and strength metrics...
                  </p>
                </CardContent>
              </Card>
            ))}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}