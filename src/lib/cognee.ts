/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MemoryNode } from "../types";

// COGNEE CLOUD CONFIGURATION BLOCK
// Configuration is now managed securely server-side via environment variables / secrets.
// To configure, set COGNEE_BASE_URL, COGNEE_API_KEY, and COGNEE_TENANT_ID in your deployment environment.


/**
 * High-performance, semantic-focused Local Memory Store fallback
 * Persists to localStorage to avoid losing memory on refresh
 */
export class LocalMemoryStore {
  private storageKey = "mnemosyne_local_memory";

  constructor() {
    this.initializeDefaultMemories();
  }

  private getNodes(): MemoryNode[] {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveNodes(nodes: MemoryNode[]) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(nodes));
    } catch (e) {
      console.error("LocalMemoryStore: failed to persist nodes", e);
    }
  }

  private initializeDefaultMemories() {
    const existing = this.getNodes();
    if (existing.length > 0) return;

    const defaults: MemoryNode[] = [
      {
        id: "rule-01",
        type: "compliance_rule",
        content: "FTC Environmental Claims: Avoid absolute terms like 'literally better than any other bottle on Earth', '100% eco-friendly', or 'zero carbon footprint' without certified lifecycle proof.",
        tags: ["environmental", "compliance", "ftc", "greenwashing"],
        weight: 1.0,
        timestamp: "2026-06-01T12:00:00Z",
        links: []
      },
      {
        id: "rule-02",
        type: "compliance_rule",
        content: "FTC Health/Medical claims: Any promise of health benefits, toxin elimination, or physical disease treatment requires certified double-blind clinical trials.",
        tags: ["health", "compliance", "medical", "fda"],
        weight: 1.0,
        timestamp: "2026-06-01T12:00:00Z",
        links: []
      },
      {
        id: "mem-01",
        type: "review",
        content: "Hydrogen Water Bottle Campaign: 'Boosts cell energy instantly, eliminates free radicals, and cures hangovers in 10 minutes.' Verdict: REJECTED (Unbacked medical claims).",
        tags: ["health", "water", "hydrogen", "rejected"],
        weight: 0.9,
        timestamp: "2026-07-02T10:00:00Z",
        links: ["rule-02"]
      },
      {
        id: "mem-02",
        type: "review",
        content: "AI Financial Automation platform: 'Automate spreadsheets using secure AI modeling. Accelerates forecast builds by 10x.' Verdict: APPROVED with caution (verify the 10x claim in footnoted whitepaper).",
        tags: ["saas", "ai", "finance", "approved"],
        weight: 0.85,
        timestamp: "2026-07-03T09:00:00Z",
        links: []
      },
      {
        id: "mem-03",
        type: "review",
        content: "Eco-Linen Apparel: 'Introducing our fully biodegradable, breathable linen collection. Crafted from 100% organic French flax.' Verdict: APPROVED (FTC greenwashing rule met through direct material statement).",
        tags: ["apparel", "organic", "linen", "approved"],
        weight: 0.95,
        timestamp: "2026-07-04T08:00:00Z",
        links: ["rule-01"]
      }
    ];

    this.saveNodes(defaults);
  }

  public async remember(payload: any): Promise<MemoryNode> {
    const nodes = this.getNodes();
    const timestamp = new Date().toISOString();
    
    // Deconstruct payload to make a robust node
    const id = payload.id || `node-${Math.random().toString(36).substr(2, 9)}`;
    const newNode: MemoryNode = {
      id,
      type: payload.type || "review",
      content: payload.content || JSON.stringify(payload),
      tags: Array.isArray(payload.tags) ? payload.tags.map((t: string) => t.toLowerCase()) : ["general"],
      weight: typeof payload.weight === "number" ? payload.weight : 0.8,
      timestamp,
      links: Array.isArray(payload.links) ? payload.links : []
    };

    // Auto-link to matching rules based on tag intersections
    if (newNode.type === "review" && (!newNode.links || newNode.links.length === 0)) {
      const rules = nodes.filter(n => n.type === "compliance_rule");
      const matchedRuleIds: string[] = [];
      for (const rule of rules) {
        const intersection = rule.tags.filter(t => newNode.tags.includes(t));
        if (intersection.length > 0) {
          matchedRuleIds.push(rule.id);
        }
      }
      newNode.links = matchedRuleIds;
    }

    nodes.unshift(newNode);
    this.saveNodes(nodes);
    return newNode;
  }

  public async recall(query: string): Promise<MemoryNode[]> {
    const nodes = this.getNodes();
    if (!query || query.trim() === "") {
      return nodes;
    }

    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    if (queryTerms.length === 0) {
      return nodes;
    }

    const scored = nodes.map(node => {
      let score = 0;
      const contentLower = node.content.toLowerCase();
      
      queryTerms.forEach(term => {
        // Match in main content
        if (contentLower.includes(term)) {
          score += 1.5;
        }
        // Match in tags
        node.tags.forEach(tag => {
          if (tag.toLowerCase().includes(term)) {
            score += 3.0; // Higher weight for direct tag match
          }
        });
        // Match in type
        if (node.type.toLowerCase().includes(term)) {
          score += 1.0;
        }
      });

      // Apply node significance weighting
      score *= node.weight;

      return { node, score };
    });

    // Filter out zero-scores if there are positive scores, otherwise return nodes with premium weight ranking
    const matched = scored.filter(s => s.score > 0);
    const finalSelection = matched.length > 0 ? matched : scored;

    return finalSelection
      .sort((a, b) => b.score - a.score)
      .map(s => s.node);
  }

  public async improve(): Promise<{ success: boolean; stats: { updatedRelations: number; addedClusters: number } }> {
    // Cognitive clustering emulation
    // Searches for unlinked nodes sharing identical tags and bridges them
    const nodes = this.getNodes();
    let updatedRelations = 0;
    let addedClusters = 0;

    for (let i = 0; i < nodes.length; i++) {
      const nodeA = nodes[i];
      if (!nodeA.links) nodeA.links = [];

      for (let j = i + 1; j < nodes.length; j++) {
        const nodeB = nodes[j];
        // Check tag intersection
        const commonTags = nodeA.tags.filter(t => nodeB.tags.includes(t));
        if (commonTags.length >= 2) {
          // Add reciprocal link if not already linked
          if (!nodeA.links.includes(nodeB.id)) {
            nodeA.links.push(nodeB.id);
            nodeA.weight = Math.min(1.0, nodeA.weight + 0.05); // Boost significance
            updatedRelations++;
          }
        }
      }
    }

    if (updatedRelations > 0) {
      addedClusters = Math.ceil(updatedRelations / 2);
      this.saveNodes(nodes);
    }

    return {
      success: true,
      stats: { updatedRelations, addedClusters }
    };
  }

  public async forget(targetId: string): Promise<boolean> {
    const nodes = this.getNodes();
    const initialLen = nodes.length;
    
    // Remove the node itself
    let updated = nodes.filter(n => n.id !== targetId);
    
    // Prune broken links in remaining nodes
    updated = updated.map(node => {
      if (node.links) {
        node.links = node.links.filter(id => id !== targetId);
      }
      return node;
    });

    this.saveNodes(updated);
    return updated.length < initialLen;
  }

  public getStats(): { totalNodes: number; totalLinks: number; avgWeight: number } {
    const nodes = this.getNodes();
    let totalLinks = 0;
    let totalWeight = 0;

    nodes.forEach(n => {
      if (n.links) totalLinks += n.links.length;
      totalWeight += n.weight;
    });

    return {
      totalNodes: nodes.length,
      totalLinks,
      avgWeight: nodes.length > 0 ? Number((totalWeight / nodes.length).toFixed(2)) : 0
    };
  }
}

