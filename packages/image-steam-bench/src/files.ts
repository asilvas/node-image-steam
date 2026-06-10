export const byIndex = ['12mp.jpeg', '18mp.jpeg', '24mp.jpeg'];

export const byKeys = byIndex.reduce(
  (state: Record<string, number>, fn, idx) => {
    state[fn] = idx;
    return state;
  },
  {}
);

export default { byKeys, byIndex };
