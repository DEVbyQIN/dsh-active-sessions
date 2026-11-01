// dsh-active-sessions — host half.
//
// Intentionally inert. Every behaviour of this plugin lives in the browser
// half, lib/client.js.
//
// Why a host half exists at all: the DSH client-modules scanner only publishes
// a browser bundle for packages that are *enabled Loader entries*
// (cordis.patch.yml). There is no client-only plugin.

const name = 'active-sessions'
const inject = []

/**
 * Report that the host half is composed; the browser half does the work.
 * @param ctx Host plugin context.
 */
function apply(ctx) {
  ctx.logger?.info('dsh-active-sessions: host half is inert; lib/client.js provides the UI')
}

export { apply, inject, name }
