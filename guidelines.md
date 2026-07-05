# 📖 Run-time Guidelines & User Manual
### *How to Run, Test, and Evaluate Mnemosyne Locally*

This document provides a comprehensive walkthrough for setting up Mnemosyne on a local machine, exploring its core features, and observing the "magic moments" during evaluations.

---

## 🛠️ Local Installation & Setup

To execute Mnemosyne on your local development system, follow these straightforward steps:

### 1. Prerequisites
- **Node.js**: Version 18 or higher is required.
- **npm**: Comes bundled with Node.js.

### 2. Configure Environment Variables
Create a file named `.env` in the root directory of the project. Copy the variables from `.env.example` and supply your API keys:

```env
# Google Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Cognee Cloud Connection Configuration
# Retrieve these credentials from your Cognee dashboard (https://platform.cognee.ai)
COGNEE_API_KEY=your_cognee_api_key_here
COGNEE_TENANT_ID=your_custom_tenant_id_or_default
COGNEE_BASE_URL=https://api.cognee.ai
```

> ⚠️ **Security Note**: Never commit your actual `.env` file containing secrets to public version control systems.

### 3. Install Dependencies
Run the package installation command to pull down required modules:
```bash
npm install
```

### 4. Boot up Development Server
Launch the full-stack development workspace (Vite frontend + Express backend):
```bash
npm run dev
```
Once started, open your browser to **`http://localhost:3000`** to interact with the application.

### 5. Build and Run in Production Mode
To compile the workspace into optimized static assets and bundle the server:
```bash
# Build Vite client assets and esbuild backend server
npm run build

# Start the compiled self-contained CommonJS backend
npm start
```

---

## 🚀 Step-by-Step Feature Walkthrough

Follow this sequence to experience the complete persistent memory lifecycle:

### Step 1: Inspect the Status Bar & Connections
At the absolute top of the screen, look at the status indicators:
- **MEMORIES**: Tracks count of total indexed knowledge nodes.
- **RECALLS**: Total query lookups performed during active reviews.
- **ACCURACY**: Machine-learning predictions-to-outcomes calibration. Starts at `—` or a baseline percentage, and scales dynamically as outcomes are grounded.
- **COGNEE CLOUD**: Shows **`CONNECTED`** (active connection to real Cognee cloud servers) or **`LOCAL_FALLBACK`** (if sandboxed or CORS-blocked, gracefully routing through a client-side mock store to guarantee flawless operation).

### Step 2: Seed Brand Rules
Before evaluating copy, define some parameters:
1. Locate the **"INGEST_NEW_RULE"** panel.
2. Enter a compliance rule or FTC guideline (e.g., *"FTC Environmental Claim Rule: Any claims using words like 'Eco', 'Green', or 'Sustainable' must clearly list verifiable materials or source certified credentials. Broad claims are forbidden."*).
3. Tag the rule as `compliance`, `brand`, or `ftc`.
4. Click **"INGEST TO COGNEE SCHEMA"**.
5. **What to Observe**: The `MEMORIES` count increments. The memory is immediately written to Cognee. A beautiful new white node appears on the animated **Knowledge Graph View** with connections spreading to existing nodes, and a log line gets added to the **Memory Ledger**.

### Step 3: Evaluate Promotional Copy
Now, let's run the multi-agent pipeline:
1. Paste a promotional copy block into the **"PROMOTIONAL COPY INPUT"** field (e.g. *"Our revolutionary eco-bottle is 100% green and cures dehydration instantly!"*).
2. Click **"COMMENCE ADJUDICATION"**.
3. **What to Observe**: 
   - A pulsing query searching your Cognee memory system is initiated. It pulls relevant rules and previous reviews.
   - The three specialized agents (**Logos**, **Metis**, and **Nomos**) fire in sequence, deconstructing the copy, comparing claims against recalled memory nodes, and producing a structured compliance card with risk warnings.

### Step 4: Close the Feedback Loop with Outcome Grounding
LLM predictions should be calibrated against real-world data.
1. Click on the newly created **Review Node** in the Knowledge Graph, or select it from the Memory list.
2. In the deconstructed details pane below the graph, locate the **"OUTCOME GROUNDING"** section.
3. Enter what actually happened when the campaign went live (e.g., *"Ad campaign launched; FTC issued a formal warnings letter on our 'cures dehydration' statement."*).
4. Click **"SUBMIT GROUND TRUTH"**.
5. **What to Observe**: An `OUTCOME` node is saved to Cognee, linked directly to the original review node. A dotted border loop surrounds the new node in the graph, closing the prediction-to-reality cycle.

### Step 5: Calibrate System Weights (MEMIFY)
This is the demo's climax. 
1. Click the prominent **"MEMIFY"** button.
2. This invokes the Cognee `improve()` API and starts a local cognitive recalibration pass.
3. **What to Observe**: 
   - Cinematic telemetry logs stream in the console: *"Comparing predictions vs reported outcomes, adjusting weights..."*.
   - A magical overlay card appears: **"WHAT THE TEAM LEARNED (COGNITIVE RECALIBRATION)"**, summarizing the precise shifts in weight authority (e.g., *“Logos over-scored interactive carousels by 15pts. Corrective weight matrices calibrated.”*).
   - The **System Accuracy indicator** in the status bar climbs dynamically to **94%**.

### Step 6: Prune Stale Memories (Forget)
1. Select a stale review or rule.
2. Click the **"FORGET"** button next to it.
3. **What to Observe**: 
   - The node in the **Knowledge Graph** begins an active, bright red pulsing animation, signifying its transition out of memory.
   - After 1 second, the node dissolves from the workspace completely.
   - The Memory Ledger records: `[FORGET] · <id> · node pruned · dissolving graph edge`.

---

## 🔍 Magic Moments to Point Out to Judges

If you are demoing this app to hackathon judges, make sure to highlight these specific visual and technical achievements:

- **The Sharp Monochromatic Aesthetic**: Zero templates were harmed. The design is strictly black/white, employing red only as a critical state indicator or a fallback indicator. 
- **The SVG Graph Physics**: Zoom, pan, and click are entirely client-driven with fluid animations, making complex databases extremely approachable.
- **The Memory Ledger**: Shows an auditable trail of all operations. It proves that the application communicates with high-utility cloud architectures.
- **The Under-The-Hood Mapping Table**: Located at the page footer, this serves as immediate documentation showing how client requests translate to standard REST endpoints on Cognee.
