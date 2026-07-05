/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from "react";
import { CogneeClient } from "../lib/cognee";
import { MemoryNode, AgentType } from "../types";
import { callGemini, AGENT_ROLES, parseAgentOutput } from "../lib/gemini";
import {
  BrainCircuit,
  ShieldCheck,
  Activity,
  Sliders,
  CheckSquare,
  Loader2,
  RefreshCw,
  Send,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";

interface ReviewTheaterProps {
  campaignCopy: string;
  campaignTags: string;
  client: CogneeClient;
  onAdjudicationComplete: (verdict: "APPROVED" | "NEEDS_REVISION" | "REJECTED", overallScore: number, savedNode: MemoryNode) => void;
  onIncrementRecalls: () => void;
  triggerRunSignal?: number;
}

interface TheaterStep {
  agent: AgentType;
  name: string;
  title: string;
  status: "idle" | "recalling" | "calling_gemini" | "typing" | "completed" | "error";
  recalledMemories: MemoryNode[];
  paragraph: string;
  typedParagraph: string;
  jsonBlock: any;
  error?: string;
}

interface ChatMessage {
  id: string;
  sender: "user" | "agent";
  agentType?: AgentType;
  agentName?: string;
  text: string;
  recalledMemories?: MemoryNode[];
  isTyping?: boolean;
}

export default function ReviewTheater({
  campaignCopy,
  campaignTags,
  client,
  onAdjudicationComplete,
  onIncrementRecalls,
  triggerRunSignal,
}: ReviewTheaterProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (triggerRunSignal && triggerRunSignal > 0 && !isProcessing) {
      handleConveneTeam();
    }
  }, [triggerRunSignal]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [steps, setSteps] = useState<TheaterStep[]>([
    {
      agent: "coordinator",
      name: AGENT_ROLES.coordinator.name,
      title: AGENT_ROLES.coordinator.title,
      status: "idle",
      recalledMemories: [],
      paragraph: "",
      typedParagraph: "",
      jsonBlock: null,
    },
    {
      agent: "compliance",
      name: AGENT_ROLES.compliance.name,
      title: AGENT_ROLES.compliance.title,
      status: "idle",
      recalledMemories: [],
      paragraph: "",
      typedParagraph: "",
      jsonBlock: null,
    },
    {
      agent: "analyst",
      name: AGENT_ROLES.analyst.name,
      title: AGENT_ROLES.analyst.title,
      status: "idle",
      recalledMemories: [],
      paragraph: "",
      typedParagraph: "",
      jsonBlock: null,
    },
    {
      agent: "strategist",
      name: AGENT_ROLES.strategist.name,
      title: AGENT_ROLES.strategist.title,
      status: "idle",
      recalledMemories: [],
      paragraph: "",
      typedParagraph: "",
      jsonBlock: null,
    },
    {
      agent: "approver",
      name: AGENT_ROLES.approver.name,
      title: AGENT_ROLES.approver.title,
      status: "idle",
      recalledMemories: [],
      paragraph: "",
      typedParagraph: "",
      jsonBlock: null,
    },
  ]);

  // Chat dock states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isAgentReplying, setIsAgentReplying] = useState(false);
  const [activeChatRecalls, setActiveChatRecalls] = useState<MemoryNode[]>([]);
  const [isChatRecalling, setIsChatRecalling] = useState(false);

  const activeTypingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timelineEndRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const agentOrder: AgentType[] = ["coordinator", "compliance", "analyst", "strategist", "approver"];

  const getAgentIcon = (type: AgentType, sizeClass = "w-4.5 h-4.5") => {
    switch (type) {
      case "coordinator":
        return <BrainCircuit className={sizeClass} />;
      case "compliance":
        return <ShieldCheck className={sizeClass} />;
      case "analyst":
        return <Activity className={sizeClass} />;
      case "strategist":
        return <Sliders className={sizeClass} />;
      case "approver":
        return <CheckSquare className={sizeClass} />;
    }
  };

  useEffect(() => {
    if (isProcessing) {
      timelineEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [steps, isProcessing]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Run the typewriter effect for an agent's text
  const typeText = (
    text: string,
    stepIndex: number,
    onComplete: () => void
  ) => {
    if (activeTypingIntervalRef.current) {
      clearInterval(activeTypingIntervalRef.current);
    }

    let charIndex = 0;
    setSteps((prev) => {
      const next = [...prev];
      next[stepIndex] = {
        ...next[stepIndex],
        status: "typing",
        typedParagraph: "",
      };
      return next;
    });

    activeTypingIntervalRef.current = setInterval(() => {
      charIndex += 4; // Fast, professional fluid speed
      if (charIndex >= text.length) {
        if (activeTypingIntervalRef.current) {
          clearInterval(activeTypingIntervalRef.current);
        }
        setSteps((prev) => {
          const next = [...prev];
          next[stepIndex] = {
            ...next[stepIndex],
            status: "completed",
            typedParagraph: text,
          };
          return next;
        });
        onComplete();
      } else {
        setSteps((prev) => {
          const next = [...prev];
          next[stepIndex] = {
            ...next[stepIndex],
            typedParagraph: text.substring(0, charIndex),
          };
          return next;
        });
      }
    }, 12);
  };

  // Run one specific step in the agent pipeline
  const executeStep = async (index: number, currentStepsState: TheaterStep[]) => {
    const currentAgent = agentOrder[index];
    const roleConfig = AGENT_ROLES[currentAgent];

    // Update status to recalling from Cognee
    setSteps((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        status: "recalling",
        typedParagraph: "",
        paragraph: "",
        jsonBlock: null,
        error: undefined,
      };
      return next;
    });

    onIncrementRecalls();

    // Stagger to let the UI breathe and show "RECALLING FROM COGNEE..."
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // 1. RECALL context from Cognee based on tags and text terms
    const tagsArray = campaignTags.split(",").map((t) => t.trim().toLowerCase());
    const query = [currentAgent, ...tagsArray].join(" ");
    let recalled: MemoryNode[] = [];
    try {
      recalled = await client.recall(query);
    } catch (e) {
      console.warn("Cognee recall error in theater step:", e);
    }

    // Update steps to show recalled memories
    setSteps((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        status: "calling_gemini",
        recalledMemories: recalled,
      };
      return next;
    });

    // Short stagger before calling Gemini
    await new Promise((resolve) => setTimeout(resolve, 600));

    // 2. Build the customized agent prompt with the past reviews
    const memoriesContext = recalled
      .map((m) => `[Type: ${m.type} ID: ${m.id}]: "${m.content}" (Tags: ${m.tags.join(", ")})`)
      .join("\n");

    let prompt = "";
    if (currentAgent === "coordinator") {
      prompt = roleConfig.buildPrompt(campaignCopy, campaignTags, memoriesContext);
    } else if (currentAgent === "compliance") {
      const coordData = JSON.stringify(currentStepsState[0].jsonBlock || {}, null, 2);
      prompt = roleConfig.buildPrompt(campaignCopy, memoriesContext, coordData);
    } else if (currentAgent === "analyst") {
      const complianceData = JSON.stringify(currentStepsState[1].jsonBlock || {}, null, 2);
      prompt = roleConfig.buildPrompt(campaignCopy, memoriesContext, complianceData);
    } else if (currentAgent === "strategist") {
      const analystData = JSON.stringify(currentStepsState[2].jsonBlock || {}, null, 2);
      prompt = roleConfig.buildPrompt(campaignCopy, memoriesContext, analystData);
    } else if (currentAgent === "approver") {
      const fullHistory = currentStepsState
        .slice(0, 4)
        .map((s) => `${s.name} (${s.title}):\n${s.paragraph}\nVerdict Data: ${JSON.stringify(s.jsonBlock || {})}`)
        .join("\n\n");
      prompt = roleConfig.buildPrompt(campaignCopy, memoriesContext, fullHistory);
    }

    // 3. CALL Gemini model via secure REST proxy
    try {
      const rawResponse = await callGemini(roleConfig.systemInstruction, prompt);
      const { paragraph, jsonBlock } = parseAgentOutput(rawResponse);

      if (!paragraph || !jsonBlock) {
        throw new Error("Invalid agent response format. Lacked expected paragraph or json block.");
      }

      // 4. Update state with output and begin typewriter playback
      setSteps((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          paragraph,
          jsonBlock,
        };
        return next;
      });

      // Typewriter live output
      await new Promise<void>((resolve) => {
        typeText(paragraph, index, () => {
          resolve();
        });
      });

      // Update local array for successive steps reference
      currentStepsState[index] = {
        ...currentStepsState[index],
        status: "completed",
        paragraph,
        jsonBlock,
      };

      // Proceed to next step if there is one
      if (index < agentOrder.length - 1) {
        // ~2s stagger to protect rate limits & provide deliberate UX
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setCurrentStepIndex(index + 1);
        await executeStep(index + 1, currentStepsState);
      } else {
        // We reached the APPROVER! Complete the Adjudication workflow
        await finalizeAdjudication(currentStepsState);
      }
    } catch (err: any) {
      console.error(`[Theater Engine Error] Agent ${currentAgent} failed:`, err);
      setSteps((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          status: "error",
          error: err.message || "Unspecified connection failure",
        };
        return next;
      });
      setIsProcessing(false);
    }
  };

  const handleConveneTeam = async () => {
    if (!campaignCopy.trim() || isProcessing) return;

    setIsProcessing(true);
    setCurrentStepIndex(0);

    // Reset steps state
    const resetSteps: TheaterStep[] = steps.map((s) => ({
      ...s,
      status: "idle",
      recalledMemories: [],
      paragraph: "",
      typedParagraph: "",
      jsonBlock: null,
      error: undefined,
    }));
    setSteps(resetSteps);
    setChatMessages([]);

    // Execute first agent
    await executeStep(0, resetSteps);
  };

  const handleRetryStep = async (index: number) => {
    setIsProcessing(true);
    setCurrentStepIndex(index);
    await executeStep(index, [...steps]);
  };

  // Finalize verdict, trigger Cognee REMEMBER, and report complete
  const finalizeAdjudication = async (completedSteps: TheaterStep[]) => {
    const approverStep = completedSteps[4];
    const approverVerdict = approverStep.jsonBlock?.verdict || "NEEDS_REVISION";
    const overallScore = approverStep.jsonBlock?.overallScore || 50;

    // Create a new memory record and save to Cognee
    const newId = `review-${Math.random().toString(36).substring(2, 7)}`;
    const tagsArray = campaignTags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    const complianceStep = completedSteps[1];
    const hasGreenwashing = complianceStep.jsonBlock?.reasons?.some((r: string) =>
      r.toLowerCase().includes("greenwash") || r.toLowerCase().includes("eco")
    );
    const hasMedical = complianceStep.jsonBlock?.reasons?.some((r: string) =>
      r.toLowerCase().includes("clinical") || r.toLowerCase().includes("fda") || r.toLowerCase().includes("cure")
    );

    const saveTags = ["review", ...tagsArray, approverVerdict.toLowerCase()];
    if (hasGreenwashing) saveTags.push("greenwashing");
    if (hasMedical) saveTags.push("medical_violation");

    const verdictPayload = {
      id: newId,
      type: "review",
      content: `Campaign Verdict: ${approverVerdict}. Overall Rating Score: ${overallScore}/100. compliance_score: ${
        completedSteps[1].jsonBlock?.score || "—"
      }/100. Brief Sample: "${campaignCopy.substring(0, 100)}...". Notes: ${approverStep.paragraph.substring(0, 100)}...`,
      tags: saveTags,
      weight: overallScore / 100,
      links: [],
    };

    // Save report to Cognee persistent loop
    let createdNode: MemoryNode;
    try {
      createdNode = await client.remember(verdictPayload);
    } catch (e) {
      console.warn("Cognee save failure during finalize:", e);
      // Fallback node creation
      createdNode = {
        id: newId,
        type: "review",
        content: verdictPayload.content,
        tags: saveTags,
        weight: verdictPayload.weight,
        timestamp: new Date().toISOString(),
      };
    }

    setIsProcessing(false);
    setCurrentStepIndex(-1);
    onAdjudicationComplete(approverVerdict, overallScore, createdNode);
  };

  // Chat Interaction with specific Agent Role (supports @Analyst why 62?)
  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || isAgentReplying) return;

    const userText = chatInput.trim();
    setChatInput("");

    const newMsg: ChatMessage = {
      id: `chat-${Date.now()}`,
      sender: "user",
      text: userText,
    };

    setChatMessages((prev) => [...prev, newMsg]);

    // Parse the mentioned agent
    const mentionRegex = /^@(coordinator|compliance|analyst|strategist|approver|aletheia|nomos|logos|metis|phronesis)\b/i;
    const match = userText.match(mentionRegex);

    let targetAgent: AgentType = "coordinator"; // default
    let matchedName = "ALETHEIA";

    if (match) {
      const mention = match[1].toLowerCase();
      if (mention === "compliance" || mention === "nomos") {
        targetAgent = "compliance";
        matchedName = "NOMOS";
      } else if (mention === "analyst" || mention === "logos") {
        targetAgent = "analyst";
        matchedName = "LOGOS";
      } else if (mention === "strategist" || mention === "metis") {
        targetAgent = "strategist";
        matchedName = "METIS";
      } else if (mention === "approver" || mention === "phronesis") {
        targetAgent = "approver";
        matchedName = "PHRONESIS";
      } else {
        targetAgent = "coordinator";
        matchedName = "ALETHEIA";
      }
    } else {
      // If no agent mentioned, default back to the Approver
      targetAgent = "approver";
      matchedName = "PHRONESIS";
    }

    setIsAgentReplying(true);
    setIsChatRecalling(true);
    onIncrementRecalls();

    // 1. RECALL memories based on user message terms
    let chatRecalls: MemoryNode[] = [];
    try {
      chatRecalls = await client.recall(userText);
      setActiveChatRecalls(chatRecalls);
    } catch (e) {
      console.warn("Chat recall failure:", e);
    }

    // Stagger to show recalling panel
    await new Promise((resolve) => setTimeout(resolve, 1400));
    setIsChatRecalling(false);

    // 2. Build prompt with agent's instructions
    const roleConfig = AGENT_ROLES[targetAgent];
    const memoriesStr = chatRecalls
      .map((m) => `[ID: ${m.id} Type: ${m.type}]: "${m.content}"`)
      .join("\n");

    const currentAdjudicationPacket = steps
      .map((s) => `${s.name} output: ${s.paragraph}`)
      .join("\n\n");

    const chatPrompt = `
You are ${roleConfig.name}, the ${roleConfig.title}. The user is addressing you directly during a free chat session regarding the marketing campaign review.

Campaign copy of interest:
"${campaignCopy}"

Here is the current team's full review packet:
${currentAdjudicationPacket}

RELEVANT COGNEE MEMORY RECALLS FOR THIS QUERY:
${memoriesStr || "No matching past review files located."}

User Direct Query:
"${userText}"

Provide a highly realistic response in character, referencing recalled files if helpful. Keep it to one short paragraph. Do not return JSON blocks. Keep your distinct black/white/one-red persona tone intact.
`;

    const responseMsgId = `chat-resp-${Date.now()}`;
    const agentMsgPlaceholder: ChatMessage = {
      id: responseMsgId,
      sender: "agent",
      agentType: targetAgent,
      agentName: matchedName,
      text: "",
      recalledMemories: chatRecalls,
      isTyping: true,
    };

    setChatMessages((prev) => [...prev, agentMsgPlaceholder]);

    try {
      const responseText = await callGemini(roleConfig.systemInstruction, chatPrompt);

      // Clean response of any formatting markdown fences if returned
      const cleanedResp = responseText.replace(/```json[\s\S]*?```/g, "").replace(/---/g, "").trim();

      // Progressive typing for chat response
      let index = 0;
      const interval = setInterval(() => {
        index += 4;
        if (index >= cleanedResp.length) {
          clearInterval(interval);
          setChatMessages((prev) =>
            prev.map((m) =>
              m.id === responseMsgId
                ? { ...m, text: cleanedResp, isTyping: false }
                : m
            )
          );
          setIsAgentReplying(false);
          setActiveChatRecalls([]);
        } else {
          setChatMessages((prev) =>
            prev.map((m) =>
              m.id === responseMsgId
                ? { ...m, text: cleanedResp.substring(0, index) }
                : m
            )
          );
        }
      }, 12);
    } catch (err) {
      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === responseMsgId
            ? { ...m, text: "Error: Failed to fetch single agent response.", isTyping: false }
            : m
        )
      );
      setIsAgentReplying(false);
      setActiveChatRecalls([]);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header section with CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-4">
        <div>
          <h3 className="font-mono text-xs tracking-widest uppercase text-white/50">
            REVIEW THEATER MODE
          </h3>
          <p className="text-[11px] text-white/40 font-mono tracking-wider mt-1 uppercase">
            Assemble the team to review copy. Watch the live Cognee memory loops unfold.
          </p>
        </div>

        <button
          id="btn-convene-theater"
          onClick={handleConveneTeam}
          disabled={isProcessing || !campaignCopy.trim()}
          className={`border px-5 py-2 font-mono text-[11px] tracking-widest uppercase flex items-center gap-2 cursor-pointer transition-all duration-300 ${
            isProcessing || !campaignCopy.trim()
              ? "bg-white/5 text-white/30 border-white/5 cursor-not-allowed"
              : "bg-white text-black border-white hover:bg-black hover:text-white"
          }`}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              THEATER_ACTIVE_RUN...
            </>
          ) : (
            <>
              <BrainCircuit className="w-3.5 h-3.5" />
              CONVENE THE TEAM
            </>
          )}
        </button>
      </div>

      {/* Review Theater Timeline Stage */}
      <div className="border border-white/10 bg-[#030303] min-h-[450px] p-6 space-y-8 relative">
        <div className="absolute top-3 right-4 flex items-center gap-2 font-mono text-[9px] text-white/30 uppercase tracking-widest pointer-events-none select-none">
          <span className={`w-1.5 h-1.5 rounded-full ${isProcessing ? "bg-red-600 animate-pulse" : "bg-white/20"}`} />
          {isProcessing ? "DELIBERATION_IN_PROGRESS" : "AWAITING_STAGE_TRIGGER"}
        </div>

        {/* Timeline loop */}
        <div className="relative pl-6 md:pl-8 border-l border-white/10 space-y-8">
          {steps.map((step, index) => {
            const isIdle = step.status === "idle";
            const isActive = isProcessing && currentStepIndex === index;
            const isFinished = step.status === "completed" || step.paragraph.length > 0;
            const isRecalling = step.status === "recalling";
            const isCallingGemini = step.status === "calling_gemini";
            const isError = step.status === "error";

            if (isIdle) return null;

            // Compute border and ring styles
            let dotColorClass = "bg-white/20 border-white/10";
            if (isActive || isRecalling || isCallingGemini) {
              dotColorClass = "bg-[#FF3B30] border-[#FF3B30] ring-4 ring-[#FF3B30]/10";
            } else if (isFinished) {
              dotColorClass = "bg-white border-white";
            } else if (isError) {
              dotColorClass = "bg-red-600 border-red-600";
            }

            return (
              <div
                id={`theater-step-${step.agent}`}
                key={step.agent}
                className="relative space-y-3 transition-opacity duration-300"
              >
                {/* Visual Timeline Marker Node */}
                <div
                  className={`absolute -left-[31px] md:-left-[39px] top-1.5 w-4 h-4 rounded-full border flex items-center justify-center transition-all duration-300 ${dotColorClass}`}
                >
                  {isFinished && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
                </div>

                {/* Agent Header Info */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-white/40">{getAgentIcon(step.agent)}</span>
                    <h4 className="font-bold text-sm text-white tracking-tight">
                      {step.name}{" "}
                      <span className="font-mono text-[9px] text-white/30 uppercase tracking-widest font-normal">
                        ({step.title})
                      </span>
                    </h4>
                  </div>
                  <span className="font-mono text-[9px] tracking-widest text-white/30 uppercase">
                    STEP_0{index + 1} · {step.status.toUpperCase()}
                  </span>
                </div>

                {/* Cognee Memory recall notification loop */}
                {(isRecalling || isCallingGemini || (step.recalledMemories && step.recalledMemories.length > 0)) && (
                  <div
                    className={`p-3 font-mono border transition-all duration-300 ${
                      isRecalling
                        ? "bg-[#FF3B30]/5 border-[#FF3B30]/20 animate-pulse text-white"
                        : "bg-white/5 border-white/10 text-white/80"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[9px] uppercase tracking-widest mb-1.5 text-white/50">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30] animate-ping" />
                        RECALLING FROM COGNEE...
                      </span>
                      <span>{step.recalledMemories.length} OBJECTS FOUND</span>
                    </div>

                    {isRecalling ? (
                      <p className="text-[9px] text-[#FF3B30] font-bold uppercase tracking-wider animate-pulse">
                        {" >> "} CONSULTING MEMORY SYSTEM FOR SUB-DOMAIN RULES & DECISION PATTERNS...
                      </p>
                    ) : step.recalledMemories.length === 0 ? (
                      <p className="text-[9px] text-white/40 italic uppercase tracking-wider">
                        {" >> "} SEARCH COMPLETE: NO PREVIOUS REVIEWS MATCHED. ASSUMING STANDARD BASELINE.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {step.recalledMemories.map((mem) => {
                          const isRejected = mem.content.toLowerCase().includes("rejected");
                          return (
                            <div
                              key={mem.id}
                              className={`text-[8px] px-2 py-0.5 border flex items-center gap-1 uppercase tracking-wider ${
                                isRejected
                                  ? "bg-[#FF3B30]/5 border-[#FF3B30]/30 text-[#FF3B30]"
                                  : "bg-white/5 border-white/10 text-white/60"
                              }`}
                            >
                              <span>{mem.id}</span>
                              <span className="text-white/25">({mem.type})</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Loader for model generation */}
                {isCallingGemini && (
                  <div className="flex items-center gap-2 py-3 font-mono text-[10px] text-white/50 tracking-wider">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    GENERATING AGENT COGNITION STATEMENT...
                  </div>
                )}

                {/* Error presentation block with retry button */}
                {isError && (
                  <div className="border border-red-600/30 bg-red-600/5 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-red-500 font-mono text-[11px] uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span>{step.error || "Gemini execution block failed"}</span>
                    </div>
                    <button
                      onClick={() => handleRetryStep(index)}
                      className="border border-red-600 text-red-600 hover:bg-red-600 hover:text-white px-3 py-1 font-mono text-[10px] tracking-widest uppercase cursor-pointer transition-all duration-300"
                    >
                      Retry Agent Call
                    </button>
                  </div>
                )}

                {/* Progressive Typed Paragraph */}
                {step.typedParagraph && (
                  <p className="text-xs leading-relaxed text-white/80 whitespace-pre-line font-sans tracking-wide">
                    {step.typedParagraph}
                  </p>
                )}

                {/* Strict JSON outputs formatted as neat mono codeblocks */}
                {step.jsonBlock && step.status !== "typing" && (
                  <div className="space-y-1.5 mt-2">
                    <span className="font-mono text-[8px] text-white/25 block tracking-widest uppercase">
                      VERDICT_SCHEMA_PACKET:
                    </span>
                    <pre className="p-3 bg-[#080808] border border-white/5 font-mono text-[10px] text-white/70 overflow-x-auto selection:bg-white selection:text-black">
                      <code>{JSON.stringify(step.jsonBlock, null, 2)}</code>
                    </pre>

                    {/* Particular colors for verdict or ratings */}
                    {step.jsonBlock.verdict && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-[9px] text-white/40 uppercase tracking-widest">
                          DECISION STATE:
                        </span>
                        <span
                          className={`font-mono text-[10px] font-bold px-1.5 py-0.5 border ${
                            step.jsonBlock.verdict === "APPROVED"
                              ? "bg-white text-black border-white"
                              : step.jsonBlock.verdict === "REJECTED"
                              ? "bg-[#FF3B30] text-white border-[#FF3B30]"
                              : "bg-white/10 text-white border-white/20"
                          }`}
                        >
                          {step.jsonBlock.verdict}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty placeholder */}
        {steps.every((s) => s.status === "idle") && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <BrainCircuit className="w-10 h-10 text-white/15" />
            <div className="space-y-1.5">
              <h4 className="font-mono text-xs uppercase tracking-widest text-white/40">
                Theater Is Dark
              </h4>
              <p className="text-[11px] text-white/25 uppercase font-mono max-w-xs tracking-wider leading-relaxed">
                Provide copy above and trigger "Convene the Team" to initiate multi-agent deliberation.
              </p>
            </div>
          </div>
        )}

        <div ref={timelineEndRef} />
      </div>

      {/* Free Chat Dock (Supports @Analyst or role queries post review) */}
      <div className="border border-white/10 bg-[#020202] flex flex-col justify-between">
        <div className="p-4 border-b border-white/15 bg-black/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-[#FF3B30] rounded-full" />
            <h4 className="font-mono text-[10px] tracking-widest uppercase text-white/60">
              FREE-CHAT INTERACTION DOCK
            </h4>
          </div>
          <span className="font-mono text-[8px] text-white/30 uppercase tracking-widest">
            @-ADDRESS ANY SINGLE AGENT AFTER DELIBERATION
          </span>
        </div>

        {/* Chat Stream scroll area */}
        <div className="p-4 max-h-[250px] min-h-[140px] overflow-y-auto space-y-4 font-mono text-[11px]">
          {chatMessages.length === 0 ? (
            <div className="text-center py-8 text-white/20 italic">
              No single agent chat history. Type @Analyst or @Compliance to query.
            </div>
          ) : (
            chatMessages.map((msg) => {
              const isAgent = msg.sender === "agent";
              return (
                <div key={msg.id} className="space-y-2">
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`font-bold tracking-widest uppercase ${
                        isAgent ? "text-[#FF3B30]" : "text-white/40"
                      }`}
                    >
                      [{isAgent ? msg.agentName : "USER"}]:
                    </span>
                    <span className="text-white/80 whitespace-pre-line tracking-wide leading-relaxed">
                      {msg.text}
                      {msg.isTyping && <span className="animate-pulse font-bold">█</span>}
                    </span>
                  </div>

                  {/* Show Cognee memory recalled chips for the query */}
                  {isAgent && msg.recalledMemories && msg.recalledMemories.length > 0 && (
                    <div className="pl-6 flex flex-wrap gap-1.5">
                      <span className="text-[8px] text-white/20 uppercase tracking-wider self-center">
                        MEMORIES_CONSULTED:
                      </span>
                      {msg.recalledMemories.map((m) => (
                        <span
                          key={m.id}
                          className="text-[8px] bg-white/5 border border-white/10 px-1.5 py-0.2 text-white/50"
                        >
                          #{m.id}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Recalling panel overlay for Chat */}
          {isChatRecalling && (
            <div className="p-3 bg-[#FF3B30]/5 border border-[#FF3B30]/20 animate-pulse text-white space-y-1">
              <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest text-[#FF3B30] font-bold">
                <Loader2 className="w-3 h-3 animate-spin text-[#FF3B30]" />
                RECALLING FROM COGNEE...
              </div>
              <p className="text-[8px] text-white/40 uppercase tracking-wider">
                {" >> "} RUNNING CONTEXT-AWARE SEMANTIC RETRIEVAL FOR CORRESPONDING CASE MEMORIES...
              </p>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input box */}
        <div className="p-3 border-t border-white/10 bg-black/40 flex items-center gap-2.5">
          <input
            id="chat-dock-input"
            type="text"
            placeholder="Type e.g. '@Analyst explain hook rating' or '@Compliance what disclosures?'"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isAgentReplying) {
                handleSendChatMessage();
              }
            }}
            disabled={isAgentReplying}
            className="flex-1 bg-black border border-white/15 px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-white transition-colors placeholder-white/20 rounded-none disabled:opacity-40"
          />
          <button
            id="btn-send-chat"
            onClick={handleSendChatMessage}
            disabled={isAgentReplying || !chatInput.trim()}
            className={`border px-3 py-2 font-mono text-xs uppercase flex items-center justify-center cursor-pointer transition-colors ${
              isAgentReplying || !chatInput.trim()
                ? "bg-white/5 text-white/20 border-white/5 cursor-not-allowed"
                : "bg-white text-black border-white hover:bg-black hover:text-white"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
