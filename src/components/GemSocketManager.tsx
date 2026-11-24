import React, { useCallback, useEffect, useMemo, useState } from 'react';

export type SocketColor = 'red' | 'blue' | 'green' | 'white';
export type GemKind = 'active' | 'support';
export type EdgeLinkState = 'empowered' | 'charged' | 'dormant';

export interface GemStats {
  baseDmg?: number;
  baseCd?: number;
  manaCost?: number;
  dmgMult?: number;
  aoeMult?: number;
  cdMult?: number;
  mpMult?: number;
  extraProj?: number;
  chains?: number;
  ignite?: boolean;
  leech?: number;
}

export interface SkillGem {
  uid: string;
  defId: string;
  name: string;
  kind: GemKind;
  color: SocketColor;
  tag: string;
  icon: string;
  level: number;
  desc: string;
  stats: GemStats;
}

export interface ItemSocket {
  id: string;
  color: SocketColor;
  gem: SkillGem | null;
}

export interface SocketedItem {
  id: string;
  name: string;
  slot: string;
  rarity: 'Magic' | 'Rare' | 'Unique';
  icon: string;
  corrupted?: boolean;
  sockets: ItemSocket[];
  links: Array<[number, number]>;
}

export interface LinkGroupSummary {
  groupIndex: number;
  socketIndices: number[];
  actives: Array<{
    gem: SkillGem;
    socketIndex: number;
    effectiveDmg: number;
    effectiveCd: number;
    effectiveMana: number;
    aoePct: number;
    extraProj: number;
    chains: number;
    ignite: boolean;
    leechPct: number;
  }>;
  supports: Array<{ gem: SkillGem; socketIndex: number }>;
  empowered: boolean;
  orphanSupports: boolean;
  multipliers: {
    dmgMult: number;
    aoeMult: number;
    cdMult: number;
    mpMult: number;
    extraProj: number;
    chains: number;
    ignite: boolean;
    leechPct: number;
  };
}

export interface DragGemPayload {
  source: 'stash' | 'socket';
  gemUid: string;
  itemId?: string;
  socketIndex?: number;
}

const GEM_STORAGE_KEY = 'ashen_eclipse_gem_sockets_v2';

const COLOR_META: Record<
  SocketColor,
  {
    label: string;
    statCode: string;
    ring: string;
    bg: string;
    text: string;
    beam: string;
    glow: string;
  }
> = {
  red: {
    label: 'Crimson',
    statCode: 'STR · Red',
    ring: 'border-[#e0564b]',
    bg: 'bg-[#2a1214]',
    text: 'text-[#ff9c94]',
    beam: '#ff6f61',
    glow: 'rgba(255, 111, 97, 0.72)',
  },
  blue: {
    label: 'Sapphire',
    statCode: 'INT · Blue',
    ring: 'border-[#54a8ff]',
    bg: 'bg-[#101c2e]',
    text: 'text-[#9bd1ff]',
    beam: '#64b8ff',
    glow: 'rgba(100, 184, 255, 0.72)',
  },
  green: {
    label: 'Viridian',
    statCode: 'DEX · Green',
    ring: 'border-[#54cf7d]',
    bg: 'bg-[#102418]',
    text: 'text-[#98f5b8]',
    beam: '#63e38e',
    glow: 'rgba(99, 227, 142, 0.72)',
  },
  white: {
    label: 'Prismatic',
    statCode: 'ANY · White',
    ring: 'border-[#e8dcc7]',
    bg: 'bg-[#211d26]',
    text: 'text-[#f8efe0]',
    beam: '#ffd87a',
    glow: 'rgba(255, 216, 122, 0.78)',
  },
};

export function normalizeEdge(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a];
}

export function hasLinkEdge(
  links: Array<[number, number]>,
  a: number,
  b: number
): boolean {
  const [min, max] = normalizeEdge(a, b);
  return links.some(
    ([x, y]) => Math.min(x, y) === min && Math.max(x, y) === max
  );
}

export function toggleAdjacentSocketLink(
  items: SocketedItem[],
  itemId: string,
  a: number,
  b: number
): SocketedItem[] {
  return items.map((it) => {
    if (it.id !== itemId) return it;
    const n = it.sockets.length;
    if (a < 0 || b < 0 || a >= n || b >= n || a === b) return it;
    const [min, max] = normalizeEdge(a, b);
    const exists = hasLinkEdge(it.links, min, max);
    const nextLinks = exists
      ? it.links.filter(
          ([x, y]) => !(Math.min(x, y) === min && Math.max(x, y) === max)
        )
      : [...it.links, [min, max] as [number, number]];
    return { ...it, links: nextLinks };
  });
}

/**
 * Resolves connected components (link groups) across an item's socket graph.
 */
export function computeLinkGroups(item: SocketedItem): number[][] {
  const n = item.sockets.length;
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const [rawA, rawB] of item.links) {
    if (
      rawA >= 0 &&
      rawA < n &&
      rawB >= 0 &&
      rawB < n &&
      rawA !== rawB
    ) {
      adj[rawA].push(rawB);
      adj[rawB].push(rawA);
    }
  }

  const visited = new Array<boolean>(n).fill(false);
  const groups: number[][] = [];

  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;
    const queue = [i];
    const component: number[] = [];
    visited[i] = true;
    while (queue.length > 0) {
      const curr = queue.shift()!;
      component.push(curr);
      for (const nxt of adj[curr]) {
        if (!visited[nxt]) {
          visited[nxt] = true;
          queue.push(nxt);
        }
      }
    }
    component.sort((x, y) => x - y);
    groups.push(component);
  }

  return groups;
}

export function getLinkGroupForSocket(
  item: SocketedItem,
  socketIndex: number
): number[] {
  const groups = computeLinkGroups(item);
  return (
    groups.find((group) => group.includes(socketIndex)) ?? [socketIndex]
  );
}

export function getEdgeLinkState(
  item: SocketedItem,
  a: number,
  b: number
): EdgeLinkState {
  const group = getLinkGroupForSocket(item, a);
  const hasActive = group.some((idx) => item.sockets[idx]?.gem?.kind === 'active');
  const hasSupport = group.some(
    (idx) => item.sockets[idx]?.gem?.kind === 'support'
  );
  const bothSocketed = Boolean(item.sockets[a]?.gem && item.sockets[b]?.gem);

  if (bothSocketed && hasActive && hasSupport) {
    return 'empowered';
  }
  if (bothSocketed) {
    return 'charged';
  }
  return 'dormant';
}

export function canSocketGem(
  gem: SkillGem,
  socket: ItemSocket,
  item: SocketedItem,
  socketIndex: number,
  ignoreSameGemUid?: string
): { ok: boolean; reason?: string } {
  if (socket.color !== 'white' && socket.color !== gem.color) {
    return {
      ok: false,
      reason: `${COLOR_META[gem.color].label} (${gem.color.toUpperCase()}) gem cannot be placed in a ${COLOR_META[socket.color].label} (${socket.color.toUpperCase()}) socket.`,
    };
  }

  if (gem.kind === 'support') {
    const group = getLinkGroupForSocket(item, socketIndex);
    const duplicate = group.some((idx) => {
      if (idx === socketIndex) return false;
      const existing = item.sockets[idx]?.gem;
      if (!existing || existing.uid === ignoreSameGemUid) return false;
      return existing.kind === 'support' && existing.defId === gem.defId;
    });
    if (duplicate) {
      return {
        ok: false,
        reason: `${gem.name} cannot be linked twice within the same socket chain.`,
      };
    }
  }

  return { ok: true };
}

export function computeItemLinkSummaries(
  item: SocketedItem
): LinkGroupSummary[] {
  const groups = computeLinkGroups(item);
  return groups.map((socketIndices, groupIndex) => {
    const activesRaw: Array<{ gem: SkillGem; socketIndex: number }> = [];
    const supports: Array<{ gem: SkillGem; socketIndex: number }> = [];

    for (const idx of socketIndices) {
      const gem = item.sockets[idx]?.gem;
      if (!gem) continue;
      if (gem.kind === 'active') {
        activesRaw.push({ gem, socketIndex: idx });
      } else {
        supports.push({ gem, socketIndex: idx });
      }
    }

    const totalDmgMult = supports.reduce(
      (acc, s) => acc * (s.gem.stats.dmgMult ?? 1),
      1
    );
    const totalAoeMult = supports.reduce(
      (acc, s) => acc * (s.gem.stats.aoeMult ?? 1),
      1
    );
    const totalCdMult = supports.reduce(
      (acc, s) => acc * (s.gem.stats.cdMult ?? 1),
      1
    );
    const totalMpMult = supports.reduce(
      (acc, s) => acc * (s.gem.stats.mpMult ?? 1),
      1
    );
    const extraProj = supports.reduce(
      (acc, s) => acc + (s.gem.stats.extraProj ?? 0),
      0
    );
    const chains = supports.reduce(
      (acc, s) => acc + (s.gem.stats.chains ?? 0),
      0
    );
    const ignite = supports.some((s) => Boolean(s.gem.stats.ignite));
    const leechPct = Math.round(
      supports.reduce((acc, s) => acc + (s.gem.stats.leech ?? 0), 0) * 100
    );

    const actives = activesRaw.map(({ gem, socketIndex }) => {
      const levelScale = 1 + (gem.level - 1) * 0.12;
      const baseDmg = (gem.stats.baseDmg ?? 100) * levelScale;
      const baseCd = gem.stats.baseCd ?? 0.5;
      const baseMp = gem.stats.manaCost ?? 0;

      return {
        gem,
        socketIndex,
        effectiveDmg: Math.round(baseDmg * totalDmgMult),
        effectiveCd: +(baseCd * totalCdMult).toFixed(2),
        effectiveMana: Math.round(baseMp * totalMpMult),
        aoePct: Math.round(totalAoeMult * 100),
        extraProj,
        chains,
        ignite,
        leechPct,
      };
    });

    return {
      groupIndex,
      socketIndices,
      actives,
      supports,
      empowered: actives.length > 0 && supports.length > 0,
      orphanSupports: actives.length === 0 && supports.length > 0,
      multipliers: {
        dmgMult: +totalDmgMult.toFixed(4),
        aoeMult: +totalAoeMult.toFixed(4),
        cdMult: +totalCdMult.toFixed(4),
        mpMult: +totalMpMult.toFixed(4),
        extraProj,
        chains,
        ignite,
        leechPct,
      },
    };
  });
}

