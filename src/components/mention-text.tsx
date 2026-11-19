"use client";

import React from "react";
import { MapPin, UserRound } from "lucide-react";
import { Character, Collection } from "@/lib/characters";

type MentionTarget = {
  key: string;
  label: string;
  kind: "character" | "location";
  id: string;
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function LinkedText({
  text,
  currentCharacterId,
  characters,
  collections,
  onSelectCharacter,
  onSelectLocation,
}: {
  text: string;
  currentCharacterId?: string;
  characters: Character[];
  collections: Collection[];
  onSelectCharacter?: (id: string) => void;
  onSelectLocation?: (id: string) => void;
}) {
  if (!text) return null;
  if (!onSelectCharacter && !onSelectLocation) return <>{text}</>;

  const targets: MentionTarget[] = [];
  const seen = new Set<string>();

  for (const ch of characters) {
    if (ch.id === currentCharacterId) continue;
    const full = ch.name.trim();
    if (full.length >= 3 && !seen.has(full.toLowerCase())) {
      seen.add(full.toLowerCase());
      targets.push({ key: full.toLowerCase(), label: full, kind: "character", id: ch.id });
    }
  }

  for (const col of collections) {
    const full = col.name.trim();
    if (full.length >= 3 && !seen.has(full.toLowerCase())) {
      seen.add(full.toLowerCase());
      targets.push({ key: full.toLowerCase(), label: full, kind: "location", id: col.id });
    }
  }

  // Sort longest first so multi-word names match before shorter substrings
  targets.sort((a, b) => b.label.length - a.label.length);
  if (!targets.length) return <>{text}</>;

  const pattern = new RegExp(`(${targets.map(t => escapeRegExp(t.label)).join("|")})`, "gi");
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, idx) => {
        if (!part) return null;
        const lower = part.toLowerCase();
        const matched = targets.find(t => t.key === lower);
        if (!matched) return <React.Fragment key={idx}>{part}</React.Fragment>;

        if (matched.kind === "character" && onSelectCharacter) {
          return (
            <button
              key={idx}
              type="button"
              className="mention-link character-mention"
              onClick={() => onSelectCharacter(matched.id)}
              title={`Jump to ${matched.label}’s character sheet`}
            >
              <UserRound size={11} />
              {part}
            </button>
          );
        }
        if (matched.kind === "location" && onSelectLocation) {
          return (
            <button
              key={idx}
              type="button"
              className="mention-link location-mention"
              onClick={() => onSelectLocation(matched.id)}
              title={`View all characters in ${matched.label}`}
            >
              <MapPin size={11} />
              {part}
            </button>
          );
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      })}
    </>
  );
}

