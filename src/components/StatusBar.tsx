/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConnectionStatus } from "../types";

interface StatusBarProps {
  totalMemories: number;
  totalRecalls: number;
  accuracy: string;
  connectionStatus: ConnectionStatus;
  onRefreshConnection: () => void;
}

export default function StatusBar({
  totalMemories,
  totalRecalls,
  accuracy,
  connectionStatus,
  onRefreshConnection,
}: StatusBarProps) {
  const isFallback = connectionStatus === "LOCAL_FALLBACK";
  const isChecking = connectionStatus === "CHECKING";

  return (
    <div
      id="top-status-bar"
      className="w-full h-12 bg-black border-b border-white/20 text-xs flex flex-col md:flex-row items-center justify-between px-6 z-10 font-mono tracking-widest text-[#FFFFFF]/75 select-none"
    >
      <div className="flex flex-wrap items-center gap-4 md:gap-8 justify-center md:justify-start">
        <span className="text-[10px] tracking-[0.2em] text-white/50 uppercase font-bold">MNEMOSYNE v1.0.4</span>
        <div className="text-[#FFFFFF]/15 hidden md:block">|</div>
        <div id="stat-memories" className="flex items-center gap-2">
          <span className="text-white/40 uppercase text-[10px]">MEMORIES:</span>
          <span className="text-white text-[10px] font-mono">{totalMemories}</span>
        </div>
        <div id="stat-recalls" className="flex items-center gap-2">
          <span className="text-white/40 uppercase text-[10px]">RECALLS:</span>
          <span className="text-white text-[10px] font-mono">{totalRecalls}</span>
        </div>
        <div id="stat-accuracy" className="flex items-center gap-2">
          <span className="text-white/40 uppercase text-[10px]">ACCURACY:</span>
          <span className="text-white text-[10px] font-mono">{accuracy}</span>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-2 md:mt-0">
        <div className="flex items-center gap-3">
          <button
            id="connection-status-badge"
            onClick={onRefreshConnection}
            title="Click to check connection status"
            className={`px-2 py-0.5 border text-[9px] uppercase tracking-tighter cursor-pointer transition-all duration-300 font-mono ${
              isChecking
                ? "border-yellow-500 text-yellow-500 hover:bg-yellow-500/10"
                : isFallback
                ? "border-[#FF3B30] text-[#FF3B30] hover:bg-[#FF3B30]/10"
                : "border-white text-white hover:bg-white hover:text-black"
            }`}
          >
            COGNEE CLOUD: {isChecking ? "CHECKING CONNECTION..." : isFallback ? "LOCAL FALLBACK" : "CONNECTED"}
          </button>
          <span className={`w-2.5 h-2.5 rounded-full ${isChecking ? "bg-yellow-500 animate-pulse" : isFallback ? "bg-[#FF3B30]" : "bg-white"}`} />
        </div>
      </div>
    </div>
  );
}
