// webpack replaces `process.env.NODE_ENV` at build time (set from `mode`). This
// declares just that shape so we don't pull all of @types/node into browser code.
declare const process: { env: { NODE_ENV?: string } }
