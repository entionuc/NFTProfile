const invert = (p) => new Promise((res, rej) => p.then(rej, res));
const firstOf = (ps) => invert(Promise.all(ps.map(invert)));

exports.firstOf = firstOf;
