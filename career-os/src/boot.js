// ---------- boot ----------
bind();
if (/^#(overview|rounds|sources|pitch|process|progress)$/.test(location.hash)) S.tab = location.hash.slice(1);
render();
connect();
