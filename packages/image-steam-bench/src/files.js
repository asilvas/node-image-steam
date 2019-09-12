const byIndex = ['12mp.jpeg', '18mp.jpeg', '24mp.jpeg'];
const byKeys = byIndex.reduce((state, fn, idx) => {
  state[fn] = idx;
  return state;
}, {});

module.exports = {
  byKeys,
  byIndex
}
