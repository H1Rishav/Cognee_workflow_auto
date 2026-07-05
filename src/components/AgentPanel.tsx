/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentType, AgentState, AgentOutput } from "../types";
import { ShieldCheck, BrainCircuit, Activity, Sliders, CheckSquare, Loader2 } from "lucide-react";

interface AgentPanelProps {
  agents: Record<AgentType, AgentState>;
  isProcessing: boolean;
  activeStep: number;
}

export default function AgentPanel({ agents, isProcessing, activeStep }: AgentPanelProps) {
  const getAgentIcon = (type: AgentType) => {
    switch (type) {
      case "coordinator":
        return <BrainCircuit id="icon-coordinator" className="w-4.5 h-4.5" />;
      case "compliance":
        return <ShieldCheck id="icon-compliance" className="w-4.5 h-4.5" />;
      case "analyst":
        return <Activity id="icon-analyst" className="w-4.5 h-4.5" />;
      case "strategist":
        return <Sliders id="icon-strategist" className="w-4.5 h-4.5" />;
      case "approver":
        return <CheckSquare id="icon-approver" className="w-4.5 h-4.5" />;
    }
  };

  const getStepNumber = (type: AgentType) => {
    switch (type) {
      case "coordinator":
        return 1;
      case "compliance":
        return 2;
      case "analyst":
        return 3;
      case "strategist":
        return 4;
      case "approver":
        return 5;
    }
  };

  const agentOrder: AgentType[] = ["coordinator", "compliance", "analyst", "strategist", "approver"];

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <h3 className="font-mono text-xs tracking-widest uppercase text-white/50">
          COGNITIVE REVIEW PIPELINE
        </h3>
        {isProcessing && (
          <div className="flex items-center gap-2 font-mono text-[10px] text-white/70 tracking-wider">
            <Loader2 className="w-3 h-3 animate-spin text-white" />
            ADJUDICATING_VERDICT...
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {agentOrder.map((type) => {
          const agent = agents[type];
          const stepNum = getStepNumber(type);
          const isActive = isProcessing && activeStep === stepNum;
          const isDone = agent.status === "done";
          const isIdle = agent.status === "idle";

          let borderClass = "border-white/10 text-white/40";
          if (isActive) borderClass = "border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]";
          else if (isDone) borderClass = "border-white/30 text-white";

          return (
            <div
              id={`agent-card-${type}`}
              key={type}
              className={`border p-4 bg-black flex flex-col justify-between transition-all duration-300 min-h-[200px] ${borderClass}`}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-center justify-between font-mono text-[9px] tracking-widest uppercase mb-3">
                  <span className={isActive ? "text-[#FF3B30] font-bold" : "text-white/30"}>
                    STEP 0{stepNum}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 text-[8px] font-bold ${
                      isActive
                        ? "bg-white text-black animate-pulse"
                        : isDone
                        ? "bg-white/10 text-white"
                        : "bg-white/5 text-white/20"
                    }`}
                  >
                    {agent.status.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <div className={isActive ? "text-white" : isDone ? "text-white/80" : "text-white/25"}>
                    {getAgentIcon(type)}
                  </div>
                  <h4 className="font-bold tracking-tight text-sm text-white">{agent.name}</h4>
                </div>

                <div className="font-mono text-[10px] tracking-wider text-white/40 mb-3">
                  {agent.title.toUpperCase()}
                </div>
              </div>

              {/* Card Output */}
              <div className="mt-2 flex-grow flex flex-col justify-end">
                {isIdle ? (
                  <div className="font-mono text-[10px] text-white/20 italic tracking-wider">
                    Awaiting intake copy...
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="font-mono text-[10px] leading-relaxed text-white/80 whitespace-pre-line tracking-wide">
                      {agent.output}
                    </p>
                    {agent.score !== undefined && (
                      <div className="flex items-center justify-between border-t border-white/10 pt-1.5 font-mono text-[9px] tracking-widest text-white/50">
                        <span>METRIC_INDEX:</span>
                        <span className="text-white font-bold">{agent.score}/100</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