export function socketGemFromStash(
  items: SocketedItem[],
  stash: SkillGem[],
  gemUid: string,
  targetItemId: string,
  targetSocketIndex: number
): { items: SocketedItem[]; stash: SkillGem[]; error?: string } {
  const gemIndex = stash.findIndex((g) => g.uid === gemUid);
  if (gemIndex < 0) {
    return { items, stash, error: 'Selected gem was not found in stash.' };
  }
  const itemIdx = items.findIndex((it) => it.id === targetItemId);
  if (itemIdx < 0) {
    return { items, stash, error: 'Target item not found.' };
  }

  const item = items[itemIdx];
  const socket = item.sockets[targetSocketIndex];
  if (!socket) {
    return { items, stash, error: 'Target socket does not exist.' };
  }

  const gem = stash[gemIndex];
  const check = canSocketGem(gem, socket, item, targetSocketIndex);
  if (!check.ok) {
    return { items, stash, error: check.reason };
  }

  const displacedGem = socket.gem;
  const nextStash = stash.filter((g) => g.uid !== gemUid);
  if (displacedGem) {
    nextStash.push(displacedGem);
  }

  const nextItems = items.map((it, idx) => {
    if (idx !== itemIdx) return it;
    return {
      ...it,
      sockets: it.sockets.map((s, sIdx) =>
        sIdx === targetSocketIndex ? { ...s, gem } : s
      ),
    };
  });

  return { items: nextItems, stash: nextStash };
}

export function canMoveOrSwapSocketedGem(
  items: SocketedItem[],
  sourceItemId: string,
  sourceSocketIndex: number,
  targetItemId: string,
  targetSocketIndex: number
): { ok: boolean; swapped: boolean; reason?: string } {
  if (sourceItemId === targetItemId && sourceSocketIndex === targetSocketIndex) {
    return { ok: true, swapped: false };
  }

  const srcItem = items.find((it) => it.id === sourceItemId);
  const dstItem = items.find((it) => it.id === targetItemId);
  if (!srcItem || !dstItem) {
    return { ok: false, swapped: false, reason: 'Item not found.' };
  }

  const srcSocket = srcItem.sockets[sourceSocketIndex];
  const dstSocket = dstItem.sockets[targetSocketIndex];
  if (!srcSocket?.gem || !dstSocket) {
    return { ok: false, swapped: false, reason: 'No gem available to move.' };
  }

  const movingGem = srcSocket.gem;
  const targetGem = dstSocket.gem;

  const forwardCheck = canSocketGem(
    movingGem,
    dstSocket,
    dstItem,
    targetSocketIndex,
    movingGem.uid
  );
  if (!forwardCheck.ok) {
    return { ok: false, swapped: Boolean(targetGem), reason: forwardCheck.reason };
  }

  if (targetGem) {
    const reverseCheck = canSocketGem(
      targetGem,
      srcSocket,
      srcItem,
      sourceSocketIndex,
      targetGem.uid
    );
    if (!reverseCheck.ok) {
      return {
        ok: false,
        swapped: true,
        reason: `Cannot swap: ${reverseCheck.reason}`,
      };
    }
  }

  return { ok: true, swapped: Boolean(targetGem) };
}

export function moveSocketedGem(
  items: SocketedItem[],
  sourceItemId: string,
  sourceSocketIndex: number,
  targetItemId: string,
  targetSocketIndex: number
): {
  items: SocketedItem[];
  swapped?: boolean;
  movedGemName?: string;
  swappedGemName?: string;
  error?: string;
} {
  if (sourceItemId === targetItemId && sourceSocketIndex === targetSocketIndex) {
    return { items, swapped: false };
  }

  const validation = canMoveOrSwapSocketedGem(
    items,
    sourceItemId,
    sourceSocketIndex,
    targetItemId,
    targetSocketIndex
  );
  if (!validation.ok) {
    return { items, error: validation.reason };
  }

  const srcItem = items.find((it) => it.id === sourceItemId)!;
  const dstItem = items.find((it) => it.id === targetItemId)!;
  const movingGem = srcItem.sockets[sourceSocketIndex].gem!;
  const targetGem = dstItem.sockets[targetSocketIndex].gem;

  const nextItems = items.map((it) => {
    if (it.id !== sourceItemId && it.id !== targetItemId) return it;
    return {
      ...it,
      sockets: it.sockets.map((sock, idx) => {
        if (it.id === sourceItemId && idx === sourceSocketIndex) {
          return { ...sock, gem: targetGem ?? null };
        }
        if (it.id === targetItemId && idx === targetSocketIndex) {
          return { ...sock, gem: movingGem };
        }
        return sock;
      }),
    };
  });

  return {
    items: nextItems,
    swapped: Boolean(targetGem),
    movedGemName: movingGem.name,
    swappedGemName: targetGem?.name,
  };
}

export function unsocketGemToStash(
  items: SocketedItem[],
  stash: SkillGem[],
  itemId: string,
  socketIndex: number
): { items: SocketedItem[]; stash: SkillGem[] } {
  const item = items.find((it) => it.id === itemId);
  const gem = item?.sockets[socketIndex]?.gem;
  if (!item || !gem) {
    return { items, stash };
  }

  const nextItems = items.map((it) =>
    it.id !== itemId
      ? it
      : {
          ...it,
          sockets: it.sockets.map((s, idx) =>
            idx === socketIndex ? { ...s, gem: null } : s
          ),
        }
  );

  return {
    items: nextItems,
    stash: [gem, ...stash],
  };
}

export const RGB_SOCKET_COLORS = ['red', 'green', 'blue'] as const;

export function rollRandomRgbSocketColor(
  rng: () => number = Math.random
): 'red' | 'green' | 'blue' {
  const idx = Math.min(
    RGB_SOCKET_COLORS.length - 1,
    Math.max(0, Math.floor(rng() * RGB_SOCKET_COLORS.length))
  );
  return RGB_SOCKET_COLORS[idx];
}

function rollSandboxSocketColor(): SocketColor {
  return rollRandomRgbSocketColor();
}

export function applyChromaticOrb(
  items: SocketedItem[],
  itemId: string
): SocketedItem[] {
  return items.map((it) =>
    it.id !== itemId
      ? it
      : {
          ...it,
          sockets: it.sockets.map((s) => ({
            ...s,
            color: rollSandboxSocketColor(),
          })),
        }
  );
}

export function applyJewellersOrb(
  items: SocketedItem[],
  stash: SkillGem[],
  itemId: string
): { items: SocketedItem[]; stash: SkillGem[] } {
  const target = items.find((it) => it.id === itemId);
  if (!target) return { items, stash };
  const maxS = target.slot.toLowerCase().includes('body') ? 6 : 4;
  const newCount = Math.max(2, Math.min(maxS, Math.floor(2 + Math.random() * (maxS - 1))));
  const displaced: SkillGem[] = [];
  for (let i = newCount; i < target.sockets.length; i++) {
    const g = target.sockets[i]?.gem;
    if (g) displaced.push(g);
  }
  const nextSockets: ItemSocket[] = Array.from({ length: newCount }, (_, idx) =>
    target.sockets[idx] ?? {
      id: `${target.id}_s${idx}_${Math.random().toString(36).slice(2, 6)}`,
      color: rollSandboxSocketColor(),
      gem: null,
    }
  );
  const nextLinks = target.links.filter(
    ([a, b]) => a < newCount && b < newCount
  );
  return {
    items: items.map((it) =>
      it.id !== itemId ? it : { ...it, sockets: nextSockets, links: nextLinks }
    ),
    stash: displaced.length ? [...displaced, ...stash] : stash,
  };
}

export function applyOrbOfFusing(
  items: SocketedItem[],
  itemId: string
): SocketedItem[] {
  return items.map((it) => {
    if (it.id !== itemId || it.sockets.length < 2) return it;
    const nextLinks: Array<[number, number]> = [];
    for (let i = 0; i < it.sockets.length - 1; i++) {
      if (Math.random() < 0.62) nextLinks.push([i, i + 1]);
    }
    if (nextLinks.length === 0) nextLinks.push([0, 1]);
    return { ...it, links: nextLinks };
  });
}

