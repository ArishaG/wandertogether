export type BoardRect = { left: number; right: number; top: number; bottom: number };
type Point = { x: number; y: number };

// Route through the free corridors around every widget. Geometry comes from
// the rendered grid, so zoom, resizing, and viewport width use the same units.
export function connectionRoute(from: BoardRect, to: BoardRect, obstacles: BoardRect[]): Point[] {
  const rightward = (to.left + to.right) >= (from.left + from.right);
  const start = { x: rightward ? from.right : from.left, y: (from.top + from.bottom) / 2 };
  const end = { x: rightward ? to.left : to.right, y: (to.top + to.bottom) / 2 };
  const a = { x: start.x + (rightward ? 6 : -6), y: start.y };
  const b = { x: end.x + (rightward ? -6 : 6), y: end.y };
  const boxes = obstacles.map(r => ({ left: r.left - 2, right: r.right + 2, top: r.top - 2, bottom: r.bottom + 2 }));
  const xs = [...new Set([a.x, b.x, ...boxes.flatMap(r => [r.left - 3, r.right + 3])])].sort((x, y) => x - y);
  const ys = [...new Set([a.y, b.y, ...boxes.flatMap(r => [r.top - 3, r.bottom + 3])])].sort((x, y) => x - y);
  const key = (p: Point) => `${p.x},${p.y}`;
  const crosses = (p: Point, q: Point) => boxes.some(r => p.y === q.y
    ? p.y > r.top && p.y < r.bottom && Math.max(p.x, q.x) > r.left && Math.min(p.x, q.x) < r.right
    : p.x > r.left && p.x < r.right && Math.max(p.y, q.y) > r.top && Math.min(p.y, q.y) < r.bottom);
  const queue = [a];
  const parents = new Map<string, Point | null>([[key(a), null]]);
  while (queue.length) {
    const p = queue.shift()!;
    if (key(p) === key(b)) {
      const path: Point[] = [end];
      let cursor: Point | null = p;
      while (cursor) { path.push(cursor); cursor = parents.get(key(cursor)) ?? null; }
      return [start, ...path.reverse()];
    }
    const xi = xs.indexOf(p.x), yi = ys.indexOf(p.y);
    const neighbors = [xs[xi - 1] === undefined ? null : { x: xs[xi - 1], y: p.y }, xs[xi + 1] === undefined ? null : { x: xs[xi + 1], y: p.y }, ys[yi - 1] === undefined ? null : { x: p.x, y: ys[yi - 1] }, ys[yi + 1] === undefined ? null : { x: p.x, y: ys[yi + 1] }];
    for (const q of neighbors) if (q && !parents.has(key(q)) && !crosses(p, q)) { parents.set(key(q), p); queue.push(q); }
  }
  return [];
}
