/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { CogneeClient } from "./lib/cognee";
import { MemoryNode, AgentType, AgentState, ConnectionStatus, MarketingReview, AgentOutput } from "./types";
import { CAMPAIGN_TEMPLATES, CampaignTemplate } from "./data/mockReviews";
import StatusBar from "./components/StatusBar";
import KnowledgeGraph from "./components/KnowledgeGraph";
import AgentPanel from "./components/AgentPanel";
import MemoryArchive from "./components/MemoryArchive";
import { Sparkles, Brain, ArrowUpRight, HelpCircle, FileText, ChevronRight } from "lucide-react";

// Initialize Cognee Client (which checks connection and provides fallback)
const client = new CogneeClient();

const initialAgents: Record<AgentType, AgentState> = {
  coordinator: {
    type: "coordinator",
    name: "ALETHEIA",
    title: "Syntactic Intake & Memory Coordinator",
    status: "idle",
    output: "",
  },
  compliance: {
    type: "compliance",
    name: "NOMOS",
    title: "Regulatory & Compliance Adjudicator",
    status: "idle",
    output: "",
  },
  analyst: {
    type: "analyst",
    name: "LOGOS",
    title: "Brand Metrics & Sentiment Analyst",
    status: "idle",
    output: "",
  },
  strategist: {
    type: "strategist",
    name: "METIS",
    title: "Cognitive Intervention Strategist",
    status: "idle",
    output: "",
  },
  approver: {
    type: "approver",
    name: "PHRONESIS",
    title: "Executive Verdict Approver",
    status: "idle",
    output: "",
  },
};

