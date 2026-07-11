(function () {
  'use strict';

  const DOC_W = 210;
  const DOC_H = 297;
  const COUPLE_GAP = 72;
  const GEN_GAP_Y = 150;
  const SUBTREE_GAP = 64;
  const BRANCH_GAP = 180;
  const LORE_GAP = 100;
  const PAD = 120;

  const CHILD_ORDER = {
    mais: ['nain', 'kai', 'vivien', 'aurora', 'mia', 'olli'],
    kai: ['medea', 'yan', 'yuni', 'night', 'kid'],
    vivien: ['rina'],
    creed: ['madison'],
  };

  const TILTS = {
    lore: -3,
    mais: -1.5,
    nain: 2.5,
    kai: -0.8,
    creed: 1.8,
    angel: -2.2,
    vivien: 2,
    mikhail: -1.6,
    rina: -1.8,
    aurora: 2.2,
    mia: -2.4,
    olli: 1.6,
    madison: 1.2,
    medea: -2.8,
    yan: 1.5,
    krisol: -2,
    yuni: 2.5,
    night: -1.2,
    kid: 3,
    agares: 1.8,
    skadi: -2.5,
  };

  function member(id) {
    return FAMILY.members[id];
  }

  function initials(name) {
    return name.split(' ').map((w) => w[0]).join('').slice(0, 2);
  }

  function getChildren(parentId) {
    const kids = Object.values(FAMILY.members).filter(
      (m) => m.parent === parentId && !m.isSpouse
    );
    const order = CHILD_ORDER[parentId];
    if (!order) return kids.map((k) => k.id);
    return order.filter((id) => kids.some((k) => k.id === id));
  }

  function unitWidth(id) {
    const m = member(id);
    if (!m) return DOC_W;
    return m.spouse ? DOC_W * 2 + COUPLE_GAP : DOC_W;
  }

  function subtreeSpanWidth(id) {
    const children = getChildren(id);
    const selfW = unitWidth(id);
    if (!children.length) return selfW;
    const kidsW = children.reduce(
      (sum, cid, i) => sum + subtreeSpanWidth(cid) + (i ? SUBTREE_GAP : 0),
      0
    );
    return Math.max(selfW, kidsW);
  }

  function placeUnit(primaryId, centerX, y, branchKey, nodes, links) {
    const m = member(primaryId);
    if (!m) return;

    if (m.spouse) {
      const totalW = DOC_W * 2 + COUPLE_GAP;
      const x = centerX - totalW / 2;
      nodes.push({ id: primaryId, member: m, x, y, w: DOC_W, h: DOC_H, branch: branchKey });
      nodes.push({
        id: m.spouse,
        member: member(m.spouse),
        x: x + DOC_W + COUPLE_GAP,
        y,
        w: DOC_W,
        h: DOC_H,
        branch: branchKey,
      });
      links.push({ type: 'couple', from: primaryId, to: m.spouse, branch: branchKey });
      return;
    }

    nodes.push({
      id: primaryId,
      member: m,
      x: centerX - DOC_W / 2,
      y,
      w: DOC_W,
      h: DOC_H,
      branch: branchKey,
    });
  }

  function layoutSubtree(id, xStart, y, branchKey, nodes, links) {
    const children = getChildren(id);
    const spanW = subtreeSpanWidth(id);
    const centerX = xStart + spanW / 2;

    if (!children.length) {
      placeUnit(id, centerX, y, branchKey, nodes, links);
      return spanW;
    }

    const childY = y + DOC_H + GEN_GAP_Y;
    let cx = xStart;

    children.forEach((childId, i) => {
      if (i) cx += SUBTREE_GAP;
      const childBranch = member(childId)?.branch || branchKey;
      const cw = layoutSubtree(childId, cx, childY, childBranch, nodes, links);
      links.push({ type: 'parent', from: id, to: childId, branch: childBranch });
      cx += cw;
    });

    placeUnit(id, centerX, y, branchKey, nodes, links);
    return spanW;
  }

  function buildLayout() {
    const nodes = [];
    const links = [];
    const gen1Y = 40;

    nodes.push({
      id: 'lore',
      member: FAMILY.loreSheet,
      x: 0,
      y: gen1Y,
      w: DOC_W,
      h: DOC_H,
      isLore: true,
    });

    const maisX = DOC_W + LORE_GAP;
    const maisSpan = layoutSubtree('mais', maisX, gen1Y, 'mais', nodes, links);
    const creedX = maisX + maisSpan + BRANCH_GAP;
    layoutSubtree('creed', creedX, gen1Y, 'creed', nodes, links);
    links.push({ type: 'sibling', from: 'mais', to: 'creed', branch: 'mais' });
    placeOutsiders(nodes, links);

    const minX = Math.min(...nodes.map((n) => n.x)) - PAD;
    const maxX = Math.max(...nodes.map((n) => n.x + n.w)) + PAD;
    const maxY = Math.max(...nodes.map((n) => n.y + n.h)) + PAD + 40;

    nodes.forEach((n) => {
      n.x -= minX;
    });

    links.forEach((l) => {
      l.fromNode = nodes.find((n) => n.id === l.from);
      l.toNode = nodes.find((n) => n.id === l.to);
    });

    const zones = buildBranchZones(nodes);

    return { nodes, links, zones, width: maxX - minX, height: maxY };
  }

  function buildBranchZones(nodes) {
    function boundsFor(predicate) {
      const group = nodes.filter(predicate);
      if (!group.length) return null;
      const x1 = Math.min(...group.map((n) => n.x)) - 24;
      const x2 = Math.max(...group.map((n) => n.x + n.w)) + 24;
      const y1 = Math.min(...group.map((n) => n.y)) - 36;
      const y2 = Math.max(...group.map((n) => n.y + n.h)) + 20;
      return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    }

    const kaiIds = new Set(['kai', 'agares', 'medea', 'yan', 'krisol', 'yuni', 'night', 'kid']);

    return [
      { label: 'Ветка Майса', ...boundsFor((n) => !n.isLore && n.branch === 'mais' && !kaiIds.has(n.id)) },
      { label: 'Ветка Кая', ...boundsFor((n) => kaiIds.has(n.id)) },
      { label: 'Ветка Крида', ...boundsFor((n) => n.branch === 'creed') },
    ].filter((z) => z.w);
  }

  function placeOutsiders(nodes, links) {
    const maisNode = nodes.find((n) => n.id === 'mais');
    const skadi = member('skadi');
    if (!maisNode || !skadi) return;

    nodes.push({
      id: 'skadi',
      member: skadi,
      x: maisNode.x - DOC_W - 48,
      y: maisNode.y + DOC_H * 0.12,
      w: DOC_W,
      h: DOC_H,
      branch: 'mais',
      isOutsider: true,
    });
    links.push({ type: 'ex-spouse', from: 'mais', to: 'skadi', branch: 'mais' });
  }

  function clipPoint(node) {
    return { x: node.x + node.w / 2, y: node.y + 18 };
  }

  function bottomPoint(node) {
    return { x: node.x + node.w / 2, y: node.y + node.h - 12 };
  }

  function stringPath(x1, y1, x2, y2, sag) {
    const slack = sag ?? Math.max(16, Math.abs(x2 - x1) * 0.1 + 10);
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2 + slack;
    return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
  }

  function parentStringPath(x1, y1, x2, y2) {
    const drop = Math.max(28, (y2 - y1) * 0.22);
    const sway = (x2 - x1) * 0.14;
    const c1x = x1 + sway * 0.3;
    const c1y = y1 + drop;
    const c2x = x2 - sway * 0.4;
    const c2y = y2 - drop * 0.55;
    return `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`;
  }

  function statusLabel(status) {
    if (status === 'задержан') return 'ЗАДЕРЖАН';
    if (status === 'скрывается') return 'СКРЫВАЕТСЯ';
    if (status === 'секретно') return 'СЕКРЕТНО';
    if (status === 'не в розыске') return 'НЕ В РОЗЫСКЕ';
    if (status === 'местонахождение неизвестно') return 'НЕИЗВЕСТНО';
    return 'РАЗЫСКИВАЕТСЯ';
  }

  function createSheet(node, onClick) {
    const m = node.member;
    const tilt = TILTS[node.id] ?? 0;
    const el = document.createElement('article');
    const isLore = node.isLore || m.isLoreSheet;

    el.className = 'a4-sheet' + (isLore ? ' a4-sheet--lore' : '') + (m.photo ? ' has-photo' : '');
    if (m.isOutsider) el.classList.add('is-outsider');
    if (m.isExSpouse) el.classList.add('is-ex-spouse');
    if (!isLore && m.status === 'задержан') el.classList.add('is-captured');
    el.dataset.id = node.id;
    el.style.left = node.x + 'px';
    el.style.top = node.y + 'px';
    el.style.setProperty('--tilt', tilt + 'deg');
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');

    if (isLore) {
      el.setAttribute('aria-label', m.name);
      el.innerHTML =
        '<div class="a4-sheet__clip" aria-hidden="true"></div>' +
        '<div class="a4-sheet__page">' +
          '<header class="a4-sheet__head">' +
            '<span class="a4-sheet__org">Оперотдел · VIPERR</span>' +
            '<span class="a4-sheet__case">Дело № ' + (m.caseId || '—') + '</span>' +
          '</header>' +
          '<h2 class="a4-sheet__doctype">Общий лор</h2>' +
          '<div class="a4-sheet__lore-mark" aria-hidden="true"><span class="family-mark family-mark--emblem"></span></div>' +
          '<dl class="a4-sheet__fields">' +
            '<div class="a4-sheet__row"><dt>Тип</dt><dd class="a4-sheet__name">Сводка дела</dd></div>' +
            '<div class="a4-sheet__row"><dt>Глава</dt><dd>' + FAMILY.meta.head + '</dd></div>' +
            '<div class="a4-sheet__row"><dt>Заместители</dt><dd>' + FAMILY.meta.deputies.join(', ') + '</dd></div>' +
          '</dl>' +
          '<div class="a4-sheet__stamp">СЕКРЕТНО</div>' +
          '<footer class="a4-sheet__foot">Материалы семьи · секретно</footer>' +
        '</div>';
    } else {
      el.setAttribute('aria-label', 'Дело ' + m.caseId + ', ' + m.name);
      el.innerHTML =
        '<div class="a4-sheet__clip" aria-hidden="true"></div>' +
        '<div class="a4-sheet__page">' +
          '<header class="a4-sheet__head">' +
            '<span class="a4-sheet__org">Оперотдел · VIPERR</span>' +
            '<span class="a4-sheet__case">Дело № ' + (m.caseId || '—') + '</span>' +
          '</header>' +
          '<h2 class="a4-sheet__doctype">Материалы розыска</h2>' +
          '<div class="a4-sheet__photo">' +
            '<div class="a4-sheet__photo-grid" aria-hidden="true"></div>' +
            '<span class="a4-sheet__initials"></span>' +
          '</div>' +
          '<dl class="a4-sheet__fields">' +
            '<div class="a4-sheet__row"><dt>ФИО</dt><dd class="a4-sheet__name"></dd></div>' +
            '<div class="a4-sheet__row"><dt>Статус</dt><dd class="a4-sheet__status"></dd></div>' +
            '<div class="a4-sheet__row"><dt>Примечание</dt><dd class="a4-sheet__role"></dd></div>' +
          '</dl>' +
          '<div class="a4-sheet__stamp"></div>' +
          '<footer class="a4-sheet__foot">Лист дела · секретно</footer>' +
        '</div>';

      const photo = el.querySelector('.a4-sheet__photo');
      if (m.photo) photo.style.backgroundImage = `url('${m.photo}')`;

      el.querySelector('.a4-sheet__initials').textContent = initials(m.name);
      el.querySelector('.a4-sheet__name').textContent = m.name;
      el.querySelector('.a4-sheet__status').textContent = statusLabel(m.status);
      el.querySelector('.a4-sheet__role').textContent = m.role || '—';
      el.querySelector('.a4-sheet__stamp').textContent = statusLabel(m.status);
    }

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick(node.id);
    });

    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick(node.id);
      }
    });

    return el;
  }

  function renderTree(nodesEl, linesEl, onClick) {
    const { nodes, links, zones, width, height } = buildLayout();

    linesEl.setAttribute('width', width);
    linesEl.setAttribute('height', height);
    linesEl.setAttribute('viewBox', `0 0 ${width} ${height}`);
    linesEl.innerHTML = '';

    zones.forEach((zone) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('class', 'branch-zone');
      rect.setAttribute('x', zone.x);
      rect.setAttribute('y', zone.y);
      rect.setAttribute('width', zone.w);
      rect.setAttribute('height', zone.h);
      linesEl.appendChild(rect);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('class', 'branch-zone__label');
      text.setAttribute('x', zone.x + zone.w / 2);
      text.setAttribute('y', zone.y + 18);
      text.textContent = zone.label;
      linesEl.appendChild(text);
    });

    links.forEach((l) => {
      if (!l.fromNode || !l.toNode) return;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const isCouple = l.type === 'couple';
      const isEx = l.type === 'ex-spouse';
      const isSibling = l.type === 'sibling';
      path.setAttribute(
        'class',
        'red-string' +
          (isCouple ? ' red-string--couple' : '') +
          (isEx ? ' red-string--ex' : '') +
          (isSibling ? ' red-string--sibling' : '') +
          (!isCouple && !isEx && !isSibling ? ' red-string--parent' : '')
      );

      if (isCouple || isEx || isSibling) {
        const f = clipPoint(l.fromNode);
        const t = clipPoint(l.toNode);
        path.setAttribute('d', stringPath(f.x, f.y, t.x, t.y, isEx ? 8 : isSibling ? 5 : 6));
      } else {
        const f = bottomPoint(l.fromNode);
        const t = clipPoint(l.toNode);
        path.setAttribute('d', parentStringPath(f.x, f.y, t.x, t.y));
      }

      linesEl.appendChild(path);
      const shadow = path.cloneNode();
      shadow.setAttribute('class', 'red-string red-string--shadow');
      linesEl.insertBefore(shadow, path);
    });

    nodesEl.innerHTML = '';
    nodes.forEach((n) => nodesEl.appendChild(createSheet(n, onClick || (() => {}))));

    return { width, height };
  }

  window.ViperTree = { renderTree, buildLayout, initials, statusLabel };
})();
