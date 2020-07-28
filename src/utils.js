export const getMemory = () => {
  console.log(window.performance.memory)
  setTimeout(() => { getMemory() }, 7000);
}

export const isValidHttpUrl = (string) => {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_err) {
    return false;
  }
}
