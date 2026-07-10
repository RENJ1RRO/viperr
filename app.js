(function () {
  'use strict';

  const viewport = document.getElementById('treeViewport');
  const stage = document.getElementById('treeStage');
  const nodesEl = document.getElementById('treeNodes');
  const linesEl = document.getElementById('treeLines');

  const overlay = document.getElementById('profileOverlay');
  const panel = document.getElementById('profilePanel');
  const profileHero = document.getElementById('profileHero');
  const profileInitials = document.getElementById('profileInitials');
  const profileCase = document.getElementById('profileCase');
  const profileStamp = document.getElementById('profileStamp');
  const profileGen = document.getElementById('profileGen');
  const profileName = document.getElementById('profileName');
  const profileRole = document.getElementById('profileRole');
  const profileMeta = document.getElementById('profileMeta');
  const profileStory = document.getElementById('profileStory');
  const profileDate = document.getElementById('profileDate');

  let scale = 1;
  let panX = 0;
  let panY = 0;
  let activeId = null;

  function applyTransform() {
    stage.style.transform = `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) scale(${scale})`;
  }

  function setActiveSheet(id) {
    activeId = id;
    document.querySelectorAll('.a4-sheet').forEach((el) => {
      el.classList.toggle('is-active', el.dataset.id === id);
    });
  }

  function clearActiveSheet() {
    activeId = null;
    document.querySelectorAll('.a4-sheet').forEach((el) => el.classList.remove('is-active'));
  }

  function metaRow(label, value, linkId) {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    if (linkId) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'a4-full__link';
      btn.textContent = value;
      btn.addEventListener('click', () => openProfile(linkId));
      dd.appendChild(btn);
    } else {
      dd.textContent = value;
    }
    profileMeta.appendChild(dt);
    profileMeta.appendChild(dd);
  }

  function getChildren(id) {
    return ViperRelations.getChildren(id);
  }

  function addRelationRows(viewerId, targetIds) {
    const shown = new Set();
    targetIds.forEach((targetId) => {
      if (!targetId || shown.has(targetId) || targetId === viewerId) return;
      shown.add(targetId);
      metaRow('Связан с', ViperRelations.describeLink(viewerId, targetId), targetId);
    });
  }

  function openProfile(id) {
    if (id === 'lore') {
      openLoreProfile();
      return;
    }

    const m = FAMILY.members[id];
    if (!m) return;

    setActiveSheet(id);

    const stamp = ViperRelations.statusLabel(m.status);
    profileCase.textContent = 'Дело № ' + (m.caseId || '—');
    profileStamp.textContent = stamp;
    profileStamp.classList.toggle('is-captured', m.status === 'задержан');
    profileGen.textContent =
      m.generation + ' поколение · ' + (FAMILY.branchLabels[m.branch] || '');
    profileName.textContent = m.name;
    profileRole.textContent = m.role || '—';
    profileDate.textContent = new Date().toLocaleDateString('ru-RU');
    document.getElementById('a4Full').classList.remove('is-lore');

    if (m.photo) {
      profileHero.style.backgroundImage = `url('${m.photo}')`;
      profileHero.classList.add('has-photo');
      profileInitials.textContent = '';
    } else {
      profileHero.style.backgroundImage = '';
      profileHero.classList.remove('has-photo');
      profileInitials.textContent = ViperTree.initials(m.name);
    }

    profileMeta.innerHTML = '';
    metaRow(m.isOutsider ? 'Статус' : 'Статус розыска', stamp);

    if (m.deed) metaRow('Статья / дело', m.deed);

    addRelationRows(id, ViperRelations.buildProfileLinks(id));

    profileStory.innerHTML = m.story
      ? m.story.split('\n\n').map((p) => `<p>${p}</p>`).join('')
      : '<p class="a4-full__empty">Материалы дела будут добавлены позже.</p>';

    overlay.hidden = false;
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('profile-open');
  }

  function openLoreProfile() {
    const lore = FAMILY.loreSheet;

    setActiveSheet('lore');
    document.getElementById('a4Full').classList.add('is-lore');

    profileCase.textContent = 'Дело № ' + (lore.caseId || '—');
    profileStamp.textContent = 'СЕКРЕТНО';
    profileStamp.classList.remove('is-captured');
    profileGen.textContent = lore.subtitle || '';
    profileName.textContent = lore.name;
    profileRole.textContent = lore.role || '—';
    profileDate.textContent = new Date().toLocaleDateString('ru-RU');

    profileHero.style.backgroundImage = '';
    profileHero.classList.remove('has-photo');
    profileInitials.textContent = 'VIPERR';

    profileMeta.innerHTML = '';
    metaRow('Глава семьи', FAMILY.meta.head);
    metaRow('Заместители', FAMILY.meta.deputies.join(', '));
    metaRow('Юрисдикция', FAMILY.meta.jurisdiction);
    metaRow('Семейный знак', FAMILY.meta.familyGimmick);

    profileStory.innerHTML = lore.story
      ? lore.story.split('\n\n').map((p) => `<p>${p}</p>`).join('')
      : '';

    overlay.hidden = false;
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('profile-open');
  }

  function closeProfile() {
    overlay.hidden = true;
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('profile-open');
    document.getElementById('a4Full').classList.remove('is-lore');
    clearActiveSheet();
  }

  function fitTree() {
    const dims = ViperTree.renderTree(nodesEl, linesEl, openProfile);
    stage.style.width = dims.width + 'px';
    stage.style.height = dims.height + 'px';
    if (activeId) setActiveSheet(activeId);

    scale = Math.min(
      (viewport.clientWidth - 40) / dims.width,
      (viewport.clientHeight - 80) / dims.height,
      0.95
    );
    if (!panel.classList.contains('is-open')) {
      panX = 0;
      panY = 30;
    }
    applyTransform();
  }

  document.getElementById('zoomIn').addEventListener('click', () => {
    scale = Math.min(scale * 1.15, 2);
    applyTransform();
  });

  document.getElementById('zoomOut').addEventListener('click', () => {
    scale = Math.max(scale / 1.15, 0.2);
    applyTransform();
  });

  document.getElementById('resetView').addEventListener('click', fitTree);
  document.getElementById('profileClose').addEventListener('click', closeProfile);
  overlay.addEventListener('click', closeProfile);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeProfile();
  });

  let dragging = false;
  let sx, sy, spx, spy;

  viewport.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.a4-sheet')) return;
    dragging = true;
    sx = e.clientX;
    sy = e.clientY;
    spx = panX;
    spy = panY;
    stage.classList.add('no-transition');
    viewport.classList.add('is-dragging');
    viewport.setPointerCapture(e.pointerId);
  });

  viewport.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    panX = spx + (e.clientX - sx);
    panY = spy + (e.clientY - sy);
    applyTransform();
  });

  viewport.addEventListener('pointerup', () => {
    dragging = false;
    stage.classList.remove('no-transition');
    viewport.classList.remove('is-dragging');
  });

  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    scale = Math.max(0.2, Math.min(2, scale * (e.deltaY > 0 ? 0.93 : 1.07)));
    applyTransform();
  }, { passive: false });

  window.addEventListener('resize', fitTree);
  fitTree();
})();
