/* Original Canvas artwork for Ashen Eclipse. All measurements are visual. */
window.EclipseArt = (() => {
  const TAU = Math.PI * 2;
  const classMaterials = {
    dreadnought: ['#ce724a', '#612f2c', '#b8a395'],
    harbinger: ['#8ce2e8', '#343654', '#8075ac'],
    strider: ['#b7e1a2', '#324c39', '#ab9163'],
  };
  const enemies = {
    thrall: ['#ff9d79', '#563e3d', '#a18b79'],
    hulker: ['#ffa85d', '#4a3431', '#997060'],
    acolyte: ['#f098ff', '#462453', '#b47cc8'],
    shieldbearer: ['#f5c184', '#3b414b', '#8796a2'],
    stalker: ['#e89cff', '#322649', '#957ab5'],
    frostweaver: ['#a5f4ff', '#274252', '#668d9f'],
    summoner: ['#baff9a', '#2a463f', '#90a66d'],
    boss: ['#ffb163', '#541a22', '#cc8053'],
  };
  const rarity = ['#c8bfb4', '#93baff', '#f5d775', '#ff9e58'];
  const weaponIcons = { '🪓': 'axe', '🪄': 'staff', '🏹': 'bow', '⚔️': 'sword' };
  const slotShapes = { helm: 'helm', body: 'body', gloves: 'gloves', boots: 'boots', belt: 'belt', ring1: 'ring', ring2: 'ring', amulet: 'amulet' };

  function shape(ctx, points, fill, edge = '#121017', width = 1) {
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (edge) {
      ctx.strokeStyle = edge;
      ctx.lineWidth = width;
      ctx.stroke();
    }
  }

  function ellipse(ctx, x, y, rx, ry, fill) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function light(ctx, x, y, radius, color) {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, color);
    glow.addColorStop(1, '#0000');
    ctx.fillStyle = glow;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  function weaponType(item, fallback) {
    return weaponIcons[item?.icon] || fallback;
  }

  function model(ctx, type, bright, dark, metal) {
    if (type === 'axe' || type === 'sword' || type === 'staff') {
      shape(ctx, [[-18,-2],[17,-2],[18,1],[-17,2]], '#664637', metal, 0.7);
    }
    switch (type) {
      case 'axe':
        shape(ctx, [[8,-5],[15,-6],[20,-15],[29,-11],[31,8],[22,14],[14,7],[8,5]], metal, bright);
        shape(ctx, [[15,-4],[20,-11],[25,-8],[27,7],[22,10],[16,4]], dark, null);
        shape(ctx, [[27,-10],[30,-9],[30,7],[26,10]], '#fff0d4', null);
        break;
      case 'sword':
        shape(ctx, [[-4,-7],[1,-5],[2,-2],[22,-4],[32,0],[22,4],[2,2],[1,5],[-4,7],[-2,0]], metal, bright);
        shape(ctx, [[3,0],[30,0],[22,3],[3,2]], dark, null);
        break;
      case 'staff':
        shape(ctx, [[12,0],[18,-7],[25,-5],[30,0],[25,5],[18,7]], dark, metal);
        light(ctx, 23, 0, 16, bright + '70');
        shape(ctx, [[17,0],[22,-6],[28,0],[22,6]], bright, '#f3ffff');
        break;
      case 'bow':
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-5,-15); ctx.quadraticCurveTo(22,0,-5,15);
        ctx.strokeStyle = dark; ctx.lineWidth = 5; ctx.stroke();
        ctx.strokeStyle = metal; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-5,-15); ctx.lineTo(-8,0); ctx.lineTo(-5,15);
        ctx.strokeStyle = bright; ctx.lineWidth = 1; ctx.stroke();
        break;
      case 'shield':
        shape(ctx, [[-13,-10],[7,-12],[15,-5],[14,5],[5,12],[-13,9],[-17,0]], dark, metal, 2);
        shape(ctx, [[-9,-5],[4,-7],[9,0],[4,7],[-9,4]], metal, null);
        ellipse(ctx, 1, 0, 3, 3, bright);
        break;
      case 'book':
        shape(ctx, [[-13,-11],[12,-11],[14,9],[-12,11]], dark, metal, 2);
        shape(ctx, [[-2,-6],[5,0],[-2,6],[-7,0]], bright, null);
        break;
      case 'quiver':
        shape(ctx, [[-15,-4],[10,-6],[15,-4],[13,6],[-14,5]], dark, metal);
        shape(ctx, [[4,-2],[19,-2],[22,0],[19,2],[4,2]], bright, null);
        break;
      case 'helm':
        shape(ctx, [[-9,-9],[4,-11],[12,-6],[12,6],[4,11],[-9,9],[-12,0]], metal, dark);
        shape(ctx, [[1,-7],[11,-4],[9,0],[11,4],[1,7],[4,0]], dark, null);
        ctx.fillStyle = bright; ctx.fillRect(6,-5,2,3); ctx.fillRect(6,2,2,3);
        break;
      case 'hood':
        shape(ctx, [[-13,0],[-7,-9],[2,-10],[11,-4],[13,0],[11,4],[2,10],[-7,9]], dark, metal);
        shape(ctx, [[2,-6],[11,-4],[12,0],[11,4],[2,6],[5,0]], '#181621', null);
        ctx.fillStyle = bright; ctx.fillRect(7,-3,2,2); ctx.fillRect(7,1,2,2);
        break;
      case 'circlet':
        shape(ctx, [[-8,-8],[4,-9],[11,-4],[12,5],[3,9],[-8,6]], dark, metal);
        shape(ctx, [[6,-7],[12,-5],[10,-1],[14,0],[10,1],[12,5],[6,7]], bright, metal);
        break;
      case 'body':
        shape(ctx, [[-13,-11],[1,-14],[11,-10],[12,10],[1,14],[-13,11],[-9,0]], dark, metal);
        shape(ctx, [[-8,-7],[1,-10],[8,-6],[8,6],[1,10],[-8,7],[-3,0]], metal, null);
        shape(ctx, [[-5,0],[1,-6],[7,0],[1,6]], dark, null);
        ctx.fillStyle = bright; ctx.fillRect(-1,-1,4,2);
        break;
      case 'gloves':
      case 'boots':
        for (const side of [-1, 1]) {
          ctx.save(); ctx.translate(0, side * 7);
          shape(ctx, type === 'boots' ? [[-13,-4],[8,-4],[13,-1],[12,5],[-13,4]] : [[-12,-4],[2,-5],[9,-4],[13,0],[9,5],[0,5],[-12,3]], dark, metal);
          ctx.fillStyle = bright; ctx.fillRect(3,-2,3,4);
          ctx.restore();
        }
        break;
      case 'belt':
        shape(ctx, [[-13,-5],[13,-5],[13,5],[-13,5]], dark, metal);
        shape(ctx, [[-4,-6],[5,-6],[5,6],[-4,6]], bright, metal);
        break;
      case 'ring':
      case 'amulet':
        ctx.beginPath(); ctx.ellipse(0,3,8, type === 'ring' ? 6 : 10,0,0,TAU);
        ctx.strokeStyle = metal; ctx.lineWidth = 2; ctx.stroke();
        shape(ctx, [[0,-10],[5,-6],[0,0],[-5,-6]], bright, metal);
        break;
    }
  }

  function itemType(item) {
    if (item.slot === 'weapon') return weaponType(item, 'sword');
    if (item.slot === 'offhand') return item.icon === '📕' ? 'book' : item.icon === '🏹' ? 'quiver' : 'shield';
    if (item.slot === 'helm' && item.icon === '🥷') return 'hood';
    if (item.slot === 'helm' && item.icon === '👑') return 'circlet';
    return slotShapes[item.slot];
  }

  const itemIcons = new Map();
  function itemImage(item) {
    const type = itemType(item);
    const key = [type, item.rarity, item.setId, item.corrupted, item.pinnacle].join(':');
    if (itemIcons.has(key)) return itemIcons.get(key);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const color = item.corrupted ? '#ed8beb' : item.setId ? '#95e9a5' : rarity[item.rarity];
    light(ctx, 32, 32, 29, color + '55');
    ctx.translate(type === 'sword' || type === 'axe' || type === 'staff' ? 27 : 32, 32);
    ctx.rotate(-Math.PI / 5);
    ctx.scale(1.1, 1.1);
    model(ctx, type, color, '#302637', '#938b89');
    itemIcons.set(key, canvas);
    return canvas;
  }

  function insignia(ctx, radius, color, time) {
    ctx.save();
    ctx.rotate(time);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([radius * 0.33, radius * 0.19]);
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      shape(ctx, [[radius+4,0],[radius,3],[radius-4,0],[radius,-3]], color, null);
    }
    ctx.restore();
  }

  const effects = {
    sunder_cleave: ['sweep', '#ffc28d'],
    earthshatter: ['fracture', '#ffad60'],
    ancestral_leap: ['fracture', '#f77c4d'],
    blight_bolt: ['cast', '#d6a2ff'],
    frost_pulse: ['frost', '#9cecff'],
    void_conduit: ['cast', '#d4adff'],
    split_arrow: ['cast', '#c9e6ad'],
    snare_trap: ['ward', '#aadd8b'],
    rain_thorns: ['ward', '#aee39e'],
  };

  function castStyle(id, accent) {
    return effects[id] || ['ward', accent];
  }

  const runeCache = new Map();
  function rune(id, accent) {
    const key = id + ':' + accent;
    if (runeCache.has(key)) return runeCache.get(key);
    const [kind, color] = castStyle(id, accent);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.translate(33, 35);
    light(ctx, 0, 0, 26, color + '45');
    if (id === 'sunder_cleave' || id === 'split_arrow' || id === 'void_conduit') {
      ctx.rotate(-.64);
      ctx.scale(.73, .73);
      model(ctx, id === 'sunder_cleave' ? 'axe' : id === 'split_arrow' ? 'bow' : 'staff', color, '#473238', '#d4bfae');
    } else if (kind === 'cast') {
      shape(ctx, [[-23,9],[-9,-2],[0,-12],[14,-9],[20,0],[11,9],[-2,11]], color, '#fff4ec');
      ellipse(ctx, 8, -1, 5, 5, '#fff4ec');
    } else if (kind === 'fracture') {
      shape(ctx, [[-21,9],[-10,-5],[-6,5],[4,-13],[9,0],[20,-7],[16,9],[3,15]], '#6c483f', color, 2);
      shape(ctx, [[-21,9],[-1,6],[4,-5],[7,6],[16,9],[0,12]], color, null);
    } else {
      spell(ctx, { x:0, y:0, kind, radius:24, angle:0, color }, .48, false);
      shape(ctx, [[0,-8],[6,0],[0,8],[-6,0]], '#fff0da', color);
    }
    const icon = canvas.toDataURL();
    runeCache.set(key, icon);
    return icon;
  }

  function spell(ctx, effect, progress, reduced) {
    const { x, y, angle, color, kind, radius } = effect;
    const fade = 1 - progress;
    const reach = radius * (.25 + .75 * (1 - fade * fade));
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    ctx.globalAlpha = fade * (reduced ? .52 : .92);
    ctx.lineCap = 'round';
    if (kind === 'sweep') {
      const edge = progress * 2.4 - 1.3;
      const arc = ctx.createConicGradient(-1.4, 3, 0);
      arc.addColorStop(0, color + '28');
      arc.addColorStop(.26, color);
      arc.addColorStop(.53, color + '00');
      arc.addColorStop(1, color + '00');
      ctx.strokeStyle = arc; ctx.lineWidth = 10 * fade + 3;
      ctx.beginPath(); ctx.arc(3, 0, radius * (.65 + progress * .35), Math.max(-1.4, edge - 1.7), edge + .22); ctx.stroke();
      ctx.strokeStyle = '#fff2d5'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(3, 0, radius * (.65 + progress * .35) + 3, Math.max(-1.4, edge - 1.24), edge + .13); ctx.stroke();
    } else if (kind === 'cast') {
      light(ctx, 16, 0, 23 * fade + 4, color + 'ac');
      for (const spread of [-.25, 0, .25]) {
        ctx.save(); ctx.rotate(spread);
        shape(ctx, [[12,-1],[reach,-3],[reach + 12,0],[reach,3],[12,1]], color, null);
        ctx.restore();
      }
    } else if (kind === 'impact') {
      light(ctx, 0, 0, reach + 2, color + 'a3');
      const spokes = reduced ? 4 : 9;
      for (let i = 0; i < spokes; i++) {
        ctx.rotate(TAU / spokes);
        const length = reach * (.57 + (i % 3) * .2);
        shape(ctx, [[length*.4,0],[length,-2],[length + 5,0],[length,2]], color, null);
      }
    } else {
      ctx.rotate(-angle);
      ctx.strokeStyle = color; ctx.lineWidth = 2.5 * fade + 1;
      ctx.beginPath(); ctx.arc(0, 0, reach, 0, TAU); ctx.stroke();
      if (kind === 'ward') {
        insignia(ctx, reach * .8, color, progress);
      } else {
        const spokes = kind === 'frost' ? 6 : 9;
        for (let i = 0; i < spokes; i++) {
          ctx.rotate(TAU / spokes);
          const length = reach * (.75 + (i % 3) * .08);
          ctx.beginPath();
          ctx.moveTo(length * .38, 0); ctx.lineTo(length * .68, 4); ctx.lineTo(length, 0);
          if (kind === 'frost') { ctx.moveTo(length * .72, -5); ctx.lineTo(length, 0); ctx.lineTo(length * .72, 7); }
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  const weaponGlow = {
    axe: [[28,-10],[30,0],[29,8]],
    sword: [[7,-2],[22,-4],[31,0]],
    staff: [[19,-3],[22,-6],[27,0]],
    bow: [[-4,-14],[3,-10],[7,-4],[8,0],[7,4],[3,10],[-4,14]],
  };

  function radiantWeapon(ctx, weapon, glow, cloth, metal, time, swing, reduced) {
    const type = weaponType(weapon, 'sword');
    const point = weaponGlow[type][1];
    const pulse = reduced ? .8 : .7 + .3 * Math.sin(time * 5.5);
    ctx.save();
    light(ctx, point[0], point[1], 22 + swing * 11, glow + (weapon.rarity >= 2 ? '88' : '58'));
    model(ctx, type, glow, cloth, metal);
    ctx.strokeStyle = glow;
    ctx.lineJoin = ctx.lineCap = 'round';
    ctx.globalAlpha = pulse;
    ctx.shadowColor = glow;
    ctx.shadowBlur = 8 + swing * 6;
    ctx.lineWidth = weapon.rarity >= 2 ? 2.8 : 1.9;
    ctx.beginPath(); ctx.moveTo(...weaponGlow[type][0]);
    for (const vertex of weaponGlow[type].slice(1)) ctx.lineTo(...vertex);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ellipse(ctx, point[0], point[1], 1.5, 1.5, '#fff5d9');
    if (!reduced) {
      for (let i = 0; i < 3; i++) {
        const age = (time * .82 + i * .34) % 1;
        ctx.globalAlpha = (1 - age) * pulse;
        ellipse(ctx, point[0] - age * (6 + i * 3), point[1] - age * 12 + Math.sin(time * 5 + i) * 3, 1.2, .85, glow);
      }
    }
    ctx.restore();
  }

  function hero(ctx, player, time, reduced = false) {
    const [accent, cloth, steel] = classMaterials[player.cls.id];
    const gear = player.eq;
    const swing = player.animSwing;
    const stride = player.artStride || 0;
    const walk = Math.sin(stride) * (player.artMoving ? 4 : 0);
    const glow = gear.weapon?.corrupted ? '#ee8dfb' : gear.weapon?.rarity > 0 ? rarity[gear.weapon.rarity] : accent;
    ctx.save(); ctx.translate(player.x, player.y);
    light(ctx, 0, 0, 66, accent + '30');
    if (player.activeAuras.size || player.es > 0) {
      ctx.save(); ctx.scale(1, .72);
      insignia(ctx, 26, accent + 'a8', reduced ? 0 : time * .55);
      ctx.restore();
    }
    ellipse(ctx, 0, 8, 25, 12, '#0009');
    if (player.dash) {
      ctx.save(); ctx.rotate(Math.atan2(player.dash.vy, player.dash.vx));
      for (let i = reduced ? 1 : 3; i >= 1; i--) {
        const trail = ctx.createLinearGradient(-i * 20, 0, 0, 0);
        trail.addColorStop(0, accent + '00'); trail.addColorStop(1, accent + '66');
        shape(ctx, [[-i*22,0],[-8,-8+i*2],[4,0],[-8,8-i*2]], trail, null);
      }
      ctx.restore();
    }
    ctx.rotate(player.face);
    ctx.scale(1.13, 1.13);
    ctx.translate(swing * 2, reduced ? 0 : Math.sin(time * 3.7) * .7);
    const capeWave = Math.sin(time * 6 + stride * 0.3) * (player.artMoving ? 4 : 2);
    shape(ctx, [[2,-11],[-13,-14],[-28,-8+capeWave],[-22,2+capeWave],[-29,11+capeWave],[-12,13],[2,11]], cloth, '#110e17', 2);
    shape(ctx, [[-4,-8],[-25,-5+capeWave],[-15,0],[-24,8+capeWave],[-4,8]], accent + '35', null);
    for (const side of [-1, 1]) {
      ctx.save(); ctx.translate(-10 + walk * side, side * 7);
      shape(ctx, [[-8,-3],[6,-4],[9,0],[7,4],[-8,3]], '#1e1923', gear.boots ? rarity[gear.boots.rarity] : steel);
      ctx.restore();
    }
    const plated = player.cls.id === 'dreadnought' || gear.body?.icon === '🦺';
    const trim = gear.body?.rarity >= 2 ? rarity[gear.body.rarity] : steel;
    model(ctx, 'body', accent, cloth, trim);
    for (const side of [-1, 1]) {
      shape(ctx, [[-9,side*8],[0,side*8],[6,side*12],[3,side*(plated ? 17 : 14)],[-8,side*14]], plated ? trim : cloth, '#141019', 1.5);
    }
    if (gear.belt) { ctx.fillStyle = rarity[gear.belt.rarity]; ctx.fillRect(-7,-8,2,16); }
    const headMetal = gear.helm ? rarity[gear.helm.rarity] : steel;
    ctx.save(); ctx.translate(5, 0); ctx.scale(.8, .76);
    const headShape = gear.helm ? itemType(gear.helm) : plated ? 'helm' : 'hood';
    model(ctx, headShape, accent, plated ? '#1a1622' : cloth, headMetal);
    ctx.restore();
    if (gear.amulet) ellipse(ctx, 1, -2, 2, 2, rarity[gear.amulet.rarity]);
    if (gear.offhand) {
      ctx.save(); ctx.translate(4,-14); ctx.scale(.65,.65);
      model(ctx, itemType(gear.offhand), accent, cloth, rarity[gear.offhand.rarity]);
      ctx.restore();
    }
    ctx.translate(5, 13);
    ctx.rotate(-.22 + Math.sin((1 - swing) * Math.PI) * (reduced ? .6 : 1.35) * player.swingDir);
    ellipse(ctx, 1, 0, 5, 4, gear.gloves ? rarity[gear.gloves.rarity] : '#937466');
    if (gear.ring1 || gear.ring2) ellipse(ctx, 1, -3, 1.8, 1.8, '#f6dfab');
    if (gear.weapon) radiantWeapon(ctx, gear.weapon, glow, cloth, steel, time, swing, reduced);
    ctx.restore();
  }

  function monster(ctx, enemy, time, reduced = false) {
    const bossMaterials = [enemies.boss, ['#ffd28c','#503129','#9f8161'], enemies.frostweaver, enemies.stalker];
    const [baseAccent, cloth, metal] = enemy.boss ? bossMaterials[(enemy.actId || 1) - 1] : enemies[enemy.typeKey] || enemies.boss;
    const accent = enemy.uber ? '#ef9bff' : enemy.breachMob ? '#d89aff' : enemy.chill > 0 ? '#a5f4ff' : baseAccent;
    const size = enemy.r / 13;
    ctx.save(); ctx.scale(size, size);
    const sway = Math.sin(time * (enemy.awake ? 12 : 3) + enemy.x * .15) * (enemy.awake ? 2.6 : .8);
    if (enemy.boss || enemy.breachMob) light(ctx, 0, 0, 32, accent + '48');
    if (enemy.igniteT > 0) {
      light(ctx, 0, 0, 23, '#ff79386e');
      if (!reduced) for (let i = 0; i < 4; i++) {
        const age = (time * 1.6 + i * .25) % 1;
        ellipse(ctx, (i - 1.5) * 6, 4 - age * 19, 2 - age, 2.9 - age * 2, '#ffb979');
      }
    }
    if (enemy.boss) {
      insignia(ctx, 17, accent + 'a0', reduced ? 0 : -time * .8);
      shape(ctx, [[-19,-3],[-19,-18],[1,-11],[-7,0],[1,11],[-19,18],[-19,3]], cloth, metal);
      shape(ctx, [[2,-6],[13,-10],[10,-4],[15,0],[10,4],[13,10],[2,6],[6,0]], accent, cloth);
    }
    shape(ctx, [[3,-8],[-14,-10],[-18+sway,-5],[-13,0],[-18-sway,7],[-9,10],[6,8]], cloth, '#15101b');
    for (const side of [-1, 1]) {
      const wide = enemy.boss || enemy.brute;
      shape(ctx, [[-7,side*7],[2,side*7],[7+sway*side,side*(wide ? 14 : 11)],[0,side*(wide ? 15 : 13)],[-8,side*11]], metal, cloth);
      if (enemy.boss || enemy.blink) shape(ctx, [[-1,side*10],[7,side*10],[12+sway*side,side*15],[5,side*14]], accent, null);
    }
    const flesh = enemy.flash > 0 ? '#fff4df' : metal;
    shape(ctx, [[-9,-7],[1,-9],[10,-5],[13,0],[10,5],[1,9],[-9,7],[-5,0]], flesh, cloth);
    shape(ctx, [[1,-6],[10,-4],[12,0],[10,4],[1,6],[4,0]], cloth, null);
    ctx.shadowColor = accent; ctx.shadowBlur = 7;
    ctx.fillStyle = accent; ctx.fillRect(6,-4,3,2); ctx.fillRect(6,2,3,2);
    ctx.shadowBlur = 0;
    if (enemy.shield && enemy.shieldT > 0) {
      ctx.translate(10, -5); ctx.scale(.75,.65); model(ctx, 'shield', accent, cloth, metal);
    } else if (enemy.frost || enemy.summoner || enemy.typeKey === 'acolyte') {
      ctx.translate(1, 11); ctx.scale(.58,.58); model(ctx, 'staff', accent, cloth, metal);
    }
    ctx.restore();
  }

  function station(ctx, id, color, locked, time) {
    const accent = locked ? '#8b7583' : color;
    ellipse(ctx, 0, 9, 27, 12, '#0c0a13');
    light(ctx, 0, 0, 54, accent + '45');
    ctx.save(); ctx.translate(0, 5); ctx.scale(1, .57);
    insignia(ctx, 27, accent, locked ? 0 : time * .38);
    ctx.restore();
    if (id === 'waygate' || id === 'delve') {
      ctx.save(); ctx.scale(.7,.7); portal(ctx, !locked, time); ctx.restore();
      return;
    }
    shape(ctx,[[-18,0],[-10,-11],[10,-11],[18,0],[11,12],[-11,12]],'#39303c','#a78668');
    if (id === 'stash') {
      shape(ctx,[[-14,2],[-14,-12],[-8,-18],[9,-18],[15,-12],[15,2]],'#513832',accent);
      shape(ctx,[[-14,-10],[15,-10],[15,-5],[-14,-5]],'#b68a66',null);
      ellipse(ctx,0,-6,2.8,3.2,'#ffe0a8');
    } else if (id === 'bench') {
      shape(ctx,[[-16,-12],[16,-12],[10,-4],[4,-2],[3,5],[-9,5],[-6,-2],[-12,-5]],'#938993',accent);
    } else if (id === 'fountain') {
      ellipse(ctx,0,-2,14,8,'#163a4a');
      ellipse(ctx,0,-4,12,5,accent);
      for (let i=0; i<5; i++) {
        const step = (time * .7 + i * .2) % 1;
        ellipse(ctx, Math.sin(i * 1.9) * step * 11, -4 - Math.sin(step * Math.PI) * 20, 2, 2, '#a7f7fb');
      }
    } else {
      const height = locked ? 15 : 19 + Math.sin(time * 3) * 3;
      shape(ctx,[[0,-height-8],[9,-10],[6,-2],[0,3],[-6,-2],[-9,-10]],accent,'#e1d1ce');
      shape(ctx,[[0,-height-8],[0,3],[-6,-2],[-9,-10]],'#22152a54',null);
    }
  }

  function classPortrait(cls) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 168;
    const ctx = canvas.getContext('2d');
    const [accent, cloth] = classMaterials[cls.id];
    light(ctx,84,84,83,cloth);
    ctx.translate(84,84); ctx.rotate(-.4);
    insignia(ctx,57,accent + '60',0);
    ctx.scale(1.9,1.9);
    hero(ctx, {
      cls, x: -4, y: 0, face: -.35, activeAuras: new Set(), es: 0, animSwing: 0, swingDir: 1,
      eq: { weapon: cls.starterWeapon },
    }, 0);
    return canvas.toDataURL();
  }

  const tiles = new Map();
  const stoneColors = ['#515058','#494449','#59443d','#3b5055','#484055'];
  const stoneFlecks = ['#d4b08438','#a98d633d','#dd916534','#72b4b03d','#b293d333'];
  function stone(ctx, x, y, size, biome, wall, seed) {
    const key = [size, biome, wall, seed].join(':');
    if (!tiles.has(key)) {
      const tile = document.createElement('canvas'); tile.width = tile.height = size;
      const art = tile.getContext('2d');
      const coat = art.createLinearGradient(0,0,size,size);
      coat.addColorStop(0, stoneColors[biome] || stoneColors[0]);
      coat.addColorStop(1, wall ? '#131019' : '#24212a');
      art.fillStyle = coat; art.fillRect(0,0,size,size);
      let state = (seed + 1) * 21803;
      const rand = () => ((state = (Math.imul(state,1664525)+1013904223) >>> 0) / 4294967296);
      for (let i = 0; i < 115; i++) {
        art.fillStyle = i % 3 ? '#0002' : '#efe5dc13';
        art.fillRect(rand()*size,rand()*size,1+rand()*3,1);
      }
      if (!wall && seed % 3 === 0) {
        const offsetX = 8 + rand() * 23;
        const offsetY = 8 + rand() * 23;
        for (let i = 0; i < 16; i++) {
          art.fillStyle = i % 3 ? stoneFlecks[biome] : '#11101980';
          art.fillRect(offsetX + (rand() - .5) * 15, offsetY + (rand() - .5) * 15, 2 + rand() * 4, 1 + rand() * 2);
        }
      }
      art.strokeStyle = '#121019'; art.strokeRect(.5,.5,size-1,size-1);
      art.strokeStyle = '#b5a19e20'; art.beginPath(); art.moveTo(2,size-2); art.lineTo(2,2); art.lineTo(size-3,2); art.stroke();
      art.beginPath(); art.moveTo(0,8+seed*2); art.lineTo(size*.4,16); art.lineTo(size*.56,23); art.lineTo(size*.45,size); art.strokeStyle = '#09081180'; art.stroke();
      if (wall) {
        art.fillStyle = '#14111c'; art.fillRect(0,size-12,size,12);
        art.fillStyle = '#a58a735a'; art.fillRect(0,size-13,size,1);
        art.fillStyle = '#dbc2a324'; art.fillRect(0,1,size,2);
        art.fillStyle = '#43363e'; art.fillRect(3,size-9,size-6,4);
        art.fillStyle = '#0d0a12'; art.fillRect(6,size-5,size-12,3);
      }
      tiles.set(key,tile);
    }
    ctx.drawImage(tiles.get(key), x, y);
  }

  function roomDecor(ctx, room, tileSize, biome, important) {
    const color = ['#e2b98c','#c2a77e','#e79b72','#92e4e8','#c4a1e2'][biome];
    const x = room.x * tileSize + 5;
    const y = room.y * tileSize + 5;
    const width = room.w * tileSize - 10;
    const height = room.h * tileSize - 10;
    ctx.save();
    ctx.strokeStyle = '#08060c63'; ctx.lineWidth = 9;
    ctx.strokeRect(x, y, width, height);
    ctx.strokeStyle = color + '3a'; ctx.lineWidth = 1;
    ctx.strokeRect(x + 4, y + 4, width - 8, height - 8);
    for (const sideX of [0, 1]) {
      for (const sideY of [0, 1]) {
        ctx.save(); ctx.translate(x + sideX * width, y + sideY * height);
        ctx.scale(sideX ? -1 : 1, sideY ? -1 : 1);
        shape(ctx, [[4,4],[22,4],[21,9],[10,10],[9,21],[4,22]], color + '40', '#0d0b15bb');
        shape(ctx, [[10,14],[14,10],[19,14],[14,19]], color + '84', null);
        ctx.restore();
      }
    }
    if (important || ((room.x + room.y) % 3 === 1)) {
      ctx.translate((room.cx + .5) * tileSize, (room.cy + .5) * tileSize);
      ctx.scale(1,.64);
      const radius = important ? 66 : 42;
      ellipse(ctx,0,0,radius,radius,'#100d1755');
      light(ctx,0,0,radius * 1.55,color + '22');
      insignia(ctx,radius,color + '61',Math.PI / 4);
      insignia(ctx,radius * .72,color + '3f',0);
    }
    ctx.restore();
  }

  function dangerZone(ctx, x, y, radius, progress) {
    ctx.save(); ctx.translate(x,y);
    light(ctx,0,0,radius,'#e7414728');
    ctx.strokeStyle = '#ff805d'; ctx.lineWidth = 2;
    ctx.setLineDash([6,4]); ctx.beginPath(); ctx.arc(0,0,radius,0,TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#ffca8f'; ctx.lineWidth = 2 + progress;
    ctx.beginPath(); ctx.arc(0,0,Math.max(1,radius*progress),0,TAU); ctx.stroke();
    ctx.restore();
  }

  function torch(ctx, x, y, time, color, reduced = false) {
    const flicker = Math.sin(time * 11 + x) * 3;
    light(ctx, x, y-11, 176 + flicker, color + '5e');
    light(ctx, x, y-13, 42, color + '60');
    ctx.save(); ctx.translate(x, y);
    shape(ctx, [[-6,-4],[-4,9],[4,9],[6,-4]], '#342722', '#aa8060');
    shape(ctx, [[-5,-5],[-6,-13],[0,-24+flicker],[2,-15],[6,-12],[4,-5]], color, null);
    shape(ctx, [[-2,-6],[-3,-11],[1,-16],[3,-10],[2,-6]], '#fff0ce', null);
    for (let i=0; i<(reduced ? 0 : 5); i++) {
      const age = (time * .86 + i * .26) % 1;
      ctx.globalAlpha = 1 - age;
      ellipse(ctx, Math.sin(time*3+i)*age*9, -14-age*29, 1.4, 1.4, color);
    }
    ctx.restore();
  }

  function portal(ctx, active, time) {
    const accent = active ? '#f3bc78' : '#9d5860';
    ellipse(ctx, 0, 2, 33, 14, '#080610');
    light(ctx, 0, -16, 62, accent + (active ? '70' : '28'));
    shape(ctx, [[-31,4],[-25,-5],[25,-5],[31,4],[23,9],[-23,9]], '#302631', '#846355');
    ellipse(ctx, 0, -15, 22, 28, '#0d0b17');
    if (active) {
      light(ctx, 0,-18,29,'#f8bd8285');
      const beam = ctx.createLinearGradient(0,-53,0,4);
      beam.addColorStop(0,'#edac7b00'); beam.addColorStop(.68,'#edac7b50'); beam.addColorStop(1,'#edac7b00');
      shape(ctx,[[-3,-53],[3,-53],[16,4],[-16,4]],beam,null);
      for (let i = 0; i < 5; i++) {
        const age = (time * .65 + i * .2) % 1;
        ctx.globalAlpha = (1 - age) * .8;
        ellipse(ctx, Math.sin(i * 11 + time * 2) * (4 + age * 9), -9 - age * 43, 1.4, 2, '#ffda9f');
      }
      ctx.globalAlpha = 1;
    }
    ctx.save(); ctx.translate(0,-15); ctx.scale(.79,1);
    insignia(ctx, 28, accent, active ? time*.7 : 0);
    if (active) insignia(ctx,17,'#ffe2aa85',-time*1.4);
    ctx.restore();
  }

  function projectile(ctx, shot) {
    const speed = Math.hypot(shot.vx || 0, shot.vy || 0);
    ctx.save(); ctx.translate(shot.x, shot.y);
    ctx.rotate(speed ? Math.atan2(shot.vy, shot.vx) : 0);
    const size = shot.r || 5;
    const tail = Math.min(44, speed * .083);
    if (tail > 1) {
      const trail = ctx.createLinearGradient(-tail,0,0,0);
      trail.addColorStop(0,'#0000'); trail.addColorStop(1,shot.col);
      shape(ctx,[[-tail,0],[-5,-size*.58],[3,0],[-5,size*.58]],trail,null);
    }
    ctx.shadowColor = shot.col; ctx.shadowBlur = 13;
    if (shot.arrow) shape(ctx,[[-10,-1],[3,-1],[3,-4],[9,0],[3,4],[3,1],[-10,1]],'#fff3d5',null);
    else { ellipse(ctx,0,0,size,size*.74,shot.col); ellipse(ctx,2,0,size*.48,size*.34,'#fffafa'); }
    ctx.restore();
  }

  function atmosphere(ctx, width, height, x, y, time, biome, ashes, reduced) {
    const colors = ['#cdb28b','#b79c7f','#eca477','#8ed5da','#c0a5eb'];
    const color = colors[biome];
    ctx.save();
    if (!reduced) {
      for (let i = 0; i < 5; i++) {
        const drift = ((i * .29 + time * (.012 + i * .002) - x * .0005) % 1 + 1) % 1;
        const vertical = height * (.25 + .13 * i) + Math.sin(time * .38 + i + y * .01) * 32;
        ctx.save(); ctx.translate(drift * width, vertical); ctx.scale(1, .43);
        light(ctx, 0, 0, Math.min(470, width * .28), color + '12');
        ctx.restore();
      }
    }
    for (let i = 0; i < ashes.length; i += reduced ? 4 : 1) {
      const ash = ashes[i];
      const px = ((ash.x * width + time * ash.v - x * .17) % width + width) % width;
      const py = ((ash.y * height - time * ash.v * .65 - y * .15) % height + height) % height;
      ctx.globalAlpha = .22 + (reduced ? 0 : Math.sin(time * 1.7 + i) ** 2 * .44);
      ellipse(ctx, px, py, ash.s * .68, ash.s * .56, color);
    }
    ctx.restore();
  }

  return { hero, monster, stone, roomDecor, torch, portal, projectile, insignia, light, itemImage, station, classPortrait, castStyle, spell, atmosphere, rune, dangerZone };
})();
