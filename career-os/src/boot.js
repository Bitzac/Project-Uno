// ---------- boot ----------
bind();
// Deep links: #pitch opens a fundraising view, #product/metrics a product view.
{ const h = location.hash.slice(1), [a, b] = h.split('/');
  if (/^(overview|rounds|sources|pitch|process|progress)$/.test(h)) { S.mod = 'fund'; S.tab = h; }
  else if (a === 'product') { S.mod = 'product'; if (/^(overview|route|launch|metrics|audit)$/.test(b || '')) S.ptab = b; } }
render();
connect();