export function createDefaultSocketLoadout(
  rng: () => number = Math.random
): {
  items: SocketedItem[];
  stash: SkillGem[];
} {
  const sunderGem: SkillGem = {
    uid: 'gem_sunder_1',
    defId: 'sunder_cleave',
    name: 'Sunder Cleave',
    kind: 'active',
    color: 'red',
    tag: 'Melee · AoE',
    icon: '🪓',
    level: 4,
    desc: 'Wide melee cleave. Builds Rage per hit and launches an ember shockwave.',
    stats: { baseDmg: 115, baseCd: 0.36, manaCost: 0 },
  };
  const addedFireGem: SkillGem = {
    uid: 'gem_fire_1',
    defId: 'sup_fire',
    name: 'Added Fire Damage',
    kind: 'support',
    color: 'red',
    tag: 'Support · Fire',
    icon: '🔥',
    level: 3,
    desc: '+32% Fire Damage & Ignites enemies for 3s.',
    stats: { dmgMult: 1.32, ignite: true, mpMult: 1.15 },
  };
  const concAreaGem: SkillGem = {
    uid: 'gem_conc_1',
    defId: 'sup_conc',
    name: 'Concentrated Area',
    kind: 'support',
    color: 'red',
    tag: 'Support · AoE',
    icon: '💥',
    level: 3,
    desc: '+38% AoE & Hit Damage, -25% AoE Radius.',
    stats: { dmgMult: 1.38, aoeMult: 0.75, mpMult: 1.2 },
  };
  const blightGem: SkillGem = {
    uid: 'gem_blight_1',
    defId: 'blight_bolt',
    name: 'Blight Bolt',
    kind: 'active',
    color: 'blue',
    tag: 'Projectile · Chaos',
    icon: '🟣',
    level: 4,
    desc: 'Fires a Chaos orb that explodes on impact and applies Chaos Burn.',
    stats: { baseDmg: 105, baseCd: 0.34, manaCost: 8 },
  };
  const chainGem: SkillGem = {
    uid: 'gem_chain_1',
    defId: 'sup_chain',
    name: 'Chain Support',
    kind: 'support',
    color: 'blue',
    tag: 'Support · Arc',
    icon: '⛓️',
    level: 2,
    desc: 'Projectiles & Arcs chain to +2 additional nearby enemies.',
    stats: { chains: 2, dmgMult: 0.95, mpMult: 1.15 },
  };

  const makeRandomSockets = (prefix: string, count: number): ItemSocket[] =>
    Array.from({ length: count }, (_, idx) => ({
      id: `${prefix}${idx}`,
      color: rollRandomRgbSocketColor(rng),
      gem: null,
    }));

  const items: SocketedItem[] = [
    {
      id: 'item_body',
      name: 'Primordial Mantle',
      slot: 'Body Armor',
      rarity: 'Unique',
      icon: '🦺',
      sockets: makeRandomSockets('b', 6),
      // 4-Link serpentine chain (0-1-2-3) + separate 2-Link (4-5)
      links: [
        [0, 1],
        [1, 2],
        [2, 3],
        [4, 5],
      ],
    },
    {
      id: 'item_weapon',
      name: 'Ashen Cataclysm',
      slot: 'Weapon',
      rarity: 'Unique',
      icon: '🪓',
      sockets: makeRandomSockets('w', 4),
      // 3-Link chain (0-1-2) and 1 unlinked socket (3)
      links: [
        [0, 1],
        [1, 2],
      ],
    },
    {
      id: 'item_helm',
      name: 'Sovereign Crest',
      slot: 'Helm',
      rarity: 'Rare',
      icon: '⛑️',
      sockets: makeRandomSockets('h', 4),
      // Pair of 2-Links: (0-1) and (2-3)
      links: [
        [0, 1],
        [2, 3],
      ],
    },
    {
      id: 'item_gloves',
      name: 'Shadowgrip Gauntlets',
      slot: 'Gloves',
      rarity: 'Rare',
      icon: '🧤',
      sockets: makeRandomSockets('g', 4),
      // Full 4-Link serpentine loop
      links: [
        [0, 1],
        [1, 2],
        [2, 3],
      ],
    },
  ];

  // Auto-socket starter gems only into matching randomly assigned RGB sockets;
  // any gem without a matching socket color on its item starts in the stash.
  const overflowStarterGems: SkillGem[] = [];
  const tryPlaceStarterGem = (item: SocketedItem, gem: SkillGem) => {
    const matchIdx = item.sockets.findIndex(
      (sock, idx) => !sock.gem && canSocketGem(gem, sock, item, idx).ok
    );
    if (matchIdx >= 0) {
      item.sockets[matchIdx] = { ...item.sockets[matchIdx], gem };
    } else {
      overflowStarterGems.push(gem);
    }
  };

  tryPlaceStarterGem(items[0], sunderGem);
  tryPlaceStarterGem(items[0], addedFireGem);
  tryPlaceStarterGem(items[0], concAreaGem);
  tryPlaceStarterGem(items[1], blightGem);
  tryPlaceStarterGem(items[1], chainGem);

  const stash: SkillGem[] = [
    ...overflowStarterGems,
    {
      uid: 'gem_split_1',
      defId: 'split_arrow',
      name: 'Split Arrow',
      kind: 'active',
      color: 'green',
      tag: 'Projectile · Bow',
      icon: '🏹',
      level: 3,
      desc: 'Fires a fan of arrows. Hits build Frenzy Charges.',
      stats: { baseDmg: 72, baseCd: 0.28, manaCost: 6, extraProj: 3 },
    },
    {
      uid: 'gem_void_1',
      defId: 'void_conduit',
      name: 'Void Conduit',
      kind: 'active',
      color: 'blue',
      tag: 'Chain · Lightning',
      icon: '⚡',
      level: 4,
      desc: 'Arcs across up to 4 targets, applying Shocked (+20% damage taken).',
      stats: { baseDmg: 155, baseCd: 2.8, manaCost: 16, chains: 3 },
    },
    {
      uid: 'gem_earth_1',
      defId: 'earthshatter',
      name: 'Earthshatter',
      kind: 'active',
      color: 'red',
      tag: 'Slam · AoE',
      icon: '💢',
      level: 3,
      desc: 'Slam the ground, consuming Rage for +60% damage & Stun.',
      stats: { baseDmg: 215, baseCd: 3.2, manaCost: 15 },
    },
    {
      uid: 'gem_frost_1',
      defId: 'frost_pulse',
      name: 'Frost Pulse',
      kind: 'active',
      color: 'blue',
      tag: 'Nova · Cold',
      icon: '❄️',
      level: 2,
      desc: 'Freezing ring that Chills foes (+40% damage if Chilled).',
      stats: { baseDmg: 195, baseCd: 3.5, manaCost: 18 },
    },
    {
      uid: 'gem_proj_1',
      defId: 'sup_proj',
      name: 'Multiple Projectiles',
      kind: 'support',
      color: 'green',
      tag: 'Support · Volley',
      icon: '🟢',
      level: 3,
      desc: '+2 Extra Projectiles (or +2 Chains), -15% Hit Damage.',
      stats: { extraProj: 2, dmgMult: 0.85, mpMult: 1.15 },
    },
    {
      uid: 'gem_fast_1',
      defId: 'sup_fast',
      name: 'Faster Attacks / Cast',
      kind: 'support',
      color: 'green',
      tag: 'Support · Haste',
      icon: '💨',
      level: 4,
      desc: '+25% Attack/Cast Speed & -18% Cooldown.',
      stats: { cdMult: 0.82, mpMult: 1.1 },
    },
    {
      uid: 'gem_aoe_1',
      defId: 'sup_aoe',
      name: 'Increased Area',
      kind: 'support',
      color: 'blue',
      tag: 'Support · Radius',
      icon: '🔵',
      level: 2,
      desc: '+36% AoE Radius & +10% Skill Damage.',
      stats: { dmgMult: 1.1, aoeMult: 1.36, mpMult: 1.1 },
    },
    {
      uid: 'gem_leech_1',
      defId: 'sup_leech',
      name: 'Life Leech Support',
      kind: 'support',
      color: 'red',
      tag: 'Support · Sustain',
      icon: '🩸',
      level: 3,
      desc: '4% of damage dealt by linked skills restores Health.',
      stats: { leech: 0.04, mpMult: 1.15 },
    },
  ];

  return { items, stash };
}

/**
 * Computes deterministic 2-column serpentine positions so every consecutive
 * socket pair (0-1, 1-2, 2-3, 3-4, 4-5) sits orthogonally adjacent.
 */
function getSocketCoordinates(index: number): { x: number; y: number } {
  const row = Math.floor(index / 2);
  const col = row % 2 === 0 ? index % 2 : 1 - (index % 2);
  return {
    x: col === 0 ? 54 : 162,
    y: 44 + row * 90,
  };
}

export function getAdjacentSocketPairs(
  socketCount: number
): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < socketCount - 1; i++) {
    pairs.push([i, i + 1]);
  }
  if (socketCount >= 4) {
    pairs.push([0, 3]);
  }
  if (socketCount >= 6) {
    pairs.push([2, 5]);
  }
  return pairs;
}

export interface SocketOrbsInventory {
  chromatic: number;
  jeweller: number;
  fusing: number;
}

interface HostGemStateMessage {
  type?: string;
  started?: boolean;
  heroLabel?: string;
  items?: SocketedItem[];
  stash?: SkillGem[];
  orbs?: Partial<SocketOrbsInventory>;
}

export interface GemSocketManagerProps {
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
  initialItems?: SocketedItem[];
  initialStash?: SkillGem[];
  onLoadoutChange?: (items: SocketedItem[], stash: SkillGem[]) => void;
}