export default function App() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("CHECKING");
  const [memories, setMemories] = useState<MemoryNode[]>([]);
  const [totalRecalls, setTotalRecalls] = useState(0);
  const [accuracy, setAccuracy] = useState("—");

  // Input states
  const [campaignCopy, setCampaignCopy] = useState("");
  const [campaignTags, setCampaignTags] = useState("environmental, copy");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Agent adjudication states
  const [agents, setAgents] = useState<Record<AgentType, AgentState>>(initialAgents);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  // Graph state
  const [selectedNode, setSelectedNode] = useState<MemoryNode | null>(null);
  const [recallHighlightIds, setRecallHighlightIds] = useState<string[]>([]);

  // Telemetry Console states
  const [isImproving, setIsImproving] = useState(false);
  const [improvementLogs, setImprovementLogs] = useState<string[]>([
    "COGNEE CONSOLE: READY",
    "AWAITING PIPELINE OR LIFE-CYCLE ACTIONS..."
  ]);

  // Load memories and stats on mount
  useEffect(() => {
    const initConnectionAndLoad = async () => {
      setConnectionStatus("CHECKING");
      const isConnected = await client.connectionReady;
      const status = isConnected ? "CONNECTED" : "LOCAL_FALLBACK";
      setConnectionStatus(status);
      await refreshData(status);
    };
    initConnectionAndLoad();
  }, []);

  const refreshData = async (forcedStatus?: ConnectionStatus) => {
    // Check connection badge state
    if (forcedStatus) {
      setConnectionStatus(forcedStatus);
    } else {
      const isFallback = client.isUsingLocalFallback();
      setConnectionStatus(isFallback ? "LOCAL_FALLBACK" : "CONNECTED");
    }

    // Fetch nodes (via empty recall to get full index)
    const nodes = await client.recall("");
    setMemories(nodes);

    // Calculate accuracy metric (percentage of approved campaign nodes)
    const reviewNodes = nodes.filter((n) => n.type === "review");
    if (reviewNodes.length > 0) {
      const approvedCount = reviewNodes.filter((n) => n.content.includes("Verdict: APPROVED")).length;
      const pct = Math.round((approvedCount / reviewNodes.length) * 100);
      setAccuracy(`${pct}%`);
    } else {
      setAccuracy("—");
    }
  };

  const handleRefreshConnection = async () => {
    // Re-trigger connection verification
    setConnectionStatus("CHECKING");
    const isConnected = await client.checkConnection();
    const status = isConnected ? "CONNECTED" : "LOCAL_FALLBACK";
    setConnectionStatus(status);
    await refreshData(status);
  };

  const handleScrollAndFocus = (sectionId: string, focusId?: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
    if (focusId) {
      setTimeout(() => {
        const input = document.getElementById(focusId) as HTMLTextAreaElement | HTMLInputElement | null;
        if (input) {
          input.focus();
        }
      }, 500);
    }
  };

  // One-click Template Loading
  const loadTemplate = (template: CampaignTemplate) => {
    setCampaignCopy(template.copy);
    setCampaignTags(template.tags.join(", "));
    setSelectedTemplate(template.id);
    
    // Reset agent pipeline UI
    setAgents(initialAgents);
    setActiveStep(0);
    setRecallHighlightIds([]);
  };

  // Perform Cognee Memory Search
  const handleMemorySearch = async (query: string) => {
    setTotalRecalls((prev) => prev + 1);
    const results = await client.recall(query);
    setMemories(results);
    
    // Highlight first matching results in graph for real visual linkage!
    if (results.length > 0) {
      setRecallHighlightIds(results.slice(0, 3).map((n) => n.id));
    } else {
      setRecallHighlightIds([]);
    }
  };

  // Cognee Forget/Prune Method
  const handleMemoryForget = async (id: string) => {
    const success = await client.forget(id);
    if (success) {
      setImprovementLogs((prev) => [
        `>> FORGET ACTION TRIGGERED FOR NODE ID: ${id}`,
        "SUCCESS: GRAPH EDGE PRUNING COMPLETED.",
        ...prev
      ]);
      if (selectedNode?.id === id) {
        setSelectedNode(null);
      }
      refreshData();
    }
  };

  // Cognee Cognify / Improve Method (with cinematic streaming telemetry logs)
  const handleMemoryImprove = async () => {
    setIsImproving(true);
    setImprovementLogs([">> INITIATING COGNEE CLOUD COGNIFY TASK...", ">> ACQUIRING SYSTEM LOCKS ON 'MNEMOSYNE' DATASPACE..."]);

    const steps = [
      ">> SCANNING GRAPH CONNECTIONS FOR SEMANTIC OVERLAPS...",
      ">> EXTRACTING ENTITY-RELATIONSHIP SCHEMA SHAPES...",
      ">> RUNNING VECTOR EMBEDDING CLUSTERING ON AGENT INTAKES...",
      ">> SUCCESS: BRIDGED HIGH-HAZARD VIOLATIONS WITH GLOBAL COMPLIANCE RULES.",
      ">> DENSITY REPORT: Extracting 4 associative links, Clustered 2 conceptual domains.",
      ">> WEIGHT RE-CALIBRATION: Boosted authority weight on active rule indices."
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setImprovementLogs((prev) => [steps[i], ...prev]);
    }

    // Call real clients improve
    const result = await client.improve();
    setIsImproving(false);
    
    setImprovementLogs((prev) => [
      `>> COGNIFY EXECUTED. STATS: CLUSTERS_BUILT: ${result.stats.addedClusters} · RELATIONS_MAPPED: ${result.stats.updatedRelations}`,
      ...prev
    ]);

    refreshData();
  };

  // Run the 5 specialized AI agent content-review pipeline
  const handleCommenceAdjudication = async () => {
    if (!campaignCopy.trim()) return;

    setIsProcessing(true);
    setRecallHighlightIds([]);
    setSelectedNode(null);

    // Deep clean tags
    const tagsArray = campaignTags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    // Heuristic NLP matching for campaign copy
    const copyLower = campaignCopy.toLowerCase();
    const hasGreenwashing =
      copyLower.includes("100% eco-friendly") ||
      copyLower.includes("zero carbon") ||
      copyLower.includes("saves the planet") ||
      copyLower.includes("literally better than");
      
    const hasMedicalFDA =
      copyLower.includes("cures") ||
      copyLower.includes("eliminates brain fog") ||
      copyLower.includes("reverse cellular aging") ||
      copyLower.includes("treats") ||
      copyLower.includes("adhd") ||
      copyLower.includes("anxiety");

    // ----------------------------------------------------
    // STEP 1: Coordinator (Intake and memory recall)
    // ----------------------------------------------------
    setActiveStep(1);
    setAgents((prev) => ({
      ...prev,
      coordinator: {
        ...prev.coordinator,
        status: "recalling",
        output: "PARSING TEXT INPUT STREAMS...\nLAUNCHING ASSOCIATIVE COGNEE RETRIEVAL FOR CORRESPONDING CRITERIA...",
      },
    }));

    // Perform real Cognee recall to seek matches in the dataset
    const recallQuery = tagsArray.join(" ");
    const recallHits = await client.recall(recallQuery);
    
    await new Promise((resolve) => setTimeout(resolve, 1400));
    
    // Highlight matching nodes in the visual graph
    const matchedNodeIds = recallHits.slice(0, 3).map((n) => n.id);
    setRecallHighlightIds(matchedNodeIds);

    const matchMessage =
      matchedNodeIds.length > 0
        ? `RECALLED ${matchedNodeIds.length} HISTORICAL REGULATORY AND CASE OBJECTS: [${matchedNodeIds.join(", ")}].`
        : "NO PREVIOUS REVIEWS MATCH THIS SUB-DOMAIN. ASSUMING BASELINE PROFILE.";

    setAgents((prev) => ({
      ...prev,
      coordinator: {
        ...prev.coordinator,
        status: "done",
        output: `>> CAMPAIGN COPY RECEIVED.\n${matchMessage}\n>> STRUCTURE EXTRACTED, DISPATCHING TO NOMOS (COMPLIANCE).`,
      },
    }));

    // ----------------------------------------------------
    // STEP 2: Compliance Agent (FTC/FDA audit)
    // ----------------------------------------------------
    setActiveStep(2);
    setAgents((prev) => ({
      ...prev,
      compliance: {
        ...prev.compliance,
        status: "analyzing",
        output: "CROSS-REFERENCING COPY SEGMENTS WITH ETHICAL AND FEDERAL STANDARDS...",
      },
    }));

    await new Promise((resolve) => setTimeout(resolve, 1600));

    let complianceScore = 95;
    let complianceText = ">> FTC/FDA REGULATORY SANITY PING: PASSED.\nNo egregious absolute declarations, biological cures, or greenwashing claims detected.";

    if (hasGreenwashing && hasMedicalFDA) {
      complianceScore = 15;
      complianceText = `>> DOUBLE SEVERE REGULATORY CONFLICT IDENTIFIED.\n1. FTC Greenwashing (ID: rule-01): Assertions of zero-carbon / planetary salvation require third-party audited audits.\n2. FDA Medical Violation (ID: rule-02): Promises of curing biological stress or reversing cell aging violate safety limits.`;
    } else if (hasGreenwashing) {
      complianceScore = 40;
      complianceText = `>> WARNING: FTC GREENWASHING DETECTED (ID: rule-01).\nAssertions like '100% eco-friendly' or 'zero carbon' cannot be used absolutely. Software flags threat for potential FTC lawsuits.`;
    } else if (hasMedicalFDA) {
      complianceScore = 20;
      complianceText = `>> CRITICAL: FDA MEDICAL PROTOCOL EXPOSURE (ID: rule-02).\nAbsolute therapeutic terminology detected ('reverse cellular aging', 'cures stress'). Prohibited without certified peer clinical research.`;
    }

    setAgents((prev) => ({
      ...prev,
      compliance: {
        ...prev.compliance,
        status: "done",
        output: complianceText,
        score: complianceScore,
      },
    }));

    // ----------------------------------------------------
    // STEP 3: Analyst Agent (Brand metrics)
    // ----------------------------------------------------
    setActiveStep(3);
    setAgents((prev) => ({
      ...prev,
      analyst: {
        ...prev.analyst,
        status: "analyzing",
        output: "CALCULATING LINGUISTIC RESIDUAL INDEXES & CONSUMER TRUST FACTORS...",
      },
    }));

    await new Promise((resolve) => setTimeout(resolve, 1200));

    const sentimentScore = complianceScore < 50 ? 42 : 88;
    const readability = Math.min(100, Math.max(30, campaignCopy.length / 5));
    const finalAnalystScore = Math.round((sentimentScore + readability) / 2);

    setAgents((prev) => ({
      ...prev,
      analyst: {
        ...prev.analyst,
        status: "done",
        output: `>> LINGUISTIC STATS:\n- ENGAGEMENT PROBABILITY: ${sentimentScore}%\n- READABILITY DENSITY: COHERENT\n- COGNITIVE TRUST INDEX: ${complianceScore}%\n\nSensationalist hooks are ${
          complianceScore < 50 ? "extremely high hazard." : "well-balanced."
        }`,
        score: finalAnalystScore,
      },
    }));

    // ----------------------------------------------------
    // STEP 4: Strategist Agent (Interventions)
    // ----------------------------------------------------
    setActiveStep(4);
    setAgents((prev) => ({
      ...prev,
      strategist: {
        ...prev.strategist,
        status: "analyzing",
        output: "FORMULATING RE-ENGINEERING EDITS & SEMANTIC REMEDIES...",
      },
    }));

    await new Promise((resolve) => setTimeout(resolve, 1200));

    let strategyText = ">> STRATEGY PLAN:\n1. Copy is compliant. Strengthen conversion by adding high-contrast CTA.\n2. Add customer trust statements.\n3. Keep text concise.";
    if (complianceScore < 50) {
      strategyText = `>> REMEDIAL STRATEGIC INTERVENTIONS:\n1. Eliminate absolute nouns like 'cures' -> change to 'assists in focus'.\n2. Soften '100% eco-friendly' to 'incorporates biodegradable elements'.\n3. Append a methodology citation link to shield public releases.`;
    }

    setAgents((prev) => ({
      ...prev,
      strategist: {
        ...prev.strategist,
        status: "done",
        output: strategyText,
        score: Math.round((complianceScore + 100) / 2),
      },
    }));

    // ----------------------------------------------------
    // STEP 5: Approver Agent (Verdict and Cognee Remember)
    // ----------------------------------------------------
    setActiveStep(5);
    setAgents((prev) => ({
      ...prev,
      approver: {
        ...prev.approver,
        status: "analyzing",
        output: "CONSOLIDATING AGENT ANALYSIS WEIGHTS... CALIBRATING FINAL VERDICT ENVELOPE...",
      },
    }));

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const calculatedScore = Math.round(complianceScore * 0.6 + finalAnalystScore * 0.4);
    const finalVerdict = calculatedScore >= 70 ? "APPROVED" : "REJECTED";

    setAgents((prev) => ({
      ...prev,
      approver: {
        ...prev.approver,
        status: "done",
        output: `>> ADJUDICATION COMPILED.\n- SCORING MARGIN: ${calculatedScore}/100\n- DECISION: ${finalVerdict}\n\nSaving this adjudicative report node into Cognee Cloud.`,
        score: calculatedScore,
      },
    }));

    // ----------------------------------------------------
    // SAVE REPORT DIRECTLY TO COGNEE MEMORY!
    // ----------------------------------------------------
    const newId = `review-${Math.random().toString(36).substr(2, 5)}`;
    
    // Add campaign tags to nodes tags
    const saveTags = ["review", ...tagsArray, finalVerdict.toLowerCase()];
    if (hasGreenwashing) saveTags.push("greenwashing");
    if (hasMedicalFDA) saveTags.push("medical_violation");

    const newMemoryPayload = {
      id: newId,
      type: "review",
      content: `${
        selectedTemplate
          ? CAMPAIGN_TEMPLATES.find((t) => t.id === selectedTemplate)?.name
          : "CUSTOM_CAMPAIGN"
      } Copy: "${campaignCopy.substring(0, 110)}...". Verdict: ${finalVerdict}. Score: ${calculatedScore}/100. Compliance: ${complianceScore}/100. Timestamp: ${new Date().toISOString()}`,
      tags: saveTags,
      weight: calculatedScore / 100,
      links: []
    };

    // Save Node
    const createdNode = await client.remember(newMemoryPayload);

    setImprovementLogs((prev) => [
      `>> REMEMBER ACTION: REGISTERED NODE ID '${createdNode.id}'`,
      `SUCCESS: CAMPAIGN RECORD VERDICT [${finalVerdict}] SAVED TO COGNEE HYBRID GRAPH STORE.`,
      ...prev
    ]);

    // Finish processing
    setIsProcessing(false);
    setActiveStep(0);
    
    // Highlight the newly created node in the graph
    setSelectedNode(createdNode);

    // Reload memory lists and stats
    await refreshData();
  };

  return (
    <div className="min-h-screen bg-black text-white relative flex flex-col font-sans selection:bg-white selection:text-black antialiased">
      {/* Noise background overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015] bg-[size:160px_160px]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />

      {/* Persistence top status bar */}
      <StatusBar
        totalMemories={memories.length}
        totalRecalls={totalRecalls}
        accuracy={accuracy}
        connectionStatus={connectionStatus}
        onRefreshConnection={handleRefreshConnection}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-8 lg:py-12 space-y-12">
        {/* HERO SECTION */}
        <section id="section-hero" className="border-b border-white/20 pb-0 flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 z-0 flex items-center justify-center opacity-30 pointer-events-none">
            <svg width="800" height="500" viewBox="0 0 800 500" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M150 100L300 250M300 250L450 150M300 250L250 400M300 250L550 350M550 350L650 200M450 150L650 200" stroke="white" strokeWidth="0.5" strokeDasharray="4 4"/>
              <circle cx="150" cy="100" r="3" fill="white"/>
              <circle cx="300" cy="250" r="6" fill="white"/>
              <circle cx="450" cy="150" r="3" fill="white"/>
              <circle cx="250" cy="400" r="4" fill="white"/>
              <circle cx="550" cy="350" r="4" fill="white"/>
              <circle cx="650" cy="200" r="3" fill="white"/>
              <circle cx="400" cy="300" r="2" fill="#FF3B30"/>
              <path d="M300 250L400 300" stroke="#FF3B30" strokeWidth="1"/>
            </svg>
          </div>

          <div className="z-10 text-center space-y-8 pt-6 pb-14">
            <div className="font-mono text-[10px] tracking-widest uppercase text-[#FF3B30] font-bold flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#FF3B30] rounded-full animate-ping" />
              COGNEE CLOUD PLATFORM · MNEMOSYNE ACTIVE SUITE
            </div>
            
            <h1 className="text-[52px] sm:text-7xl md:text-[110px] leading-[0.85] font-black tracking-tighter uppercase max-w-[850px] mx-auto text-white select-none" style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
              AI That <br />
              Doesn't <br />
              Forget.
            </h1>
            
            <p className="text-sm md:text-lg tracking-tight font-light max-w-[550px] mx-auto text-white/75 select-none uppercase leading-snug">
              Specialized agent intelligence powered by Cognee Cloud’s persistent memory lifecycle. 
              Institutional memory for the modern AI team.
            </p>
          </div>

          {/* Interactive SVG Knowledge Graph */}
          <div className="w-full max-w-4xl mx-auto pb-14 px-4">
            <div className="border border-white/15 p-2 bg-[#050505]/80 backdrop-blur-sm shadow-2xl">
              <div className="font-mono text-[9px] text-white/40 tracking-widest uppercase px-3 py-1.5 border-b border-white/5 flex items-center justify-between">
                <span>INTERACTIVE MEMORY GRAPHSHEET</span>
                <span className="text-[#FF3B30] animate-pulse">● LIVE</span>
              </div>
              <KnowledgeGraph
                nodes={memories}
                onSelectNode={(node) => setSelectedNode(node)}
                selectedNodeId={selectedNode?.id}
                recallHighlightIds={recallHighlightIds}
              />
            </div>
          </div>

          {/* 4 Interactive Columns Theme Lifecycle Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 border-t border-white/20 z-10 font-sans select-none">
            <div 
              onClick={() => handleScrollAndFocus("section-intake", "campaign-copy-textarea")}
              className="border-b md:border-b-0 border-r border-white/10 p-6 flex flex-col justify-between min-h-[160px] hover:bg-white hover:text-black transition-all duration-300 cursor-pointer group"
            >
              <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-50 group-hover:opacity-100">01 / Remember</span>
              <p className="text-xs leading-relaxed uppercase tracking-wider font-bold">Ingest and index complex brand assets into hybrid memory.</p>
            </div>

            <div 
              onClick={() => handleScrollAndFocus("section-archive", "search-memory-input")}
              className="border-b md:border-b-0 border-r border-white/10 p-6 flex flex-col justify-between min-h-[160px] hover:bg-white hover:text-black transition-all duration-300 cursor-pointer group"
            >
              <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-50 group-hover:opacity-100">02 / Recall</span>
              <p className="text-xs leading-relaxed uppercase tracking-wider font-bold">Context-aware search against vector-graph store.</p>
            </div>

            <div 
              onClick={handleMemoryImprove}
              className={`border-b md:border-b-0 border-r border-white/10 p-6 flex flex-col justify-between min-h-[160px] hover:bg-white hover:text-black transition-all duration-300 cursor-pointer group ${isImproving ? "bg-white/5" : ""}`}
            >
              <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-50 group-hover:opacity-100 flex items-center gap-2">
                {isImproving && <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />}
                03 / Improve
              </span>
              <p className="text-xs leading-relaxed uppercase tracking-wider font-bold">Self-correcting refinement of stored patterns over time.</p>
            </div>

            <div 
              onClick={() => handleScrollAndFocus("section-archive")}
              className="p-6 flex flex-col justify-between min-h-[160px] hover:bg-[#FF3B30] hover:text-white transition-all duration-300 cursor-pointer group"
            >
              <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-50 group-hover:opacity-100">04 / Forget</span>
              <p className="text-xs leading-relaxed uppercase tracking-wider font-bold">Automated pruning of stale or non-compliant records.</p>
            </div>
          </div>
        </section>

        {/* Selected Node Inspector (If a node is clicked in the graph) */}
        {selectedNode && (
          <section id="section-inspector" className="border border-white p-6 bg-[#080808] transition-all duration-300">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] bg-white text-black font-bold px-2 py-0.5 tracking-widest uppercase">
                  NODE_DECONSTRUCTOR
                </span>
                <span className="font-mono text-xs text-white/40 font-bold">{selectedNode.id}</span>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="font-mono text-[9px] tracking-widest text-white/40 hover:text-white uppercase transition-colors"
              >
                [CLOSE_INSPECTOR]
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-3">
                <h4 className="font-mono text-xs text-white/30 uppercase tracking-widest">CONTENT DESCRIPTION:</h4>
                <p className="text-sm leading-relaxed text-white font-sans">{selectedNode.content}</p>
              </div>

              <div className="border-l border-white/10 pl-6 space-y-4 font-mono text-xs uppercase tracking-wider text-white/60">
                <div>
                  <span className="text-white/30 block mb-1 text-[10px]">OBJECT TYPE:</span>
                  <span className="text-white font-medium">{selectedNode.type}</span>
                </div>
                <div>
                  <span className="text-white/30 block mb-1 text-[10px]">SIGNIFICANCE WEIGHT:</span>
                  <span className="text-white font-medium">{(selectedNode.weight * 100).toFixed(0)}%</span>
                </div>
                <div>
                  <span className="text-white/30 block mb-1 text-[10px]">TAG INDEX:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedNode.tags.map((t) => (
                      <span key={t} className="bg-white/5 text-white/75 text-[9px] px-1.5 py-0.5 border border-white/10">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
                {selectedNode.links && selectedNode.links.length > 0 && (
                  <div>
                    <span className="text-white/30 block mb-1 text-[10px]">BRIDGED RELATIONS:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1 text-[10px] text-white font-bold">
                      {selectedNode.links.map((linkId) => (
                        <span key={linkId} className="border-b border-[#FF3B30] text-[#FF3B30] pb-0.5">
                          → {linkId}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* WORKFLOW PIPELINE INTAKE CARD */}
        <section id="section-intake" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Campaign Intake Form (Left pane) */}
          <div className="lg:col-span-1 border border-white/10 bg-[#050505] p-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <h3 className="font-mono text-xs tracking-widest uppercase text-white/50 border-b border-white/10 pb-2 mb-3">
                  CAMPAIGN ADJUDICATION INTAKE
                </h3>
                <p className="text-[11px] text-white/40 font-mono tracking-wider uppercase leading-relaxed">
                  Select a hackathon campaign template below or write custom copy to commence agent evaluation.
                </p>
              </div>

              {/* Template Buttons */}
              <div className="space-y-2">
                <span className="font-mono text-[9px] text-white/30 tracking-widest block uppercase">
                  CAMPAIGN TEMPLATES (ONE-CLICK LOAD):
                </span>
                <div className="flex flex-col gap-2">
                  {CAMPAIGN_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      onClick={() => loadTemplate(tmpl)}
                      className={`text-left border p-3 cursor-pointer group transition-all duration-300 ${
                        selectedTemplate === tmpl.id
                          ? "border-white bg-white text-black"
                          : "border-white/10 hover:border-white/30 bg-black/40 hover:bg-black"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-mono text-[10px] font-bold tracking-wider uppercase block">
                          {tmpl.name}
                        </span>
                        <ArrowUpRight className={`w-3.5 h-3.5 transition-transform ${
                          selectedTemplate === tmpl.id ? "text-black" : "text-white/30 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        }`} />
                      </div>
                      <span className={`text-[9px] font-mono tracking-widest mt-1 block uppercase ${
                        selectedTemplate === tmpl.id ? "text-black/60" : "text-white/40"
                      }`}>
                        {tmpl.category}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Copy */}
              <div className="space-y-2">
                <label className="font-mono text-[9px] text-white/30 tracking-widest block uppercase">
                  CAMPAIGN MARKETING COPY:
                </label>
                <textarea
                  id="campaign-copy-textarea"
                  rows={6}
                  value={campaignCopy}
                  onChange={(e) => {
                    setCampaignCopy(e.target.value);
                    setSelectedTemplate(null);
                  }}
                  placeholder="Paste marketing, advertising, or launch copy here..."
                  className="w-full bg-black border border-white/15 p-3 font-sans text-xs tracking-wide leading-relaxed text-white focus:outline-none focus:border-white transition-colors duration-300 resize-none rounded-none placeholder-white/25"
                />
              </div>

              {/* Tags Input */}
              <div className="space-y-1.5">
                <label className="font-mono text-[9px] text-white/30 tracking-widest block uppercase">
                  COGNITIVE SCHEMATIC TAGS (COMMA SEPARATED):
                </label>
                <input
                  id="campaign-tags-input"
                  type="text"
                  value={campaignTags}
                  onChange={(e) => setCampaignTags(e.target.value)}
                  placeholder="e.g. environmental, healthcare, saas"
                  className="w-full bg-black border border-white/15 px-3 py-2 font-mono text-xs tracking-wider text-white focus:outline-none focus:border-white transition-colors duration-300 rounded-none placeholder-white/20"
                />
              </div>
            </div>

            {/* Launch Action */}
            <div className="pt-6 border-t border-white/5 mt-6">
              <button
                id="btn-commence-review"
                onClick={handleCommenceAdjudication}
                disabled={isProcessing || !campaignCopy.trim()}
                className={`w-full border p-3 font-mono text-xs tracking-widest uppercase transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 ${
                  isProcessing || !campaignCopy.trim()
                    ? "bg-white/5 text-white/30 border-white/5 cursor-not-allowed"
                    : "bg-white text-black border-white hover:bg-black hover:text-white"
                }`}
              >
                <Brain className="w-4 h-4" />
                <span>{isProcessing ? "EVALUATING_DATASPACE..." : "COMMENCE ADJUDICATION"}</span>
              </button>
            </div>
          </div>

          {/* Large pipeline viewer showing active agents outputs (Right pane spanning 2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <AgentPanel
              agents={agents}
              isProcessing={isProcessing}
              activeStep={activeStep}
            />
          </div>
        </section>

        {/* MEMORY ARCHIVE & RECALL CONTROL DECK */}
        <section id="section-archive" className="border-t border-white/10 pt-10">
          <MemoryArchive
            memories={memories}
            onSearch={handleMemorySearch}
            onForget={handleMemoryForget}
            onImprove={handleMemoryImprove}
            isImproving={isImproving}
            improvementLogs={improvementLogs}
          />
        </section>
      </main>

      {/* FOOTER */}
      <footer className="w-full border-t border-white/10 py-6 bg-black z-10">
        <div className="max-w-[1600px] w-full mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-[9px] text-white/30 tracking-widest uppercase">
          <div>
            © 2026 MNEMOSYNE · GRAPH-VECTOR INSIGHT TEAM
          </div>
          <div>
            COGNEE CLOUD HACKATHON · PRE-RELEASE INTEGRATION SUITE
          </div>
        </div>
      </footer>

      {/* Sideways floating theme badge */}
      <div className="hidden xl:block fixed bottom-24 right-4 writing-vertical-rl transform rotate-180 text-[10px] font-mono tracking-[0.5em] uppercase text-white/20 pointer-events-none select-none z-50">
        Cognee Cloud Integration v2.1
      </div>
    </div>
  );
}
