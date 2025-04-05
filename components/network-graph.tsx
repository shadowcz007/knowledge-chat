"use client";

import { useEffect, useRef } from 'react';
import { Network } from 'vis-network';

export default function NetworkGraph() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Sample data - replace with real data
    const nodes = [
      { id: 1, label: "Memory Core", shape: "hexagon", color: { background: "#3B82F6", border: "#60A5FA" } },
      { id: 2, label: "Neural Link", shape: "hexagon", color: { background: "#8B5CF6", border: "#A78BFA" } },
      { id: 3, label: "Data Node", shape: "hexagon", color: { background: "#EC4899", border: "#F472B6" } },
    ];

    const edges = [
      { from: 1, to: 2, arrows: "to", color: { color: "#60A5FA", highlight: "#93C5FD" }, width: 2 },
      { from: 2, to: 3, arrows: "to", color: { color: "#A78BFA", highlight: "#C4B5FD" }, width: 2 },
      { from: 1, to: 3, arrows: "to", color: { color: "#F472B6", highlight: "#F9A8D4" }, width: 2 },
    ];

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
          type: "continuous",
        },
        shadow: {
          enabled: true,
          color: "rgba(59, 130, 246, 0.3)",
          size: 10,
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
      },
    };

    const network = new Network(containerRef.current, { nodes, edges }, options);

    return () => {
      network.destroy();
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full network-container" />;
}