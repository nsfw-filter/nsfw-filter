export const HIDE_STYLE_ID = 'nsfw-filter-pending-hide'

// Each shadow tree has its own style scope. Keep these rules identical in every
// root; a document stylesheet cannot protect media inside a web component.
// BackgroundImageFilter visits HTML elements, so its pending rules must too.
export const PENDING_HIDE_RULES = `
    @namespace html "http://www.w3.org/1999/xhtml";
    @layer nsfw-filter {
      img:not([data-nsfw-filter-status]),
      video:not([data-nsfw-filter-status]),
      canvas:not([data-nsfw-filter-status]),
      svg image:not([data-nsfw-filter-status]) {
        visibility: var(--nsfw-filter-pending-visibility, visible) !important;
      }
      /* The document root has no parent to query; its stylesheet is removed on pause. */
      html|*:root:not([data-nsfw-filter-background-status]),
      html|*:root:not([data-nsfw-filter-before-status])::before,
      html|*:root:not([data-nsfw-filter-after-status])::after {
        background-image: none !important;
      }
      /* Disable the rule entirely so an inactive shadow guard preserves page styles. */
      @container style(--nsfw-filter-pending-background: none) {
        html|*:not([data-nsfw-filter-background-status]),
        html|*:not([data-nsfw-filter-before-status])::before,
        html|*:not([data-nsfw-filter-after-status])::after {
          background-image: none !important;
        }
      }
      [data-nsfw-filter-before-hidden]::before,
      [data-nsfw-filter-after-hidden]::after {
        background-image: none !important;
        visibility: hidden !important;
      }
    }
  `

export const injectPendingHide = (root: Document | ShadowRoot): void => {
  if (root.querySelector(`#${HIDE_STYLE_ID}`) !== null) return
  const style = document.createElement('style')
  style.id = HIDE_STYLE_ID
  // The inherited switch also reaches detached shadow roots when they are added
  // later. Removing the document rule disables their pending hide too.
  style.textContent = root instanceof Document
    ? `${PENDING_HIDE_RULES}
      :root {
        --nsfw-filter-pending-visibility: hidden;
        --nsfw-filter-pending-background: none;
      }`
    : PENDING_HIDE_RULES
  if (root instanceof Document) root.documentElement.prepend(style)
  else root.prepend(style)
}
