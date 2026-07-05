export type AgentType = "coordinator" | "compliance" | "analyst" | "strategist" | "approver";

export interface MemoryNode {
  id: string;
  type: string; // e.g., "review", "agent_insight", "compliance_rule", "topic"
  content: string;
  tags: string[];
  weight: number; // 0.0 to 1.0
  timestamp: string;
  links?: string[]; // target node IDs it connects to
}

export interface MemoryLink {
  source: string;
  target: string;
  label?: string;
}

export interface AgentState {
  type: AgentType;
  name: string;
  title: string;
  status: "idle" | "recalling" | "analyzing" | "done";
  output: string;
  score?: number;
}

export interface AgentOutput {
  status: "success" | "warning" | "violation" | "info";
  text: string;
  score?: number;
}

export interface MarketingReview {
  id: string;
  originalContent: string;
  timestamp: string;
  score: number;
  verdict: "APPROVED" | "REJECTED";
  agentOutputs: Record<AgentType, AgentOutput>;
  tags: string[];
}

export type ConnectionStatus = "CONNECTED" | "LOCAL_FALLBACK" | "CHECKING";
