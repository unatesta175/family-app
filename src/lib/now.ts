/** The current time in epoch milliseconds. A function of its own so pages can ask for "now" in one place. */
export const nowMs = () => Date.now();
