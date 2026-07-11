(function () {
  'use strict';

  const FIRST_GENITIVE = {
    Майс: 'Майса',
    Найн: 'Найна',
    Кай: 'Кая',
    Крид: 'Крида',
    Энджел: 'Энджел',
    Вивьян: 'Вивьян',
    Михаил: 'Михаила',
    Мэдисон: 'Мэдисона',
    Медея: 'Медеи',
    Ян: 'Яна',
    Юни: 'Юни',
    Найт: 'Найта',
    Кид: 'Кида',
    Рина: 'Рины',
    Аврора: 'Авроры',
    Мия: 'Мии',
    Олли: 'Олли',
    Крисоль: 'Крисоль',
    Агарес: 'Агарес',
    Скади: 'Скади',
  };

  function nameGenitive(fullName) {
    const parts = fullName.trim().split(/\s+/);
    const first = FIRST_GENITIVE[parts[0]] || parts[0];
    const last = parts[1] === 'Вайпер' ? 'Вайпера' : (parts[1] || '');
    return last ? `${first} ${last}` : first;
  }

  function isFemale(member) {
    if (!member) return false;
    const role = member.role || '';
    if (/Сын/.test(role)) return false;
    if (member.isSpouse && role.includes('Супруга')) return true;
    return /Дочь|ница|Супруга|Жена/.test(role);
  }

  function childLabel(member) {
    return isFemale(member) ? 'дочь' : 'сын';
  }

  function spouseLabel(member) {
    return isFemale(member) ? 'супруга' : 'супруг';
  }

  function parentLabel(member) {
    return isFemale(member) ? 'мать' : 'отец';
  }

  function siblingLabel(member) {
    if (isFemale(member)) return 'сестра';
    return 'брат';
  }

  function describeLink(fromId, toId) {
    const from = FAMILY.members[fromId];
    const to = FAMILY.members[toId];
    if (!to) return '';
    if (!from) return to.name;

    const name = to.name;

    if (to.parent === fromId) {
      return `${name} (${childLabel(to)} ${nameGenitive(from.name)})`;
    }

    if (from.parent === toId) {
      return `${name} (${parentLabel(to)})`;
    }

    if (from.spouse === toId) {
      return `${name} (${spouseLabel(to)})`;
    }

    if (from.exSpouse === toId || to.exSpouse === fromId) {
      const ex = from.exSpouse === toId ? to : from;
      return `${name} (бывш${isFemale(ex) ? 'ая' : 'ий'} ${spouseLabel(ex)})`;
    }

    if (from.sibling === toId || to.sibling === fromId) {
      return `${name} (${siblingLabel(to)})`;
    }

    const childOfFrom = Object.values(FAMILY.members).find(
      (m) => m.parent === fromId && m.spouse === toId
    );
    if (childOfFrom) {
      return `${name} (${spouseLabel(to)} ${nameGenitive(childOfFrom.name)})`;
    }

    if (from.parent && from.parent === to.parent && fromId !== toId) {
      return `${name} (${siblingLabel(to)})`;
    }

    return name;
  }

  const SIBLING_ORDER = ['nain', 'kai', 'vivien', 'aurora', 'mia', 'olli'];

  function getChildren(id) {
    return Object.values(FAMILY.members)
      .filter((m) => m.parent === id)
      .map((m) => m.id);
  }

  function buildProfileLinks(viewerId) {
    const from = FAMILY.members[viewerId];
    if (!from) return [];

    const links = [];

    if (from.parent) links.push(from.parent);
    if (from.spouse) links.push(from.spouse);
    if (from.exSpouse) links.push(from.exSpouse);
    if (from.sibling) links.push(from.sibling);

    getChildren(viewerId).forEach((childId) => {
      links.push(childId);
      const child = FAMILY.members[childId];
      if (child && child.spouse) links.push(child.spouse);
    });

    if (from.parent) {
      const siblings = Object.values(FAMILY.members)
        .filter((p) => p.parent === from.parent && p.id !== viewerId)
        .map((p) => p.id);

      const ordered = [];
      SIBLING_ORDER.forEach((id) => {
        if (siblings.includes(id)) ordered.push(id);
      });
      siblings.forEach((id) => {
        if (!ordered.includes(id)) ordered.push(id);
      });
      links.push(...ordered);
    }

    return links;
  }

  function statusLabel(status) {
    if (status === 'задержан') return 'ЗАДЕРЖАН';
    if (status === 'скрывается') return 'СКРЫВАЕТСЯ';
    if (status === 'секретно') return 'СЕКРЕТНО';
    if (status === 'не в розыске') return 'НЕ В РОЗЫСКЕ';
    if (status === 'местонахождение неизвестно') return 'НЕИЗВЕСТНО';
    return 'РАЗЫСКИВАЕТСЯ';
  }

  function threadLabel(fromId, toId) {
    const from = FAMILY.members[fromId];
    const to = FAMILY.members[toId];
    if (!from || !to) return '';

    if (to.parent === fromId) {
      return childLabel(to) + ' ' + nameGenitive(from.name);
    }

    if (from.spouse === toId || to.spouse === fromId) {
      return spouseLabel(to.isSpouse ? to : from);
    }

    return '';
  }

  function appendThreadTag(svg, x, y, text, rotateDeg) {
    if (!text) return;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'thread-tag');
    g.setAttribute('transform', `translate(${x} ${y}) rotate(${rotateDeg || 0})`);

    const w = Math.max(44, text.length * 5.8 + 14);
    const h = 17;

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('class', 'thread-tag__bg');
    rect.setAttribute('x', (-w / 2).toFixed(1));
    rect.setAttribute('y', (-h / 2).toFixed(1));
    rect.setAttribute('width', w.toFixed(1));
    rect.setAttribute('height', h);
    rect.setAttribute('rx', 2);

    const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textEl.setAttribute('class', 'thread-tag__text');
    textEl.setAttribute('text-anchor', 'middle');
    textEl.setAttribute('dy', '0.35em');
    textEl.textContent = text;

    g.appendChild(rect);
    g.appendChild(textEl);
    svg.appendChild(g);
  }

  window.ViperRelations = {
    describeLink,
    nameGenitive,
    threadLabel,
    appendThreadTag,
    getChildren,
    buildProfileLinks,
    statusLabel,
  };
})();