export const GemSocketManager: React.FC<GemSocketManagerProps> = ({
  iframeRef,
  initialItems,
  initialStash,
  onLoadoutChange,
}) => {
  const [open, setOpen] = useState(false);
  const [liveHeroLabel, setLiveHeroLabel] = useState<string | null>(null);
  const [socketOrbs, setSocketOrbs] = useState<SocketOrbsInventory>({
    chromatic: 99,
    jeweller: 99,
    fusing: 99,
  });
  const [loadout, setLoadout] = useState<{
    items: SocketedItem[];
    stash: SkillGem[];
  }>(() => {
    if (initialItems && initialStash) {
      return { items: initialItems, stash: initialStash };
    }
    try {
      const raw = localStorage.getItem(GEM_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          items?: SocketedItem[];
          stash?: SkillGem[];
        };
        if (Array.isArray(parsed.items) && Array.isArray(parsed.stash)) {
          return { items: parsed.items, stash: parsed.stash };
        }
      }
    } catch {
      // Ignore invalid localStorage payload
    }
    return createDefaultSocketLoadout();
  });

  const [selectedItemId, setSelectedItemId] = useState<string>(
    () => loadout.items[0]?.id ?? 'item_body'
  );
  const [dragPayload, setDragPayload] = useState<DragGemPayload | null>(null);
  const [selectedGem, setSelectedGem] = useState<DragGemPayload | null>(null);
  const [hoveredDrop, setHoveredDrop] = useState<string | null>(null);
  const [hoveredSocket, setHoveredSocket] = useState<{
    itemId: string;
    index: number;
  } | null>(null);
  const [filterKind, setFilterKind] = useState<'all' | GemKind>('all');
  const [filterColor, setFilterColor] = useState<'all' | SocketColor>('all');
  const [notice, setNotice] = useState<{
    text: string;
    tone: 'info' | 'warn';
  } | null>(null);

  const isLiveMode = liveHeroLabel !== null;

  useEffect(() => {
    const onMessage = (event: MessageEvent<HostGemStateMessage>) => {
      const data = event.data;
      if (!data) return;
      if (data.type === 'ASHEN_OPEN_GEM_MANAGER') {
        setOpen(true);
        return;
      }
      if (data.type !== 'ASHEN_GEM_STATE') return;
      if (!data.started) {
        setLiveHeroLabel(null);
        return;
      }
      if (Array.isArray(data.items) && Array.isArray(data.stash)) {
        setLiveHeroLabel(data.heroLabel || 'Active Hero');
        setLoadout({ items: data.items, stash: data.stash });
        setSocketOrbs({
          chromatic: data.orbs?.chromatic ?? 0,
          jeweller: data.orbs?.jeweller ?? 0,
          fusing: data.orbs?.fusing ?? 0,
        });
        setSelectedItemId((prev) =>
          data.items!.some((it) => it.id === prev)
            ? prev
            : data.items![0]?.id ?? prev
        );
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (isLiveMode) return;
    try {
      localStorage.setItem(GEM_STORAGE_KEY, JSON.stringify(loadout));
    } catch {
      // Ignore storage errors
    }
    onLoadoutChange?.(loadout.items, loadout.stash);
  }, [loadout, onLoadoutChange, isLiveMode]);

  useEffect(() => {
    if (!open) return;
    iframeRef?.current?.contentWindow?.postMessage(
      { type: 'ASHEN_GEM_REQUEST_STATE' },
      '*'
    );
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, iframeRef]);

  const activeDragGem = useMemo<SkillGem | null>(() => {
    const payload = dragPayload ?? selectedGem;
    if (!payload) return null;
    if (payload.source === 'stash') {
      return loadout.stash.find((g) => g.uid === payload.gemUid) ?? null;
    }
    if (payload.itemId !== undefined && payload.socketIndex !== undefined) {
      const it = loadout.items.find((x) => x.id === payload.itemId);
      return it?.sockets[payload.socketIndex]?.gem ?? null;
    }
    return null;
  }, [dragPayload, selectedGem, loadout]);

  const selectedItem = useMemo(
    () =>
      loadout.items.find((it) => it.id === selectedItemId) ?? loadout.items[0],
    [loadout.items, selectedItemId]
  );

  const selectedSummaries = useMemo(
    () => (selectedItem ? computeItemLinkSummaries(selectedItem) : []),
    [selectedItem]
  );

  const filteredStash = useMemo(() => {
    return loadout.stash.filter((gem) => {
      if (filterKind !== 'all' && gem.kind !== filterKind) return false;
      if (filterColor !== 'all' && gem.color !== filterColor) return false;
      return true;
    });
  }, [loadout.stash, filterKind, filterColor]);

  const totalSocketedCount = useMemo(
    () =>
      loadout.items.reduce(
        (acc, it) => acc + it.sockets.filter((s) => s.gem !== null).length,
        0
      ),
    [loadout.items]
  );

  const totalEmpoweredLinks = useMemo(
    () =>
      loadout.items.reduce(
        (acc, it) =>
          acc +
          computeItemLinkSummaries(it).filter((summary) => summary.empowered)
            .length,
        0
      ),
    [loadout.items]
  );

  const applyGemPlacement = useCallback(
    (
      payload: DragGemPayload,
      targetItemId: string,
      targetSocketIndex: number
    ) => {
      if (payload.source === 'stash') {
        const res = socketGemFromStash(
          loadout.items,
          loadout.stash,
          payload.gemUid,
          targetItemId,
          targetSocketIndex
        );
        if (res.error) {
          setNotice({ text: res.error, tone: 'warn' });
          return;
        }
        setLoadout({ items: res.items, stash: res.stash });
        if (isLiveMode) {
          iframeRef?.current?.contentWindow?.postMessage(
            {
              type: 'ASHEN_GEM_APPLY',
              action: {
                kind: 'socket_from_stash',
                gemUid: payload.gemUid,
                targetItemId,
                targetSocketIndex,
              },
            },
            '*'
          );
        }
        setNotice({
          text: isLiveMode
            ? 'Skill gem socketed & synced to active hero!'
            : 'Skill gem socketed into linked slot.',
          tone: 'info',
        });
        setSelectedItemId(targetItemId);
        setSelectedGem(null);
      } else if (
        payload.itemId !== undefined &&
        payload.socketIndex !== undefined
      ) {
        const res = moveSocketedGem(
          loadout.items,
          payload.itemId,
          payload.socketIndex,
          targetItemId,
          targetSocketIndex
        );
        if (res.error) {
          setNotice({ text: res.error, tone: 'warn' });
          return;
        }
        setLoadout((prev) => ({ ...prev, items: res.items }));
        if (isLiveMode) {
          iframeRef?.current?.contentWindow?.postMessage(
            {
              type: 'ASHEN_GEM_APPLY',
              action: {
                kind: 'move_socketed',
                sourceItemId: payload.itemId,
                sourceSocketIndex: payload.socketIndex,
                targetItemId,
                targetSocketIndex,
              },
            },
            '*'
          );
        }
        setNotice({
          text: res.swapped
            ? `Swapped ${res.movedGemName} ↔ ${res.swappedGemName}${isLiveMode ? ' (synced to hero)' : ''}.`
            : `Moved ${res.movedGemName} to socket #${targetSocketIndex + 1}${isLiveMode ? ' (synced to hero)' : ''}.`,
          tone: 'info',
        });
        setSelectedItemId(targetItemId);
        setSelectedGem(null);
      }
    },
    [loadout, isLiveMode, iframeRef]
  );

  const handleUnsocket = useCallback(
    (itemId: string, socketIndex: number) => {
      const res = unsocketGemToStash(
        loadout.items,
        loadout.stash,
        itemId,
        socketIndex
      );
      setLoadout(res);
      if (isLiveMode) {
        iframeRef?.current?.contentWindow?.postMessage(
          {
            type: 'ASHEN_GEM_APPLY',
            action: { kind: 'unsocket', itemId, socketIndex },
          },
          '*'
        );
      }
      setSelectedGem(null);
      setNotice({ text: 'Gem returned to stash.', tone: 'info' });
    },
    [loadout, isLiveMode, iframeRef]
  );

  const handleToggleLink = useCallback(
    (itemId: string, a: number, b: number) => {
      const target = loadout.items.find((it) => it.id === itemId);
      if (!target) return;
      if (target.corrupted) {
        setNotice({
          text: `${target.name} is Corrupted — socket links are permanently locked.`,
          tone: 'warn',
        });
        return;
      }
      const wasLinked = hasLinkEdge(target.links, a, b);

      setLoadout((prev) => ({
        ...prev,
        items: toggleAdjacentSocketLink(prev.items, itemId, a, b),
      }));

      if (isLiveMode) {
        iframeRef?.current?.contentWindow?.postMessage(
          {
            type: 'ASHEN_GEM_APPLY',
            action: { kind: 'toggle_link', itemId, a, b },
          },
          '*'
        );
      }

      setNotice({
        text: wasLinked
          ? `Unlinked sockets #${a + 1} & #${b + 1}${isLiveMode ? ' (synced to hero)' : ''}.`
          : `Linked sockets #${a + 1} & #${b + 1} — support gem multipliers active${isLiveMode ? ' (synced to hero)' : ''}.`,
        tone: 'info',
      });
    },
    [loadout.items, isLiveMode, iframeRef]
  );

  const handleUseSocketOrb = useCallback(
    (orbId: 'chromatic' | 'jeweller' | 'fusing', itemId: string) => {
      const target = loadout.items.find((it) => it.id === itemId);
      if (target?.corrupted) {
        setNotice({
          text: `${target.name} is Corrupted and cannot be modified with Orbs.`,
          tone: 'warn',
        });
        return;
      }
      if (isLiveMode) {
        if ((socketOrbs[orbId] ?? 0) < 1) {
          setNotice({
            text: `Out of ${orbId} orbs! Defeat Elites, Bosses, or open Breaches to find more.`,
            tone: 'warn',
          });
          return;
        }
        iframeRef?.current?.contentWindow?.postMessage(
          {
            type: 'ASHEN_GEM_APPLY',
            action: { kind: 'apply_orb', orbId, itemId },
          },
          '*'
        );
        setNotice({
          text: `Applied ${orbId} orb to equipped item!`,
          tone: 'info',
        });
        return;
      }

      if (orbId === 'chromatic') {
        setLoadout((prev) => ({
          ...prev,
          items: applyChromaticOrb(prev.items, itemId),
        }));
        setNotice({ text: 'Socket colors reforged.', tone: 'info' });
      } else if (orbId === 'jeweller') {
        setLoadout((prev) => applyJewellersOrb(prev.items, prev.stash, itemId));
        setNotice({ text: 'Item socket count reforged.', tone: 'info' });
      } else {
        setLoadout((prev) => ({
          ...prev,
          items: applyOrbOfFusing(prev.items, itemId),
        }));
        setNotice({ text: 'Glowing socket links reforged.', tone: 'info' });
      }
    },
    [loadout.items, isLiveMode, socketOrbs, iframeRef]
  );

  const handleResetLoadout = useCallback(() => {
    if (isLiveMode) return;
    const fresh = createDefaultSocketLoadout();
    setLoadout(fresh);
    setSelectedGem(null);
    setDragPayload(null);
    setNotice({ text: 'Default gear sockets & gem stash restored.', tone: 'info' });
  }, [isLiveMode]);

  const parseDragPayload = (e: React.DragEvent): DragGemPayload | null => {
    if (dragPayload) return dragPayload;
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw) return JSON.parse(raw) as DragGemPayload;
    } catch {
      // Ignore parse failure
    }
    return null;
  };

  return (
    <>
      <div className="pointer-events-none fixed bottom-14 right-3.5 z-40 flex items-center justify-end">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="font-mono-num pointer-events-auto flex items-center gap-2 rounded border border-[#dfb672]/60 bg-[#14101c]/95 px-3 py-1.5 text-xs font-bold tracking-wide text-[#ffe5ad] shadow-[0_8px_24px_rgba(0,0,0,0.75)] transition hover:border-[#ffd87a] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd87a]"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="h-3.5 w-3.5 text-[#dfb672]"
          >
            <circle cx="7" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="17" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="M10.5 12h3"
              stroke="#ffd87a"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
          <span className="whitespace-nowrap">
            Gem Sockets ({totalSocketedCount})
          </span>
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Gem Socket Manager"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="flex max-h-[90vh] w-full max-w-[1160px] flex-col overflow-hidden rounded-lg border border-[#dfb672]/30 bg-[#0d0a12] text-[#f1e6d8] shadow-[0_28px_80px_rgba(0,0,0,0.92)]">
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-[#130f1b] px-5 py-3.5">
              <div>
                <h2 className="font-display text-lg font-bold tracking-[0.05em] text-[#dfb672]">
                  Gem Socket Forge {liveHeroLabel ? `· ${liveHeroLabel}` : '· Sandbox'}
                </h2>
                <p className="font-mono-num mt-0.5 text-xs text-[#9e91a3]">
                  {isLiveMode
                    ? `Live Hero Gear Synced · Drag gems to swap or toggle chain links to empower skills · ${totalEmpoweredLinks} Empowered`
                    : `Drag gems to socket or swap · Toggle chain bridges between adjacent sockets to activate support multipliers · ${totalEmpoweredLinks} Empowered`}
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                {!isLiveMode && (
                  <button
                    type="button"
                    onClick={handleResetLoadout}
                    className="rounded border border-white/15 bg-[#1b1525] px-3 py-1.5 text-xs font-semibold text-[#d7cadb] transition hover:border-[#dfb672]/50 hover:text-[#fff3dc] whitespace-nowrap shrink-0"
                  >
                    Reset Loadout
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded border border-[#dfb672]/40 bg-[#201829] px-3.5 py-1.5 text-xs font-semibold text-[#ffe5ad] transition hover:border-[#ffd87a] hover:bg-[#2a2036] whitespace-nowrap shrink-0"
                >
                  Close
                </button>
              </div>
            </header>

            {activeDragGem && selectedGem && !dragPayload && (
              <div className="flex items-center justify-between gap-2 border-b border-[#ffd87a]/30 bg-[#1e1829] px-5 py-2 text-xs text-[#ffe8b3]">
                <span>
                  Selected <strong>{activeDragGem.name}</strong> — click any highlighted socket to move or swap.
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedGem(null)}
                  className="rounded border border-white/20 px-2 py-0.5 text-[11px] font-semibold text-[#e6dacb] hover:border-[#ffd87a]"
                >
                  Cancel
                </button>
              </div>
            )}

            {notice && (
              <div
                className={`border-b px-5 py-2 text-xs font-medium ${
                  notice.tone === 'warn'
                    ? 'border-[#e0564b]/35 bg-[#291317] text-[#ffb2aa]'
                    : 'border-[#dfb672]/25 bg-[#191522] text-[#ffe5ad]'
                }`}
              >
                {notice.text}
              </div>
            )}

            <div className="grid flex-1 grid-cols-1 gap-5 overflow-y-auto p-5 lg:grid-cols-12">
              {/* Left Column: Gear Items with Linked Socket Matrices */}
              <section
                aria-label="Equipped Socketed Items"
                className="flex flex-col gap-4 lg:col-span-7"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {loadout.items.map((item) => {
                    const isSelected = selectedItem?.id === item.id;
                    const summaries = computeItemLinkSummaries(item);
                    const linkGroups = computeLinkGroups(item);
                    const maxLinkLen = Math.max(
                      1,
                      ...linkGroups.map((g) => g.length)
                    );
                    const rows = Math.ceil(item.sockets.length / 2);
                    const canvasHeight = rows * 90 + 4;
                    const adjacentPairs = getAdjacentSocketPairs(
                      item.sockets.length
                    );
                    const highlightedGroup =
                      hoveredSocket?.itemId === item.id
                        ? getLinkGroupForSocket(item, hoveredSocket.index)
                        : [];

                    return (
                      <article
                        key={item.id}
                        onClick={() => setSelectedItemId(item.id)}
                        className={`flex flex-col rounded-md border p-4 transition ${
                          isSelected
                            ? 'border-[#dfb672]/70 bg-[#171220]'
                            : 'border-white/10 bg-[#120e19] hover:border-[#dfb672]/35'
                        }`}
                      >
                        <div className="mb-3 flex items-start justify-between gap-2 border-b border-white/10 pb-2.5">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span aria-hidden="true" className="text-base">
                                {item.icon}
                              </span>
                              <h3
                                className={`truncate text-sm font-bold ${
                                  item.rarity === 'Unique'
                                    ? 'text-[#f09a54]'
                                    : 'text-[#ffd87a]'
                                }`}
                              >
                                {item.name}
                              </h3>
                            </div>
                            <p className="font-mono-num mt-0.5 text-[11px] text-[#9e91a3]">
                              {item.slot} · {item.rarity} · {item.sockets.length} Sockets ·{' '}
                              {maxLinkLen > 1 ? `${maxLinkLen}-Link` : 'Unlinked'}
                              {item.corrupted ? ' · Corrupted' : ''}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-0.5">
                            {summaries.some((s) => s.empowered) && (
                              <span className="font-mono-num text-[11px] font-semibold text-[#ffd87a] whitespace-nowrap">
                                Empowered
                              </span>
                            )}
                            {item.corrupted && (
                              <span className="font-mono-num text-[10px] font-bold uppercase text-[#ff8a9e] whitespace-nowrap">
                                Corrupted
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Serpentine Socket Graph + Glowing Connectors */}
                        <div className="flex flex-1 items-center justify-center py-1">
                          <div
                            className="relative"
                            style={{ width: 216, height: canvasHeight }}
                          >
                            <svg
                              width={216}
                              height={canvasHeight}
                              viewBox={`0 0 216 ${canvasHeight}`}
                              className="pointer-events-auto absolute inset-0"
                              aria-label={`${item.name} socket links`}
                            >
                              <defs>
                                <filter
                                  id={`glow-${item.id}`}
                                  x="-40%"
                                  y="-40%"
                                  width="180%"
                                  height="180%"
                                >
                                  <feGaussianBlur
                                    stdDeviation="3.5"
                                    result="blur"
                                  />
                                  <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                  </feMerge>
                                </filter>
                              </defs>

                              {adjacentPairs.map(([a, b]) => {
                                const p1 = getSocketCoordinates(a);
                                const p2 = getSocketCoordinates(b);
                                const linked = hasLinkEdge(item.links, a, b);
                                const midX = (p1.x + p2.x) / 2;
                                const midY = (p1.y + p2.y) / 2;
                                const angleDeg =
                                  (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) /
                                  Math.PI;

                                if (!linked) {
                                  return (
                                    <g
                                      key={`gap-${a}-${b}`}
                                      className={
                                        item.corrupted
                                          ? 'cursor-not-allowed opacity-25'
                                          : 'cursor-pointer opacity-45 transition-opacity hover:opacity-95'
                                      }
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleLink(item.id, a, b);
                                      }}
                                    >
                                      <title>
                                        {item.corrupted
                                          ? 'Corrupted — socket links are locked'
                                          : `Click to forge glowing chain between sockets #${a + 1} & #${b + 1}`}
                                      </title>
                                      <line
                                        x1={p1.x}
                                        y1={p1.y}
                                        x2={p2.x}
                                        y2={p2.y}
                                        stroke="transparent"
                                        strokeWidth={20}
                                      />
                                      <line
                                        x1={p1.x}
                                        y1={p1.y}
                                        x2={p2.x}
                                        y2={p2.y}
                                        stroke="#443850"
                                        strokeWidth={2}
                                        strokeDasharray="4 5"
                                      />
                                    </g>
                                  );
                                }

                                const edgeState = getEdgeLinkState(item, a, b);
                                const gemA = item.sockets[a]?.gem;
                                const gemB = item.sockets[b]?.gem;
                                const beamColor =
                                  edgeState === 'empowered'
                                    ? COLOR_META[
                                        gemA?.kind === 'active'
                                          ? gemA.color
                                          : gemB?.kind === 'active'
                                          ? gemB.color
                                          : 'white'
                                      ].beam
                                    : edgeState === 'charged'
                                    ? '#dfb672'
                                    : '#a78652';

                                const isGroupHighlighted =
                                  highlightedGroup.includes(a) &&
                                  highlightedGroup.includes(b);
                                const chainOffsets = [-24, -12, 0, 12, 24];

                                return (
                                  <g
                                    key={`link-${a}-${b}`}
                                    className={`${
                                      item.corrupted
                                        ? 'cursor-not-allowed'
                                        : 'cursor-pointer'
                                    } ${
                                      edgeState === 'empowered'
                                        ? 'socket-link-empowered'
                                        : ''
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleLink(item.id, a, b);
                                    }}
                                  >
                                    <title>
                                      {item.corrupted
                                        ? `Chain Linked (${edgeState}) · Corrupted (Locked)`
                                        : `Chain Linked (${edgeState}) · Click to unlink sockets #${a + 1} & #${b + 1}`}
                                    </title>
                                    {/* Hit area */}
                                    <line
                                      x1={p1.x}
                                      y1={p1.y}
                                      x2={p2.x}
                                      y2={p2.y}
                                      stroke="transparent"
                                      strokeWidth={22}
                                    />
                                    {/* Outer forged channel */}
                                    <line
                                      x1={p1.x}
                                      y1={p1.y}
                                      x2={p2.x}
                                      y2={p2.y}
                                      stroke="#09070d"
                                      strokeWidth={15}
                                      strokeLinecap="round"
                                    />
                                    {/* Glowing aura core */}
                                    <line
                                      x1={p1.x}
                                      y1={p1.y}
                                      x2={p2.x}
                                      y2={p2.y}
                                      stroke={beamColor}
                                      strokeWidth={
                                        edgeState === 'empowered' ? 8 : 5
                                      }
                                      strokeOpacity={
                                        edgeState === 'empowered'
                                          ? 0.88
                                          : edgeState === 'charged'
                                          ? 0.62
                                          : 0.4
                                      }
                                      strokeLinecap="round"
                                      filter={`url(#glow-${item.id})`}
                                    />
                                    {/* Interlocking glowing chain links */}
                                    <g
                                      transform={`translate(${midX} ${midY}) rotate(${angleDeg})`}
                                      className="socket-chain-ring"
                                    >
                                      {chainOffsets.map((offset, idx) => (
                                        <rect
                                          key={offset}
                                          x={offset - 6.5}
                                          y={idx % 2 === 0 ? -4.5 : -3.5}
                                          width={13}
                                          height={idx % 2 === 0 ? 9 : 7}
                                          rx={idx % 2 === 0 ? 4.5 : 3.5}
                                          fill="none"
                                          stroke={
                                            isGroupHighlighted
                                              ? '#fff2c2'
                                              : idx % 2 === 0
                                              ? beamColor
                                              : '#f7d894'
                                          }
                                          strokeWidth={
                                            edgeState === 'empowered' ? 2.4 : 1.9
                                          }
                                          filter={`url(#glow-${item.id})`}
                                        />
                                      ))}
                                    </g>
                                    {/* Traveling energy pulse through chain */}
                                    <line
                                      x1={p1.x}
                                      y1={p1.y}
                                      x2={p2.x}
                                      y2={p2.y}
                                      stroke="#fff7df"
                                      strokeWidth={
                                        edgeState === 'empowered' ? 2.6 : 1.6
                                      }
                                      strokeOpacity={
                                        edgeState === 'empowered'
                                          ? 0.95
                                          : edgeState === 'charged'
                                          ? 0.6
                                          : 0.3
                                      }
                                      strokeLinecap="round"
                                      className="socket-link-beam"
                                    />
                                  </g>
                                );
                              })}
                            </svg>

                            {/* Accessible Midpoint Chain Link Toggles */}
                            {adjacentPairs.map(([a, b]) => {
                              const p1 = getSocketCoordinates(a);
                              const p2 = getSocketCoordinates(b);
                              const midX = (p1.x + p2.x) / 2;
                              const midY = (p1.y + p2.y) / 2;
                              const linked = hasLinkEdge(item.links, a, b);
                              const edgeState = linked
                                ? getEdgeLinkState(item, a, b)
                                : 'unlinked';

                              return (
                                <button
                                  key={`chain-btn-${a}-${b}`}
                                  type="button"
                                  disabled={Boolean(item.corrupted)}
                                  aria-pressed={linked}
                                  aria-label={
                                    linked
                                      ? `Unlink sockets #${a + 1} and #${b + 1} on ${item.name}`
                                      : `Link sockets #${a + 1} and #${b + 1} on ${item.name}`
                                  }
                                  title={
                                    item.corrupted
                                      ? 'Corrupted — socket links are locked'
                                      : linked
                                      ? `Chain Linked (#${a + 1}↔#${b + 1} · ${edgeState}) — Click to unlink`
                                      : `Unlinked (#${a + 1}↔#${b + 1}) — Click to forge glowing chain`
                                  }
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedItemId(item.id);
                                    handleToggleLink(item.id, a, b);
                                  }}
                                  style={{
                                    left: midX - 13,
                                    top: midY - 13,
                                    width: 26,
                                    height: 26,
                                  }}
                                  className={`absolute z-20 flex items-center justify-center rounded-full border transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#ffd87a] disabled:cursor-not-allowed disabled:opacity-50 ${
                                    linked
                                      ? edgeState === 'empowered'
                                        ? 'border-[#ffe19c] bg-[#2a1d28] text-[#fff1c7] shadow-[0_0_12px_rgba(255,214,120,0.8)] hover:scale-110'
                                        : 'border-[#dfb672] bg-[#211926] text-[#ffe09d] shadow-[0_0_8px_rgba(223,182,114,0.55)] hover:scale-110'
                                      : 'border-white/20 bg-[#120e19]/90 text-[#7d6f87] hover:border-[#dfb672]/75 hover:bg-[#1d1628] hover:text-[#ffe3a6]'
                                  }`}
                                >
                                  <svg
                                    viewBox="0 0 20 20"
                                    fill="none"
                                    aria-hidden="true"
                                    className="h-3.5 w-3.5"
                                  >
                                    {linked ? (
                                      <>
                                        <rect
                                          x="2.5"
                                          y="7"
                                          width="8.5"
                                          height="6"
                                          rx="3"
                                          stroke="currentColor"
                                          strokeWidth="1.9"
                                        />
                                        <rect
                                          x="9"
                                          y="7"
                                          width="8.5"
                                          height="6"
                                          rx="3"
                                          stroke="currentColor"
                                          strokeWidth="1.9"
                                        />
                                      </>
                                    ) : (
                                      <>
                                        <path
                                          d="M8.5 7H5.5a3 3 0 0 0 0 6h3"
                                          stroke="currentColor"
                                          strokeWidth="1.6"
                                          strokeLinecap="round"
                                        />
                                        <path
                                          d="M11.5 7h3a3 3 0 0 1 0 6h-3"
                                          stroke="currentColor"
                                          strokeWidth="1.6"
                                          strokeLinecap="round"
                                        />
                                      </>
                                    )}
                                  </svg>
                                </button>
                              );
                            })}

                            {/* Interactive Socket Nodes */}
                            {item.sockets.map((socket, sIdx) => {
                              const pos = getSocketCoordinates(sIdx);
                              const colorMeta = COLOR_META[socket.color];
                              const dropKey = `${item.id}:${sIdx}`;
                              const isDropHover = hoveredDrop === dropKey;
                              const isGroupHovered =
                                highlightedGroup.includes(sIdx);

                              const activePayload = dragPayload ?? selectedGem;
                              const isSameSocket =
                                activePayload?.source === 'socket' &&
                                activePayload.itemId === item.id &&
                                activePayload.socketIndex === sIdx;

                              const dragCompatibility = activeDragGem
                                ? activePayload?.source === 'socket' &&
                                  activePayload.itemId !== undefined &&
                                  activePayload.socketIndex !== undefined
                                  ? canMoveOrSwapSocketedGem(
                                      loadout.items,
                                      activePayload.itemId,
                                      activePayload.socketIndex,
                                      item.id,
                                      sIdx
                                    )
                                  : canSocketGem(
                                      activeDragGem,
                                      socket,
                                      item,
                                      sIdx,
                                      activeDragGem.uid
                                    )
                                : null;

                              const showSwapHint =
                                isDropHover &&
                                Boolean(socket.gem) &&
                                !isSameSocket &&
                                dragCompatibility?.ok !== false;

                              const socketGroupSummary = summaries.find((sum) =>
                                sum.socketIndices.includes(sIdx)
                              );
                              const isEmpoweredSocket =
                                Boolean(socket.gem) &&
                                Boolean(socketGroupSummary?.empowered);

                              const isSelectedSource =
                                selectedGem?.source === 'socket' &&
                                selectedGem.itemId === item.id &&
                                selectedGem.socketIndex === sIdx;

                              return (
                                <div
                                  key={socket.id}
                                  style={{
                                    left: pos.x - 32,
                                    top: pos.y - 32,
                                    width: 64,
                                    height: 64,
                                  }}
                                  onDragEnter={(e) => {
                                    e.preventDefault();
                                    if (hoveredDrop !== dropKey) {
                                      setHoveredDrop(dropKey);
                                    }
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect =
                                      dragCompatibility?.ok === false
                                        ? 'none'
                                        : 'move';
                                    if (hoveredDrop !== dropKey) {
                                      setHoveredDrop(dropKey);
                                    }
                                  }}
                                  onDragLeave={(e) => {
                                    if (
                                      hoveredDrop === dropKey &&
                                      !e.currentTarget.contains(
                                        e.relatedTarget as Node
                                      )
                                    ) {
                                      setHoveredDrop(null);
                                    }
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setHoveredDrop(null);
                                    const payload = parseDragPayload(e);
                                    setDragPayload(null);
                                    if (payload) {
                                      applyGemPlacement(payload, item.id, sIdx);
                                    }
                                  }}
                                  onMouseEnter={() =>
                                    setHoveredSocket({
                                      itemId: item.id,
                                      index: sIdx,
                                    })
                                  }
                                  onMouseLeave={() => setHoveredSocket(null)}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedItemId(item.id);
                                    if (selectedGem) {
                                      if (isSelectedSource) {
                                        setSelectedGem(null);
                                        return;
                                      }
                                      applyGemPlacement(
                                        selectedGem,
                                        item.id,
                                        sIdx
                                      );
                                      return;
                                    }
                                    if (socket.gem) {
                                      setSelectedGem({
                                        source: 'socket',
                                        gemUid: socket.gem.uid,
                                        itemId: item.id,
                                        socketIndex: sIdx,
                                      });
                                    }
                                  }}
                                  className={`group absolute z-10 flex flex-col items-center justify-center rounded-full border-2 transition ${
                                    colorMeta.bg
                                  } ${colorMeta.ring} ${
                                    isEmpoweredSocket ? 'socket-empowered-ring' : ''
                                  } ${
                                    isDropHover && !isSameSocket
                                      ? dragCompatibility?.ok === false
                                        ? 'scale-105 ring-4 ring-[#e0564b]/70'
                                        : 'scale-110 ring-4 ring-[#ffd87a]/80'
                                      : isSelectedSource
                                      ? 'ring-4 ring-[#ffd87a]'
                                      : isGroupHovered
                                      ? 'ring-2 ring-[#dfb672]/70'
                                      : ''
                                  } ${
                                    activeDragGem &&
                                    !isSameSocket &&
                                    dragCompatibility &&
                                    !dragCompatibility.ok
                                      ? 'opacity-45'
                                      : 'opacity-100'
                                  }`}
                                >
                                  {socket.gem ? (
                                    <div
                                      draggable
                                      onDragStart={(e) => {
                                        e.stopPropagation();
                                        const payload: DragGemPayload = {
                                          source: 'socket',
                                          gemUid: socket.gem!.uid,
                                          itemId: item.id,
                                          socketIndex: sIdx,
                                        };
                                        setDragPayload(payload);
                                        e.dataTransfer.effectAllowed = 'move';
                                        e.dataTransfer.setData(
                                          'application/json',
                                          JSON.stringify(payload)
                                        );
                                        e.dataTransfer.setData(
                                          'text/plain',
                                          socket.gem!.name
                                        );
                                      }}
                                      onDragEnd={() => {
                                        setDragPayload(null);
                                        setHoveredDrop(null);
                                      }}
                                      title={`${socket.gem.name} (Lv ${socket.gem.level}) · Drag onto another socket to swap, or click × to unsocket`}
                                      className="relative flex h-full w-full cursor-grab flex-col items-center justify-center rounded-full active:cursor-grabbing"
                                    >
                                      <span
                                        className={`text-xl leading-none ${
                                          dragPayload ? 'pointer-events-none' : ''
                                        }`}
                                      >
                                        {socket.gem.icon}
                                      </span>
                                      <span
                                        className={`font-mono-num mt-0.5 text-[9px] font-bold uppercase tracking-wider text-[#f7ebd4] ${
                                          dragPayload ? 'pointer-events-none' : ''
                                        }`}
                                      >
                                        {socket.gem.kind === 'active'
                                          ? 'ACT'
                                          : 'SUP'}
                                      </span>
                                      {showSwapHint && (
                                        <span className="font-mono-num pointer-events-none absolute inset-x-1 bottom-1 rounded bg-[#ffd87a] px-1 py-0.5 text-center text-[8px] font-extrabold uppercase tracking-wider text-[#140e1a] shadow">
                                          SWAP
                                        </span>
                                      )}
                                      {!dragPayload && (
                                        <button
                                          type="button"
                                          aria-label={`Unsocket ${socket.gem.name}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleUnsocket(item.id, sIdx);
                                          }}
                                          className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full border border-white/25 bg-[#1a1322] text-[11px] font-bold text-[#ffd4cb] hover:border-[#ff7c70] hover:bg-[#36181d] group-hover:flex"
                                        >
                                          ×
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="pointer-events-none flex flex-col items-center justify-center">
                                      <span
                                        className={`font-mono-num text-[10px] font-bold uppercase ${colorMeta.text}`}
                                      >
                                        {socket.color[0]}
                                      </span>
                                      <span className="font-mono-num text-[9px] text-[#8d7f94]">
                                        #{sIdx + 1}
                                      </span>
                                    </div>
                                  )}
                                  {isDropHover &&
                                    !isSameSocket &&
                                    dragCompatibility?.ok === false && (
                                      <span className="font-mono-num pointer-events-none absolute -bottom-2 rounded bg-[#e0564b] px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-white shadow">
                                        Color
                                      </span>
                                    )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              {/* Right Column: Live Link Inspector + Draggable Gem Stash */}
              <aside className="flex flex-col gap-4 lg:col-span-5">
                {/* Selected Item Link Group Inspector */}
                {selectedItem && (
                  <section
                    aria-label="Link Group Inspector"
                    className="rounded-md border border-white/10 bg-[#14101d] p-4"
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                      <div>
                        <h3 className="font-display text-sm font-bold tracking-wide text-[#dfb672]">
                          {selectedItem.name} · Link Circuits
                        </h3>
                        <p className="font-mono-num text-[11px] text-[#9e91a3]">
                          {selectedSummaries.length} Link Group
                          {selectedSummaries.length === 1 ? '' : 's'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleUseSocketOrb('chromatic', selectedItem.id)
                          }
                          disabled={
                            Boolean(selectedItem.corrupted) ||
                            (isLiveMode && socketOrbs.chromatic < 1)
                          }
                          title={
                            selectedItem.corrupted
                              ? 'Corrupted — cannot modify socket colors'
                              : 'Chromatic Orb: Reroll socket colors'
                          }
                          className="font-mono-num rounded border border-[#54a8ff]/40 bg-[#131a29] px-2 py-1 text-[11px] font-semibold text-[#b8dcff] transition hover:border-[#7ac2ff] disabled:opacity-40 whitespace-nowrap shrink-0"
                        >
                          Chromatic{isLiveMode ? ` (${socketOrbs.chromatic})` : ''}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleUseSocketOrb('jeweller', selectedItem.id)
                          }
                          disabled={
                            Boolean(selectedItem.corrupted) ||
                            (isLiveMode && socketOrbs.jeweller < 1)
                          }
                          title={
                            selectedItem.corrupted
                              ? 'Corrupted — cannot modify socket count'
                              : "Jeweller's Orb: Reroll socket count"
                          }
                          className="font-mono-num rounded border border-[#dfb672]/40 bg-[#211a14] px-2 py-1 text-[11px] font-semibold text-[#ffe3aa] transition hover:border-[#ffd87a] disabled:opacity-40 whitespace-nowrap shrink-0"
                        >
                          Jeweller{isLiveMode ? ` (${socketOrbs.jeweller})` : ''}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleUseSocketOrb('fusing', selectedItem.id)
                          }
                          disabled={
                            Boolean(selectedItem.corrupted) ||
                            (isLiveMode && socketOrbs.fusing < 1)
                          }
                          title={
                            selectedItem.corrupted
                              ? 'Corrupted — cannot modify socket links'
                              : 'Orb of Fusing: Reroll glowing links between sockets'
                          }
                          className="font-mono-num rounded border border-[#e0564b]/45 bg-[#261418] px-2 py-1 text-[11px] font-semibold text-[#ffc0b8] transition hover:border-[#ff8a80] disabled:opacity-40 whitespace-nowrap shrink-0"
                        >
                          Fusing{isLiveMode ? ` (${socketOrbs.fusing})` : ''}
                        </button>
                      </div>
                    </div>

                    {/* Adjacent Socket Link Toggles */}
                    <div className="mb-3 rounded border border-white/10 bg-[#100d17] p-2.5">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="font-mono-num text-[11px] font-semibold uppercase tracking-wider text-[#b7a9be]">
                          Adjacent Socket Links
                        </span>
                        <span
                          className={`font-mono-num text-[10px] ${
                            selectedItem.corrupted
                              ? 'font-bold text-[#ff8a9e]'
                              : 'text-[#8d7f94]'
                          }`}
                        >
                          {selectedItem.corrupted
                            ? 'Corrupted · Links Locked'
                            : 'Toggle chains to link supports'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {getAdjacentSocketPairs(selectedItem.sockets.length).map(
                          ([a, b]) => {
                            const linked = hasLinkEdge(
                              selectedItem.links,
                              a,
                              b
                            );
                            return (
                              <button
                                key={`adj-toggle-${a}-${b}`}
                                type="button"
                                disabled={Boolean(selectedItem.corrupted)}
                                aria-pressed={linked}
                                onClick={() =>
                                  handleToggleLink(selectedItem.id, a, b)
                                }
                                className={`font-mono-num inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap shrink-0 ${
                                  linked
                                    ? 'border-[#ffd87a]/70 bg-[#261d2b] text-[#ffe7ae] shadow-[0_0_10px_rgba(255,216,122,0.22)] hover:border-[#ffe6a6]'
                                    : 'border-white/15 bg-[#16121f] text-[#9e91a3] hover:border-[#dfb672]/50 hover:text-[#f1e6d8]'
                                }`}
                              >
                                <span aria-hidden="true">
                                  {linked ? '⛓️' : '◦'}
                                </span>
                                <span>
                                  #{a + 1}↔#{b + 1}
                                </span>
                                <span className="text-[10px] opacity-80">
                                  {linked ? 'Linked' : 'Link'}
                                </span>
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      {selectedSummaries.map((group) => {
                        const multParts = [
                          `${group.multipliers.dmgMult.toFixed(2)}× Dmg`,
                          `${group.multipliers.cdMult.toFixed(2)}× CD`,
                          `${group.multipliers.mpMult.toFixed(2)}× Mana`,
                          `${Math.round(group.multipliers.aoeMult * 100)}% AoE`,
                        ];
                        if (group.multipliers.extraProj > 0) {
                          multParts.push(`+${group.multipliers.extraProj} Proj`);
                        }
                        if (group.multipliers.chains > 0) {
                          multParts.push(`+${group.multipliers.chains} Chains`);
                        }
                        if (group.multipliers.ignite) {
                          multParts.push('Ignite');
                        }
                        if (group.multipliers.leechPct > 0) {
                          multParts.push(`${group.multipliers.leechPct}% Leech`);
                        }

                        return (
                          <div
                            key={`grp-${group.groupIndex}`}
                            className={`rounded border px-3 py-2.5 text-xs ${
                              group.empowered
                                ? 'border-[#dfb672]/45 bg-[#1b1626]'
                                : group.orphanSupports
                                ? 'border-[#e0564b]/35 bg-[#1e1419]'
                                : 'border-white/10 bg-[#100d17]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono-num font-bold text-[#e7d7bf]">
                                Group {group.groupIndex + 1} · Sockets{' '}
                                {group.socketIndices
                                  .map((i) => `#${i + 1}`)
                                  .join(' — ')}
                              </span>
                              <span
                                className={`font-mono-num text-[11px] font-semibold ${
                                  group.empowered
                                    ? 'text-[#ffd87a]'
                                    : group.orphanSupports
                                    ? 'text-[#ff9c94]'
                                    : 'text-[#8e8097]'
                                }`}
                              >
                                {group.empowered
                                  ? 'Empowered'
                                  : group.orphanSupports
                                  ? 'Needs Active Gem'
                                  : 'Unlinked / Empty'}
                              </span>
                            </div>

                            {group.supports.length > 0 && (
                              <p
                                className={`font-mono-num mt-1.5 text-[11px] ${
                                  group.empowered
                                    ? 'text-[#ffd87a]'
                                    : 'text-[#d79b95]'
                                }`}
                              >
                                {group.empowered
                                  ? 'Support Multipliers Active: '
                                  : 'Support Multipliers Dormant: '}
                                {multParts.join(' · ')}
                              </p>
                            )}

                            {group.actives.length > 0 ? (
                              <div className="mt-2 flex flex-col gap-1.5">
                                {group.actives.map((act) => (
                                  <div
                                    key={act.gem.uid}
                                    className="border-t border-white/10 pt-1.5"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-semibold text-[#fff0d4]">
                                        {act.gem.icon} {act.gem.name} (Lv{' '}
                                        {act.gem.level})
                                      </span>
                                      <span className="font-mono-num text-[11px] text-[#9e91a3]">
                                        {group.supports.length} Support
                                        {group.supports.length === 1 ? '' : 's'}
                                      </span>
                                    </div>
                                    <p className="font-mono-num mt-0.5 text-[11px] text-[#c7b9ce]">
                                      Dmg {act.effectiveDmg} · CD{' '}
                                      {act.effectiveCd}s · Mana{' '}
                                      {act.effectiveMana}
                                      {act.aoePct !== 100
                                        ? ` · AoE ${act.aoePct}%`
                                        : ''}
                                      {act.extraProj > 0
                                        ? ` · +${act.extraProj} Proj`
                                        : ''}
                                      {act.chains > 0
                                        ? ` · +${act.chains} Chains`
                                        : ''}
                                      {act.ignite ? ' · Ignite' : ''}
                                      {act.leechPct > 0
                                        ? ` · ${act.leechPct}% Leech`
                                        : ''}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : group.supports.length > 0 ? (
                              <p className="mt-1 text-[11px] text-[#e7a69f]">
                                Support gems (
                                {group.supports
                                  .map((s) => s.gem.name)
                                  .join(', ')}
                                ) need a glowing link to an Active Skill Gem.
                              </p>
                            ) : (
                              <p className="mt-1 text-[11px] text-[#85788e]">
                                Drop an Active Gem and Support Gems into
                                connected sockets to empower them.
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Gem Stash & Unsocket Drop Zone */}
                <section
                  aria-label="Skill Gem Stash"
                  onDragOver={(e) => {
                    if (dragPayload?.source === 'socket') {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      setHoveredDrop('stash');
                    }
                  }}
                  onDragLeave={(e) => {
                    if (
                      hoveredDrop === 'stash' &&
                      !e.currentTarget.contains(e.relatedTarget as Node)
                    ) {
                      setHoveredDrop(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setHoveredDrop(null);
                    const payload = parseDragPayload(e);
                    setDragPayload(null);
                    if (
                      payload?.source === 'socket' &&
                      payload.itemId !== undefined &&
                      payload.socketIndex !== undefined
                    ) {
                      handleUnsocket(payload.itemId, payload.socketIndex);
                    }
                  }}
                  className={`flex flex-1 flex-col rounded-md border p-4 transition ${
                    hoveredDrop === 'stash'
                      ? 'border-[#ffd87a] bg-[#1d1728] ring-2 ring-[#ffd87a]/40'
                      : 'border-white/10 bg-[#14101d]'
                  }`}
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                    <div>
                      <h3 className="font-display text-sm font-bold tracking-wide text-[#dfb672]">
                        Gem Stash ({loadout.stash.length})
                      </h3>
                      <p className="text-[11px] text-[#9e91a3]">
                        Drag to a socket, or drop a socketed gem here to remove
                      </p>
                    </div>
                  </div>

                  {/* Interactive Filter Controls */}
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1 rounded bg-[#0c0911] p-1">
                      {(['all', 'active', 'support'] as const).map((kind) => (
                        <button
                          key={kind}
                          type="button"
                          onClick={() => setFilterKind(kind)}
                          className={`rounded px-2.5 py-1 text-[11px] font-semibold capitalize transition whitespace-nowrap shrink-0 ${
                            filterKind === kind
                              ? 'bg-[#2a2136] text-[#ffe5ad]'
                              : 'text-[#9e91a3] hover:text-[#f1e6d8]'
                          }`}
                        >
                          {kind === 'all' ? 'All Types' : kind}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 rounded bg-[#0c0911] p-1">
                      {(['all', 'red', 'blue', 'green'] as const).map(
                        (col) => (
                          <button
                            key={col}
                            type="button"
                            onClick={() => setFilterColor(col)}
                            className={`rounded px-2 py-1 text-[11px] font-semibold capitalize transition whitespace-nowrap shrink-0 ${
                              filterColor === col
                                ? 'bg-[#2a2136] text-[#ffe5ad]'
                                : 'text-[#9e91a3] hover:text-[#f1e6d8]'
                            }`}
                          >
                            {col === 'all' ? 'All Colors' : col}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {filteredStash.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center rounded border border-dashed border-white/15 p-6 text-center text-xs text-[#8d8096]">
                      No matching gems in stash. Unsocket a gem or adjust filters.
                    </div>
                  ) : (
                    <div className="grid max-h-[300px] grid-cols-1 gap-2 overflow-y-auto pr-1">
                      {filteredStash.map((gem) => {
                        const cMeta = COLOR_META[gem.color];
                        const isSelected =
                          selectedGem?.source === 'stash' &&
                          selectedGem.gemUid === gem.uid;

                        return (
                          <div
                            key={gem.uid}
                            draggable
                            onDragStart={(e) => {
                              const payload: DragGemPayload = {
                                source: 'stash',
                                gemUid: gem.uid,
                              };
                              setDragPayload(payload);
                              e.dataTransfer.effectAllowed = 'move';
                              e.dataTransfer.setData(
                                'application/json',
                                JSON.stringify(payload)
                              );
                              e.dataTransfer.setData('text/plain', gem.name);
                            }}
                            onDragEnd={() => {
                              setDragPayload(null);
                              setHoveredDrop(null);
                            }}
                            onClick={() =>
                              setSelectedGem(
                                isSelected
                                  ? null
                                  : { source: 'stash', gemUid: gem.uid }
                              )
                            }
                            className={`flex cursor-grab items-start gap-3 rounded border p-2.5 transition active:cursor-grabbing ${
                              isSelected
                                ? 'border-[#ffd87a] bg-[#211a2d]'
                                : 'border-white/10 bg-[#100d17] hover:border-[#dfb672]/45'
                            }`}
                          >
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-lg ${cMeta.bg} ${cMeta.ring}`}
                            >
                              {gem.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate text-xs font-bold text-[#f4e9d8]">
                                  {gem.name}
                                </span>
                                <span
                                  className={`font-mono-num text-[10px] font-semibold uppercase ${cMeta.text} whitespace-nowrap shrink-0`}
                                >
                                  {gem.kind} · {gem.color} · Lv {gem.level}
                                </span>
                              </div>
                              <p className="mt-0.5 text-[11px] leading-snug text-[#a598ad]">
                                {gem.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </aside>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GemSocketManager;
