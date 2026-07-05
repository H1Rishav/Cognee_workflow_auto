/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { MemoryNode, MemoryLink } from "../types";

interface KnowledgeGraphProps {
  nodes: MemoryNode[];
  onSelectNode?: (node: MemoryNode) => void;
  selectedNodeId?: string | null;
  recallHighlightIds?: string[];
}

interface VisualNode {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  weight: number;
}

export default function KnowledgeGraph({
  nodes,
  onSelectNode,
  selectedNodeId,
  recallHighlightIds = [],
}: KnowledgeGraphProps) {
  const [visualNodes, setVisualNodes] = useState<VisualNode[]>([]);
  const [visualLinks, setVisualLinks] = useState<MemoryLink[]>([]);
  const visualNodesRef = useRef<VisualNode[]>([]);
  const visualLinksRef = useRef<MemoryLink[]>([]);
  const prevNodeIdsRef = useRef<string[]>([]);
  const alphaRef = useRef<number>(0);
  const isLoopingRef = useRef<boolean>(false);
  const animationFrameIdRef = useRef<number | null>(null);

  // Reheat and start loop if needed
  const reheatSimulation = () => {
    alphaRef.current = 0.3; // Reheat target
    if (!isLoopingRef.current) {
      isLoopingRef.current = true;
      runTick();
    }
  };

  const runTick = () => {
    if (alphaRef.current <= 0.005) {
      alphaRef.current = 0;
      isLoopingRef.current = false;
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      return;
    }

    // Alpha decay - slows down and cools organically
    alphaRef.current *= 0.96;

    setVisualNodes((prev) => {
      const nodesCopy = prev.map((vn) => ({ ...vn }));
      const links = visualLinksRef.current;

      // 1. Repulsion force between all nodes (prevent overlapping clusters)
      for (let i = 0; i < nodesCopy.length; i++) {
        const nodeA = nodesCopy[i];
        for (let j = i + 1; j < nodesCopy.length; j++) {
          const nodeB = nodesCopy[j];
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const distSq = dx * dx + dy * dy || 1;
          const dist = Math.sqrt(distSq);
          if (dist < 150) {
            const force = ((150 - dist) / dist) * 0.25 * alphaRef.current;
            nodeA.vx -= dx * force;
            nodeA.vy -= dy * force;
            nodeB.vx += dx * force;
            nodeB.vy += dy * force;
          }
        }
      }

      // 2. Link force (pull connected node pairs together)
      links.forEach((link) => {
        const sourceNode = nodesCopy.find((n) => n.id === link.source);
        const targetNode = nodesCopy.find((n) => n.id === link.target);
        if (sourceNode && targetNode) {
          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const desiredDist = 120;
          const force = ((dist - desiredDist) / dist) * 0.08 * alphaRef.current;
          const fx = dx * force;
          const fy = dy * force;
          sourceNode.vx += fx;
          sourceNode.vy += fy;
          targetNode.vx -= fx;
          targetNode.vy -= fy;
        }
      });

      // 3. Gravity center force
      const centerX = 400;
      const centerY = 200;
      nodesCopy.forEach((node) => {
        const dx = centerX - node.x;
        const dy = centerY - node.y;
        node.vx += dx * 0.01 * alphaRef.current;
        node.vy += dy * 0.01 * alphaRef.current;
      });

      // 4. Update coordinates with high-friction stabilization
      const next = nodesCopy.map((vn) => {
        const friction = 0.82;
        let nextVx = vn.vx * friction;
        let nextVy = vn.vy * friction;

        let nextX = vn.x + nextVx;
        let nextY = vn.y + nextVy;

        const padding = 35;
        if (nextX < padding) {
          nextX = padding;
          nextVx = 0;
        } else if (nextX > 800 - padding) {
          nextX = 800 - padding;
          nextVx = 0;
        }

        if (nextY < padding) {
          nextY = padding;
          nextVy = 0;
        } else if (nextY > 400 - padding) {
          nextY = 400 - padding;
          nextVy = 0;
        }

        return {
          ...vn,
          x: nextX,
          y: nextY,
          vx: nextVx,
          vy: nextVy,
        };
      });

      visualNodesRef.current = next;
      return next;
    });

    animationFrameIdRef.current = requestAnimationFrame(runTick);
  };

  // Initialize and update positions
  useEffect(() => {
    const width = 800;
    const height = 400;
    const padding = 60;

    // Detect if a genuinely new node was added to restart physics simulation
    const currentNodeIds = nodes.map((n) => n.id);
    const hasNewNode = currentNodeIds.some((id) => !prevNodeIdsRef.current.includes(id));
    prevNodeIdsRef.current = currentNodeIds;

    const mapped = nodes.map((n, index) => {
      const existing = visualNodesRef.current.find((vn) => vn.id === n.id);
      if (existing) {
        return {
          ...existing,
          weight: n.weight,
        };
      }

      const angle = (index / (nodes.length || 1)) * Math.PI * 2;
      const radius = 100 + Math.random() * 80;
      
      const x = width / 2 + Math.cos(angle) * radius + (Math.random() - 0.5) * 40;
      const y = height / 2 + Math.sin(angle) * radius + (Math.random() - 0.5) * 40;

      let size = 6;
      if (n.type === "compliance_rule") size = 10;
      else if (n.type === "review") size = 8;

      return {
        id: n.id,
        label: n.id,
        type: n.type,
        x: Math.max(padding, Math.min(width - padding, x)),
        y: Math.max(padding, Math.min(height - padding, y)),
        vx: (Math.random() - 0.5) * 2.0,
        vy: (Math.random() - 0.5) * 2.0,
        size,
        weight: n.weight,
      };
    });

    visualNodesRef.current = mapped;
    setVisualNodes(mapped);

    // Extract links
    const links: MemoryLink[] = [];
    nodes.forEach((node) => {
      if (node.links) {
        node.links.forEach((targetId) => {
          if (nodes.some((n) => n.id === targetId)) {
            links.push({
              source: node.id,
              target: targetId,
            });
          }
        });
      }
    });
    visualLinksRef.current = links;
    setVisualLinks(links);

    if (hasNewNode || (mapped.length > 0 && alphaRef.current === 0)) {
      reheatSimulation();
    }
  }, [nodes]);

  // Handle unmount cleanup
  useEffect(() => {
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, []);

  // Helper to find visual node coordinates for link lines
  const findNodeCoords = (id: string) => {
    const node = visualNodes.find((vn) => vn.id === id);
    return node ? { x: node.x, y: node.y } : { x: 0, y: 0 };
  };

  return (
    <div className="relative w-full border border-white/10 bg-black overflow-hidden h-[420px] flex flex-col justify-end">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,#ffffff11_1px,transparent_1px),linear-gradient(to_bottom,#ffffff11_1px,transparent_1px)] bg-[size:24px_24px]" />

      {/* Swiss corner decorations */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-white/30" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-white/30" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-white/30" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-white/30" />

      {/* Technical coordinate specs */}
      <div className="absolute top-3 left-4 font-mono text-[9px] text-white/30 tracking-widest uppercase">
        HYBRID COGNITIVE GRAPH-VECTOR STORE
      </div>
      <div className="absolute top-3 right-4 font-mono text-[9px] text-white/30 tracking-widest uppercase">
        LIVE_NODES: {nodes.length} · SCALE: 2^128
      </div>

      {/* SVG graph viewport */}
      <svg className="w-full h-full cursor-crosshair" viewBox="0 0 800 400">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Draw Links (Edges) */}
        {visualLinks.map((link, idx) => {
          const from = findNodeCoords(link.source);
          const to = findNodeCoords(link.target);
          if (from.x === 0 || to.x === 0) return null;

          const isHighlighted =
            recallHighlightIds.includes(link.source) ||
            recallHighlightIds.includes(link.target);

          const isSelected = selectedNodeId === link.source || selectedNodeId === link.target;

          return (
            <line
              key={`link-${idx}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={
                isHighlighted
                  ? "#FF3B30"
                  : isSelected
                  ? "#FFFFFF"
                  : "rgba(255, 255, 255, 0.15)"
              }
              strokeWidth={isHighlighted ? "1.5" : isSelected ? "1" : "0.5"}
              strokeDasharray={isHighlighted ? "3,3" : "none"}
              className="transition-colors duration-300"
            />
          );
        })}

        {/* Draw Nodes */}
        {visualNodes.map((vNode) => {
          const isSelected = selectedNodeId === vNode.id;
          const isHighlighted = recallHighlightIds.includes(vNode.id);
          const rawNode = nodes.find((n) => n.id === vNode.id);
          
          let color = "rgba(255, 255, 255, 0.3)";
          if (vNode.type === "compliance_rule") {
            color = isHighlighted ? "#FF3B30" : "rgba(255, 255, 255, 0.85)";
          } else if (vNode.type === "review") {
            const isRejected = rawNode?.content.toLowerCase().includes("rejected");
            color = isRejected ? "#FF3B30" : "rgba(255, 255, 255, 0.5)";
          }

          if (isSelected) color = "#FFFFFF";

          return (
            <g
              key={vNode.id}
              className="group cursor-pointer"
              transform={`translate(${vNode.x}, ${vNode.y})`}
              onClick={() => {
                if (onSelectNode && rawNode) onSelectNode(rawNode);
              }}
            >
              {/* Invisible stable hover hitbox - prevents scaling from affecting hover boundaries */}
              <circle
                cx={0}
                cy={0}
                r={Math.max(vNode.size + 6, 14)}
                fill="transparent"
                className="pointer-events-auto"
              />

              {/* Pulsing selection aura (Native SVG animations prevent CSS scaling origin flicker) */}
              {(isSelected || isHighlighted) && (
                <circle
                  cx={0}
                  cy={0}
                  r={vNode.size + 2}
                  fill="none"
                  stroke={isHighlighted ? "#FF3B30" : "#FFFFFF"}
                  strokeWidth="0.75"
                  opacity="0.8"
                >
                  <animate
                    attributeName="r"
                    values={`${vNode.size + 2};${vNode.size + 16}`}
                    dur="2.5s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.8;0"
                    dur="2.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}

              {/* Outer static glow/halo (vector background avoids expensive browser-rendering SVG filters) */}
              {(isSelected || isHighlighted) && (
                <circle
                  cx={0}
                  cy={0}
                  r={vNode.size + 4}
                  fill={isHighlighted ? "rgba(255, 59, 48, 0.15)" : "rgba(255, 255, 255, 0.1)"}
                  stroke={isHighlighted ? "rgba(255, 59, 48, 0.3)" : "rgba(255, 255, 255, 0.2)"}
                  strokeWidth="1"
                />
              )}

              {/* Core Node circle */}
              <circle
                cx={0}
                cy={0}
                r={isSelected ? vNode.size + 3 : vNode.size}
                fill={color}
                stroke={isSelected ? "#FFFFFF" : isHighlighted ? "#FF3B30" : "transparent"}
                strokeWidth="1.5"
                className="transition-transform duration-300 group-hover:scale-125 group-hover:fill-white"
                style={{ transformOrigin: "0px 0px" }}
              />

              {/* Text Label on hover or if selected/highlighted */}
              <text
                x={12}
                y={4}
                fill={isHighlighted ? "#FF3B30" : isSelected ? "#FFFFFF" : "rgba(255, 255, 255, 0.4)"}
                fontSize="9px"
                fontFamily="monospace"
                letterSpacing="1px"
                className={`pointer-events-none transition-all duration-300 font-medium ${
                  isSelected || isHighlighted ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}
              >
                {vNode.label.toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Key Legend bottom border */}
      <div className="w-full border-t border-white/10 bg-black/90 py-1.5 px-4 flex justify-between font-mono text-[9px] text-white/40 tracking-widest uppercase">
        <div className="flex gap-4">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-white rounded-full inline-block" /> COMPLIANCE_RULES
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-white/40 rounded-full inline-block" /> HISTORICAL_REVIEWS
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-[#FF3B30] rounded-full inline-block" /> HEALTH_VIOLATIONS / ALERTS
          </span>
        </div>
        <div>
          CLICK_NODES_TO_DECONSTRUCT
        </div>
      </div>
    </div>
  );
}
