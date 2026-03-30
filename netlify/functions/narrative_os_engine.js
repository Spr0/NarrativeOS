// ADD THIS FUNCTION

function buildTrace(resume, requirements) {
  const trace = {};

  const bullets = (resume.roles || []).flatMap((r, ri) =>
    (r.bullets || []).map((b, bi) => ({
      text: normalizeText(b),
      roleIndex: ri,
      bulletIndex: bi
    }))
  );

  for (let req of requirements) {
    const r = normalizeText(req);

    trace[req] = {
      matched: [],
      partial: []
    };

    bullets.forEach(b => {
      if (b.text.includes(r)) {
        trace[req].matched.push(b);
      } else if (isWeakMatch(r, b.text)) {
        trace[req].partial.push(b);
      }
    });
  }

  return trace;
}
