// Set DEBUG to true to start logging in the console
export const DEBUG = true

if (!DEBUG) {
  console.log = () => {}
}
