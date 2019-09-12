module.exports = async (timeout = 10000) => {
  return new Promise(resolve => {
    setTimeout(resolve, timeout).unref();
  });
}