export function LocalRelationshipGraph({
  character,
  characters,
  collections,
  onSelectCharacter,
  onSelectLocation,
}: {
  character: Character;
  characters: Character[];
  collections: Collection[];
  onSelectCharacter: (id: string) => void;
  onSelectLocation: (id: string) => void;
}) {
  type GraphNode = {
    id: string;
    label: string;
    kind: "character" | "location" | "external";
    relation: string;
    note?: string;
  };

  const nodes: GraphNode[] = [];
  const seenIds = new Set<string>();

  // 1. Outgoing typed connections
  for (const conn of character.connections || []) {
    const matchedChar = characters.find(
      c => c.id === conn.targetId || c.name.toLowerCase() === conn.targetName.toLowerCase()
    );
    const matchedLoc = !matchedChar
      ? collections.find(col => col.name.toLowerCase() === conn.targetName.toLowerCase())
      : undefined;
    const nodeId = matchedChar ? `char:${matchedChar.id}` : matchedLoc ? `loc:${matchedLoc.id}` : `ext:${conn.targetName.toLowerCase()}`;
    if (!seenIds.has(nodeId)) {
      seenIds.add(nodeId);
      nodes.push({
        id: matchedChar?.id || matchedLoc?.id || conn.id,
        label: matchedChar?.name || matchedLoc?.name || conn.targetName,
        kind: matchedChar ? "character" : matchedLoc ? "location" : "external",
        relation: conn.type,
        note: conn.note,
      });
    }
  }

  // 2. Incoming typed connections from other saved characters
  for (const other of characters) {
    if (other.id === character.id) continue;
    for (const conn of other.connections || []) {
      if (conn.targetId === character.id || conn.targetName.toLowerCase() === character.name.toLowerCase()) {
        const nodeId = `char:${other.id}`;
        if (!seenIds.has(nodeId)) {
          seenIds.add(nodeId);
          nodes.push({
            id: other.id,
            label: other.name,
            kind: "character",
            relation: conn.type,
            note: conn.note,
          });
        }
      }
    }
  }

  // 3. Current location folder
  const homeCol = collections.find(c => c.id === character.collectionId);
  if (homeCol && !seenIds.has(`loc:${homeCol.id}`)) {
    seenIds.add(`loc:${homeCol.id}`);
    nodes.push({
      id: homeCol.id,
      label: homeCol.name,
      kind: "location",
      relation: "located at",
    });
  }

  // 4. Auto-detected mentions in backstory
  const searchCorpus = `${character.backstory} ${character.notes.map(n => n.text).join(" ")}`.toLowerCase();
  if (searchCorpus.trim()) {
    for (const other of characters) {
      if (other.id === character.id) continue;
      if (searchCorpus.includes(other.name.toLowerCase()) && !seenIds.has(`char:${other.id}`)) {
        seenIds.add(`char:${other.id}`);
        nodes.push({
          id: other.id,
          label: other.name,
          kind: "character",
          relation: "mentioned in lore",
        });
      }
    }
  }

  const displayNodes = nodes.slice(0, 8);
  const cx = 280;
  const cy = 135;
  const rx = 195;
  const ry = 92;

  return (
    <div className="local-graph-card" aria-label={`Local relationship web for ${character.name}`}>
      <div className="local-graph-header">
        <span>LOCAL RELATIONSHIP WEB ({displayNodes.length} {displayNodes.length === 1 ? "LINK" : "LINKS"})</span>
        <small>Click any character or location node to jump to it</small>
      </div>
      <svg viewBox="0 0 560 270" className="local-graph-svg" role="img" aria-label={`Relationship diagram for ${character.name}`}>
        {displayNodes.map((node, i) => {
          const angle = (2 * Math.PI * i) / Math.max(1, displayNodes.length) - Math.PI / 2;
          const nx = cx + rx * Math.cos(angle);
          const ny = cy + ry * Math.sin(angle);
          const mx = (cx + nx) / 2;
          const my = (cy + ny) / 2;
          return (
            <g key={`edge-${node.kind}-${node.id}-${i}`}>
              <line
                x1={cx}
                y1={cy}
                x2={nx}
                y2={ny}
                className={`graph-edge edge-${node.kind}`}
              />
              <rect
                x={mx - 46}
                y={my - 9}
                width={92}
                height={18}
                rx={4}
                className="graph-edge-pill"
              />
              <text x={mx} y={my + 3.5} textAnchor="middle" className="graph-edge-label">
                {node.relation.length > 18 ? `${node.relation.slice(0, 17)}…` : node.relation}
              </text>
            </g>
          );
        })}

        {/* Center node */}
        <g className="graph-node-center">
          <circle cx={cx} cy={cy} r={26} className="center-node-circle" />
          <text x={cx} y={cy + 4} textAnchor="middle" className="center-node-text">
            {character.name.split(" ")[0]}
          </text>
        </g>

        {/* Satellite nodes */}
        {displayNodes.map((node, i) => {
          const angle = (2 * Math.PI * i) / Math.max(1, displayNodes.length) - Math.PI / 2;
          const nx = cx + rx * Math.cos(angle);
          const ny = cy + ry * Math.sin(angle);
          const clickable = node.kind === "character" || node.kind === "location";
          return (
            <g
              key={`node-${node.kind}-${node.id}-${i}`}
              className={`graph-node graph-node-${node.kind} ${clickable ? "is-clickable" : ""}`}
              onClick={() => {
                if (node.kind === "character") onSelectCharacter(node.id);
                else if (node.kind === "location") onSelectLocation(node.id);
              }}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (node.kind === "character") onSelectCharacter(node.id);
                  else if (node.kind === "location") onSelectLocation(node.id);
                }
              }}
            >
              <rect
                x={nx - 62}
                y={ny - 15}
                width={124}
                height={30}
                rx={15}
                className="satellite-node-pill"
              />
              <text x={nx} y={ny + 4} textAnchor="middle" className="satellite-node-text">
                {node.label.length > 17 ? `${node.label.slice(0, 16)}…` : node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
