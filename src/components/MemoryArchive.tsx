/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, ChangeEvent } from "react";
import { MemoryNode } from "../types";
import { Search, Trash2, HelpCircle, ArrowRight, Sparkles, RefreshCw } from "lucide-react";

interface MemoryArchiveProps {
  memories: MemoryNode[];
  onSearch: (query: string) => void;
  onForget: (id: string) => void;
  onImprove: () => void;
  isImproving: boolean;
  improvementLogs: string[];
}

export default function MemoryArchive({
  memories,
  onSearch,
  onForget,
  onImprove,
  isImproving,
  improvementLogs,
}: MemoryArchiveProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    onSearch(val);
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toISOString().replace("T", " ").substr(0, 19);
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Search Header and Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h3 className="font-mono text-xs tracking-widest uppercase text-white/50">
            COGNEE MEMORY RECALL & ENRICHMENT
          </h3>
          <p className="text-[11px] text-white/40 font-mono tracking-wider mt-1 uppercase">
            RECALL historical reviews or trigger cognify to build relational clusters
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-improve-cognify"
            onClick={onImprove}
            disabled={isImproving}
            className={`border px-3 py-1.5 font-mono text-[10px] tracking-widest uppercase flex items-center gap-2 cursor-pointer transition-all duration-300 ${
              isImproving
                ? "bg-white/5 text-white/30 border-white/5 cursor-not-allowed"
                : "bg-white text-black border-white hover:bg-black hover:text-white"
            }`}
          >
            {isImproving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                COGNIFYING_DATASPACE...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                IMPROVE_MEMORIES
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Search Panel & Recalled List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <input
              id="search-memory-input"
              type="text"
              placeholder="SEARCH MEMORIES (e.g. compliance, health, approved)..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full bg-black border border-white/15 px-4 py-2.5 font-mono text-xs tracking-wider text-white focus:outline-none focus:border-white transition-colors duration-300 rounded-none placeholder-white/30"
            />
            <Search className="absolute right-3.5 top-3 w-4 h-4 text-white/40" />
          </div>

          {/* Memories Recalled Count */}
          <div className="flex justify-between items-center font-mono text-[10px] text-white/30 uppercase tracking-widest px-1">
            <span>RECALLED_RECORDS: {memories.length}</span>
            {searchQuery && <span>FILTER: "{searchQuery.toUpperCase()}"</span>}
          </div>

          {/* Scrollable list of memory records */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {memories.length === 0 ? (
              <div className="border border-white/5 bg-black p-8 text-center">
                <p className="font-mono text-xs text-white/30 uppercase tracking-widest">
                  No similar memories found in the dataset
                </p>
              </div>
            ) : (
              memories.map((node) => {
                const isViolation = node.content.toLowerCase().includes("rejected") || node.id.includes("rule-02");
                const isRule = node.type === "compliance_rule";

                return (
                  <div
                    id={`memory-card-${node.id}`}
                    key={node.id}
                    className={`border p-4 bg-black/50 transition-all duration-300 flex flex-col justify-between group hover:bg-black ${
                      isViolation
                        ? "border-[#FF3B30]/30 hover:border-[#FF3B30]"
                        : isRule
                        ? "border-white/20 hover:border-white"
                        : "border-white/10 hover:border-white/40"
                    }`}
                  >
                    <div>
                      {/* Record Meta */}
                      <div className="flex items-center justify-between font-mono text-[9px] tracking-widest text-white/30 uppercase mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.2 ${
                              isRule
                                ? "bg-white text-black font-bold"
                                : isViolation
                                ? "bg-[#FF3B30] text-white font-bold"
                                : "bg-white/10 text-white/70"
                            }`}
                          >
                            {node.type.toUpperCase()}
                          </span>
                          <span>{node.id}</span>
                        </div>
                        <span>{formatDate(node.timestamp)}</span>
                      </div>

                      {/* Content */}
                      <p className="text-xs text-white/95 leading-relaxed font-sans mb-3 select-all">
                        {node.content}
                      </p>
                    </div>

                    {/* Footer Actions & Metadata */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5 font-mono text-[9px] tracking-wider uppercase">
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5">
                        {node.tags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-white/5 border border-white/10 text-white/50 px-1.5 py-0.5"
                          >
                            #{tag.toUpperCase()}
                          </span>
                        ))}
                      </div>

                      {/* Weight and Forget button */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-white/40">
                          <span>SIGNIFICANCE:</span>
                          <span className="text-white font-bold">{(node.weight * 100).toFixed(0)}%</span>
                        </div>

                        <button
                          id={`btn-forget-${node.id}`}
                          onClick={() => onForget(node.id)}
                          title="Forget this record from Cognee memory"
                          className="text-white/30 hover:text-[#FF3B30] border border-transparent hover:border-[#FF3B30]/30 px-1.5 py-0.5 flex items-center gap-1 transition-all duration-300 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>FORGET</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Cognify Telemetry Console */}
        <div className="border border-white/10 bg-black p-4 flex flex-col justify-between min-h-[400px]">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
              <span className="font-mono text-[10px] tracking-widest text-white/50 uppercase">
                COGNIFY TELEMETRY
              </span>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                <span className="font-mono text-[8px] text-white/40 uppercase tracking-widest">
                  STREAMING
                </span>
              </div>
            </div>

            <p className="text-[10px] text-white/40 font-mono tracking-wide leading-relaxed uppercase mb-4">
              Cognee's cognify process runs hybrid graph-vector extraction. It aligns text chunks into semantic nodes, bridges them by entity, and registers the connections in its memory schema.
            </p>

            {/* Simulated Live Terminal */}
            <div className="bg-[#080808] border border-white/5 p-3 font-mono text-[9px] leading-relaxed text-white/60 space-y-2 h-[260px] overflow-y-auto select-none">
              {improvementLogs.map((log, index) => {
                let colorClass = "text-white/40";
                if (log.startsWith(">>")) colorClass = "text-white font-medium";
                else if (log.includes("SUCCESS") || log.includes("CREATED")) colorClass = "text-green-400";
                else if (log.includes("ERROR") || log.includes("REJECTED")) colorClass = "text-[#FF3B30]";
                else if (log.includes("CLUSTERS")) colorClass = "text-white/80 font-bold";

                return (
                  <div key={index} className={colorClass}>
                    {log}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-white/5 pt-3 mt-3 flex items-center justify-between font-mono text-[9px] text-white/30 tracking-widest uppercase">
            <span>MEM_ENGINE: V1.4.2</span>
            <span>COGNEE_CLOUD: ACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