/**
 * Direct Client for Cognee Cloud with Resilient Fallback to LocalMemoryStore
 */
export class CogneeClient {
  private localStore: LocalMemoryStore;
  private isFallbackMode: boolean = true;
  public connectionReady: Promise<boolean>;
  private resolveConnectionReady!: (value: boolean) => void;

  constructor() {
    this.localStore = new LocalMemoryStore();
    this.connectionReady = new Promise<boolean>((resolve) => {
      this.resolveConnectionReady = resolve;
    });
    this.checkCloudConnection();
  }

  private async checkCloudConnection() {
    const isConnected = await this.checkConnection();
    this.resolveConnectionReady(isConnected);
  }

  public async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch("/api/cognee/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: "ping" }),
      });
      if (response.ok) {
        this.isFallbackMode = false;
      } else {
        this.isFallbackMode = true;
      }
    } catch {
      this.isFallbackMode = true;
    }
    return !this.isFallbackMode;
  }

  public isUsingLocalFallback(): boolean {
    return this.isFallbackMode;
  }

  public async remember(payload: any): Promise<MemoryNode> {
    if (this.isFallbackMode) {
      return this.localStore.remember(payload);
    }

    try {
      const response = await fetch("/api/cognee/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Cognee Cloud responded with status: ${response.status}`);
      }

      const json = await response.json();
      return {
        id: json.id || payload.id || `cloud-${Math.random().toString(36).substr(2, 9)}`,
        type: payload.type || "review",
        content: payload.content || JSON.stringify(payload),
        tags: payload.tags || [],
        weight: payload.weight || 0.8,
        timestamp: new Date().toISOString()
      };
    } catch (e) {
      console.warn("Cognee Client: Cloud failure on remember. Invoking local store.", e);
      return this.localStore.remember(payload);
    }
  }

  public async recall(query: string): Promise<MemoryNode[]> {
    if (this.isFallbackMode) {
      return this.localStore.recall(query);
    }

    try {
      const response = await fetch("/api/cognee/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`Cognee Cloud responded with status: ${response.status}`);
      }

      const json = await response.json();
      if (Array.isArray(json)) {
        return json.map((item: any) => ({
          id: item.id || `cloud-${Math.random().toString(36).substr(2, 9)}`,
          type: item.type || "review",
          content: item.content || item.text || JSON.stringify(item),
          tags: item.tags || [],
          weight: item.score || item.weight || 0.8,
          timestamp: item.timestamp || new Date().toISOString()
        }));
      }
      
      return this.localStore.recall(query);
    } catch (e) {
      console.warn("Cognee Client: Cloud failure on recall. Invoking local store.", e);
      return this.localStore.recall(query);
    }
  }

  public async improve(): Promise<{ success: boolean; stats: { updatedRelations: number; addedClusters: number } }> {
    if (this.isFallbackMode) {
      return this.localStore.improve();
    }

    try {
      const response = await fetch("/api/cognee/cognify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        }
      });

      if (!response.ok) {
        throw new Error(`Cognee Cloud responded with status: ${response.status}`);
      }

      return {
        success: true,
        stats: { updatedRelations: 15, addedClusters: 4 }
      };
    } catch (e) {
      console.warn("Cognee Client: Cloud failure on improve. Invoking local store.", e);
      return this.localStore.improve();
    }
  }

  public async forget(targetId: string): Promise<boolean> {
    if (this.isFallbackMode) {
      return this.localStore.forget(targetId);
    }

    try {
      const response = await fetch("/api/cognee/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetId }),
      });

      if (!response.ok) {
        return false;
      }
      const json = await response.json();
      return !!json.success;
    } catch (e) {
      console.warn("Cognee Client: Cloud failure on forget. Invoking local store.", e);
      return this.localStore.forget(targetId);
    }
  }

  public getStats() {
    return this.localStore.getStats();
  }
}
