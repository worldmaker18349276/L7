"use strict";

function modifiersOf(event) {
  return (!!event.altKey) * 1 + (!!event.shiftKey) * 2 + (!!event.ctrlKey) * 4 + (!!event.metaKey) * 8;
}

function makeShifter(expr, unit="px") {
  let shift = String.raw`(-?\d+(?:.\d+)?)${unit}`;
  let shifted = String.raw`(.+) \+ ${shift}`;
  let shift_regex = new RegExp("^" + shift + "$");
  let shifted_regex = new RegExp("^" + shifted + "$");

  let res;
  if ( res = shift_regex.exec(expr) ) {
    let shift_value = parseFloat(res[1]);
    return value => `${shift_value+value}${unit}`;
  }
  if ( res = shifted_regex.exec(expr) ) {
    let origin_value = res[1];
    let shift_value = parseFloat(res[2]);
    return value => `${origin_value} + ${shift_value+value}${unit}`;
  }
  return value => `${expr} + ${value}${unit}`;
}


const template_box = document.createElement("template");
template_box.innerHTML = `
<style>
:host {
  position: absolute;
  left:   var(--left);
  top:    var(--top);
  width:  var(--width);
  height: var(--height);

  background: var(--bgColor);
  pointer-events: none;
  z-index: 4;
}
:host(:hover) {
  z-index: 5;
}
:host([slot="bottom"]), :host([slot="right"]) {
  left: var(--x);
  top:  var(--y);
}
:host([slot="top"]), :host([slot="left"]) {
  left: calc(var(--x) - var(--width));
  top:  calc(var(--y) - var(--height));
}

.handle {
  pointer-events: auto;

  /* outline: 2px solid yellow; */
  /* outline-offset: -1px; */
}
.handle.interior {
  position: absolute;
  top: var(--hoverRadius);
  left: var(--hoverRadius);
  right: var(--hoverRadius);
  bottom: var(--hoverRadius);
  cursor: move;
  z-index: 3;
}
.handle.corner {
  position: absolute;
  height: calc(2 * var(--hoverRadius));
  width:  calc(2 * var(--hoverRadius));
  z-index: 3;

  ---r: calc(-1 * var(--hoverRadius));
}
.shadow.corner {
  display: none;
  position: absolute;
  height: calc(2 * (var(--dotRadius) + var(--shadowRadius)));
  width:  calc(2 * (var(--dotRadius) + var(--shadowRadius)));
  background: content-box var(--shadowColor);
  pointer-events: none;
  z-index: 1;

  ---r: calc(-1 * (var(--dotRadius) + var(--shadowRadius)));
}
.dot.corner {
  display: none;
  position: absolute;
  height: calc(2 * var(--dotRadius));
  width:  calc(2 * var(--dotRadius));
  background: content-box var(--frameColor);
  pointer-events: none;
  z-index: 2;

  ---r: calc(-1 * var(--dotRadius));
}
.corner.top {
  top: var(---r);
}
.corner.left {
  left: var(---r);
}
.corner.right {
  right: var(---r);
}
.corner.bottom {
  bottom: var(---r);
}
.handle.corner.top.left {
  cursor: nw-resize;
}
.handle.corner.top.right {
  cursor: ne-resize;
}
.handle.corner.bottom.left {
  cursor: sw-resize;
}
.handle.corner.bottom.right {
  cursor: se-resize;
}

::slotted([slot]) {
  --frameColor: var(--strokeColor);
}
:host(:hover) ::slotted([slot]) {
  --frameColor: var(--hoverColor);
}

::slotted(*) {
  --clip-top: 0;
  --clip-left: 0;
  --clip-right: 0;
  --clip-bottom: 0;
}
:host([slot="bottom"]:not(:hover)) ::slotted([slot="left"]),
:host([slot="bottom"]:not(:hover)) ::slotted([slot="right"]),
:host([slot="right"]:not(:hover)) ::slotted([slot="left"]),
:host([slot="left"]:not(:hover)) ::slotted([slot="right"]) {
  --clip-top: 1;
}
:host([slot="right"]:not(:hover)) ::slotted([slot="top"]),
:host([slot="right"]:not(:hover)) ::slotted([slot="bottom"]),
:host([slot="bottom"]:not(:hover)) ::slotted([slot="top"]),
:host([slot="top"]:not(:hover)) ::slotted([slot="bottom"]) {
  --clip-left: 1;
}
:host([slot="left"]:not(:hover)) ::slotted([slot="top"]),
:host([slot="left"]:not(:hover)) ::slotted([slot="bottom"]),
:host([slot="bottom"]:not(:hover)) ::slotted([slot="top"]),
:host([slot="top"]:not(:hover)) ::slotted([slot="bottom"]) {
  --clip-right: 1;
}
:host([slot="top"]:not(:hover)) ::slotted([slot="left"]),
:host([slot="top"]:not(:hover)) ::slotted([slot="right"]),
:host([slot="right"]:not(:hover)) ::slotted([slot="left"]),
:host([slot="left"]:not(:hover)) ::slotted([slot="right"]) {
  --clip-bottom: 1;
}

:host([slot="top"])  .handle.corner.end,
:host([slot="left"]) .handle.corner.end,
:host([slot="bottom"]) .handle.corner.start,
:host([slot="right"])  .handle.corner.start {
  cursor: pointer;
}
:host([slot="top"])  .dot.corner.end,
:host([slot="left"]) .dot.corner.end,
:host([slot="bottom"]) .dot.corner.start,
:host([slot="right"])  .dot.corner.start {
  display: block;
}
:host([slot="top"]:hover)  .shadow.corner.end,
:host([slot="left"]:hover) .shadow.corner.end,
:host([slot="bottom"]:hover) .shadow.corner.start,
:host([slot="right"]:hover)  .shadow.corner.start {
  display: block;
}
:host([slot="top"])  .handle.corner.end:hover ~ .dot.corner.end,
:host([slot="left"]) .handle.corner.end:hover ~ .dot.corner.end,
:host([slot="bottom"]) .handle.corner.start:hover ~ .dot.corner.start,
:host([slot="right"])  .handle.corner.start:hover ~ .dot.corner.start {
  --frameColor: var(--focusColor);
}
</style>

<div class="handle interior top left right bottom"></div>
<div class="handle corner top left start"></div>
<div class="handle corner top right"></div>
<div class="handle corner bottom left"></div>
<div class="handle corner bottom right end"></div>
<slot name="top"></slot>
<slot name="left"></slot>
<slot name="right"></slot>
<slot name="bottom"></slot>
<div class="shadow corner top left start"></div>
<div class="dot corner top left start"></div>
<div class="shadow corner bottom right end"></div>
<div class="dot corner bottom right end"></div>
<slot></slot>
`;
customElements.define("l7-box", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.appendChild(template_box.content.cloneNode(true));

    this.onresizestart = this.onresizestart.bind(this);
    this.onresize = this.onresize.bind(this);
    this.onresizecancel = this.onresizecancel.bind(this);
    this.onresizeend = this.onresizeend.bind(this);
  }
  static get observedAttributes() {
    return ["rect"];
  }
  connectedCallback() {
    this._observer = new MutationObserver(mutations => {
      for ( let side of ["top", "bottom", "right", "left"] )
        for ( let [i, border] of this.querySelectorAll(`:scope > l7-border[slot="${side}"]`).entries() )
          border.style.setProperty("--i", i);
    });
    this._observer.observe(this, {childList: true});

    this.shadowRoot.addEventListener("pointerdown", this.onresizestart);
    this.shadowRoot.addEventListener("pointermove", this.onresize);
    this.shadowRoot.addEventListener("pointercancel", this.onresizecancel);
    this.shadowRoot.addEventListener("pointerup", this.onresizeend);
  }
  disconnectedCallback() {
    this._observer.disconnect();
    this.shadowRoot.removeEventListener("pointerdown", this.onresizestart);
    this.shadowRoot.removeEventListener("pointermove", this.onresize);
    this.shadowRoot.removeEventListener("pointercancel", this.onresizecancel);
    this.shadowRoot.removeEventListener("pointerup", this.onresizeend);
  }
  attributeChangedCallback(name, old, value) {
    if ( old !== value ) {
      if ( name === "rect" ) {
        let {left, top, width, height} = this.rect;
        this.style.setProperty("--left"  , `calc(${left})`);
        this.style.setProperty("--top"   , `calc(${top})`);
        this.style.setProperty("--width" , `calc(${width})`);
        this.style.setProperty("--height", `calc(${height})`);
      }
    }
  }

  get rect() {
    let [left, top, width, height] = this.getAttribute("rect").split(/\s*;\s*/);
    return {left, top, width, height};
  }
  set rect({left, top, width, height}) {
    this.setAttribute("rect", [left, top, width, height].join(";"));
  }

  onresizestart(event) {
    if ( event.buttons === 1
         && modifiersOf(event) === 0
         && event.target.matches(":host(:not([slot])) > .handle,\
         :host([slot='top']) > .handle:not(.interior):not(.end),\
         :host([slot='left']) > .handle:not(.interior):not(.end),\
         :host([slot='bottom']) > .handle:not(.interior):not(.start),\
         :host([slot='right']) > .handle:not(.interior):not(.start)") ) {
      event.stopPropagation();
      event.target.setPointerCapture(event.pointerId);
      this.classList.add("resizing");

      let {width:parentWidth, height:parentHeight} = getComputedStyle(this.offsetParent);
      this._parentWidth = parseFloat(parentWidth);
      this._parentHeight = parseFloat(parentHeight);
      let {left, top, width, height} = this.rect;
      this._original_rect = {left, top, width, height};

      this._x0 = this._x = event.pageX;
      this._y0 = this._y = event.pageY;

      this._rect_shifter = {
        left: ()=>left,
        top: ()=>top,
        width: ()=>width,
        height: ()=>height,
      };
      let left_shifter = makeShifter(left, "%");
      let width_shifter = makeShifter(width, "%");
      let top_shifter = makeShifter(top, "%");
      let height_shifter = makeShifter(height, "%");
      if ( !this.slot ) {
        if ( event.target.matches(".left") )
          this._rect_shifter.left = left_shifter;
        if ( event.target.matches(".right:not(.left)") )
          this._rect_shifter.width = width_shifter;
        if ( event.target.matches(".left:not(.right)") )
          this._rect_shifter.width = value => width_shifter(-value);
        if ( event.target.matches(".top") )
          this._rect_shifter.top = top_shifter;
        if ( event.target.matches(".bottom:not(.top)") )
          this._rect_shifter.height = height_shifter;
        if ( event.target.matches(".top:not(.bottom)") )
          this._rect_shifter.height = value => height_shifter(-value);

      } else if ( this.slot === "top" || this.slot === "left" ) {
        if ( event.target.matches(".left") ) {
          this._rect_shifter.left = left_shifter;
          this._rect_shifter.width = value => width_shifter(-value);
        }
        if ( event.target.matches(".top") ) {
          this._rect_shifter.top = top_shifter;
          this._rect_shifter.height = value => height_shifter(-value);
        }

      } else if ( this.slot === "bottom" || this.slot === "right" ) {
        if ( event.target.matches(".right") )
          this._rect_shifter.width = width_shifter;
        if ( event.target.matches(".bottom") )
          this._rect_shifter.height = height_shifter;
      }

    }
  }
  onresize(event) {
    if ( event.target.hasPointerCapture(event.pointerId) && this.matches(".resizing") ) {
      this._x = event.pageX;
      this._y = event.pageY;

      let shiftX = 100*(this._x - this._x0)/this._parentWidth;
      let shiftY = 100*(this._y - this._y0)/this._parentHeight;

      let left = this._rect_shifter.left(shiftX);
      let width = this._rect_shifter.width(shiftX);
      let top = this._rect_shifter.top(shiftY);
      let height = this._rect_shifter.height(shiftY);
      this.rect = {left, top, width, height};
    }
  }
  onresizecancel(event) {
    this.rect = this._original_rect;
    event.target.releasePointerCapture(event.pointerId);
    this.classList.remove("resizing");
  }
  onresizeend(event) {
    event.target.releasePointerCapture(event.pointerId);
    this.classList.remove("resizing");
  }
});

const template_border = document.createElement("template");
template_border.innerHTML = `
<style>
:host {
  --shift: calc(2 * var(--i, 0) * var(--hoverRadius));

  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: auto;
}
:host(:hover) {
  z-index: 5;
}

.shadow {
  box-sizing: border-box;
  --r: calc(var(--lineRadius) + var(--shadowRadius));
  background: content-box var(--shadowColor);
  pointer-events: none;
  z-index: 1;

  --c: calc(2 * var(--lineRadius) + var(--shadowRadius));
  padding-top:    calc(var(--clip-top, 0) * var(--c));
  padding-left:   calc(var(--clip-left, 0) * var(--c));
  padding-right:  calc(var(--clip-right, 0) * var(--c));
  padding-bottom: calc(var(--clip-bottom, 0) * var(--c));
}
.line {
  --r: var(--lineRadius);
  background: content-box var(--frameColor);
  pointer-events: none;
  z-index: 2;
}
.handle {
  --r: var(--hoverRadius);
  pointer-events: auto;
  z-index: 3;

  /* outline: 1px dashed red; */
  /* outline-offset: -1px; */
}
.handle:hover ~ .line, .handle:hover ~ ::slotted(*) {
  --frameColor: var(--focusColor);
}

.part {
  position: absolute;

  ---r: calc(-1 * var(--r));
  --s: calc(var(--shift) - var(--r));
  --w: calc(2 * var(--r));
}
.part.handle {
  ---r: var(--r);
}
:host([slot="top"]) .part {
  left:   var(---r);
  right:  var(---r);
  top:    var(--s);
  height: var(--w);
  cursor: n-resize;
}
:host([slot="bottom"]) .part {
  left:   var(---r);
  right:  var(---r);
  bottom: var(--s);
  height: var(--w);
  cursor: s-resize;
}
:host([slot="left"]) .part {
  top:    var(---r);
  bottom: var(---r);
  left:   var(--s);
  width:  var(--w);
  cursor: w-resize;
}
:host([slot="right"]) .part {
  top:    var(---r);
  bottom: var(---r);
  right:  var(--s);
  width:  var(--w);
  cursor: e-resize;
}

:host([slot="top"]) ::slotted(*) {
  --x: var(--offset);
  --y: var(--shift);
}
:host([slot="bottom"]) ::slotted(*) {
  --x: var(--offset);
  --y: calc(100% - var(--shift));
}
:host([slot="left"]) ::slotted(*) {
  --x: var(--shift);
  --y: var(--offset);
}
:host([slot="right"]) ::slotted(*) {
  --x: calc(100% - var(--shift));
  --y: var(--offset);
}
</style>

<div class="part handle"></div>
<div class="part shadow"></div>
<div class="part line"></div>
<slot></slot>
`;
customElements.define("l7-border", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.appendChild(template_border.content.cloneNode(true));
  }
  static get observedAttributes() {
    return ["name"];
  }
  attributeChangedCallback(name, old, value) {
    if ( old !== value ) {
      if ( name === "name" ) {
        this.shadowRoot.querySelector(".handle").title = this.getAttribute("name");
      }
    }
  }
});

const template_port = document.createElement("template");
template_port.innerHTML = `
<style>
:host {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: auto;
}
:host(:hover) {
  z-index: 5;
}

.shadow {
  --r: calc(var(--dotRadius) + var(--shadowRadius));
  background: content-box var(--shadowColor);
  pointer-events: none;
  z-index: 1;
}
.dot {
  --r: var(--dotRadius);
  background: content-box var(--frameColor);
  pointer-events: none;
  z-index: 2;
}
.handle {
  --r: var(--hoverRadius);
  cursor: pointer;
  pointer-events: auto;
  z-index: 3;

  /* outline: 1px dashed blue; */
  /* outline-offset: -1px; */
}
.handle:hover ~ .dot, .handle:hover ~ ::slotted(*) {
  --frameColor: var(--focusColor);
}

.part {
  position: absolute;

  left: calc(var(--x) - var(--r));
  top: calc(var(--y) - var(--r));
  width: calc(2 * var(--r));
  height: calc(2 * var(--r));
}
</style>

<div class="part handle"></div>
<div class="part shadow"></div>
<div class="part dot"></div>
<slot name="top"></slot>
<slot name="left"></slot>
<slot name="right"></slot>
<slot name="bottom"></slot>
`;
customElements.define("l7-port", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.appendChild(template_port.content.cloneNode(true));

    this.onmovestart = this.onmovestart.bind(this);
    this.onmove = this.onmove.bind(this);
    this.onmovecancel = this.onmovecancel.bind(this);
    this.onmoveend = this.onmoveend.bind(this);
  }
  static get observedAttributes() {
    return ["offset", "name"];
  }
  connectedCallback() {
    this.shadowRoot.addEventListener("pointerdown", this.onmovestart);
    this.shadowRoot.addEventListener("pointermove", this.onmove);
    this.shadowRoot.addEventListener("pointercancel", this.onmovecancel);
    this.shadowRoot.addEventListener("pointerup", this.onmoveend);
  }
  disconnectedCallback() {
    this._move_handler.unregister();
  }
  attributeChangedCallback(name, old, value) {
    if ( old !== value ) {
      if ( name === "offset" ) {
        this.style.setProperty("--offset", `calc(clamp(0%, ${this.offset}, 100%))`);
      }
      if ( name === "name" ) {
        this.shadowRoot.querySelector(".handle").title = this.getAttribute("name");
      }
    }
  }

  get offset() {
    return this.getAttribute("offset");
  }
  set offset(offset) {
    this.setAttribute("offset", offset);
  }

  onmovestart(event) {
    if ( event.buttons === 1
         && modifiersOf(event) === 0
         && event.target.matches(".handle, l7-box") ) {
      event.stopPropagation();
      event.target.setPointerCapture(event.pointerId);
      this.classList.add("moving");

      let {width:parentWidth, height:parentHeight} = getComputedStyle(this);
      parentWidth = parseFloat(parentWidth);
      parentHeight = parseFloat(parentHeight);
      this._parentWidth = parentWidth;
      this._parentHeight = parentHeight;
      this._original_offset = this.offset;

      this._x0 = this._x = event.pageX;
      this._y0 = this._y = event.pageY;

      let offset_shifter = makeShifter(this.offset, "%");

      if ( this.matches("[slot='top'] > *, [slot='bottom'] > *") )
        this._offset_shifter = (shiftX, shiftY) => offset_shifter(shiftX);
      if ( this.matches("[slot='left'] > *, [slot='right'] > *") )
        this._offset_shifter = (shiftX, shiftY) => offset_shifter(shiftY);
    }
  }
  onmove(event) {
    if ( event.target.hasPointerCapture(event.pointerId) && this.matches(".moving") ) {
      this._x = event.pageX;
      this._y = event.pageY;

      let shiftX = 100*(this._x - this._x0)/this._parentWidth;
      let shiftY = 100*(this._y - this._y0)/this._parentHeight;
      this.offset = this._offset_shifter(shiftX, shiftY);
    }
  }
  onmovecancel(event) {
    this.offset = this._original_offset;
    event.target.releasePointerCapture(event.pointerId);
    this.classList.remove("moving");
  }
  onmoveend(event) {
    event.target.releasePointerCapture(event.pointerId);
    this.classList.remove("moving");
  }
});

const template_wire = document.createElement("template");
template_wire.innerHTML = `
<style>
:host {
  --startX: var(--x);
  --startY: var(--y);
  z-index: 5;
}
.seg {
  --length: initial;
  z-index: inherit;
}
.seg::before {
  content: "";
  display: block;
  position: absolute;
  --r: calc(var(--lineRadius) + var(--shadowRadius));
  background: content-box var(--shadowColor);
  z-index: inherit;
}
.seg::after {
  content: "";
  display: block;
  position: absolute;
  --r: var(--hoverRadius);
  border: transparent solid calc(var(--r) - var(--lineRadius));
  background: content-box var(--strokeColor);
  z-index: inherit;
}
:host(:hover) .seg::after,
:host(:hover) .seg:empty::before {
  background-color: var(--focusColor);
}

/* horizontal */
:host([slot="top"]) .seg.odd,
:host([slot="left"]) .seg.even,
:host([slot="right"]) .seg.even,
:host([slot="bottom"]) .seg.odd {
  cursor: ns-resize;
}
:host([slot="top"]) .seg.odd::before,    :host([slot="top"]) .seg.odd::after,
:host([slot="left"]) .seg.even::before,  :host([slot="left"]) .seg.even::after,
:host([slot="right"]) .seg.even::before, :host([slot="right"]) .seg.even::after,
:host([slot="bottom"]) .seg.odd::before, :host([slot="bottom"]) .seg.odd::after {
  box-sizing: border-box;
  height: calc(2 * var(--r));
  width: calc(max(var(--l), -1 * var(--l)) + 2 * var(--r));
  left: calc(var(--x-) + min(0px, var(--l)) - var(--r));
  top: calc(var(--y-) - var(--r));
}
:host([slot="top"]) .seg.odd:empty::before,    :host([slot="top"]) .seg.odd:empty::after,
:host([slot="left"]) .seg.even:empty::before,  :host([slot="left"]) .seg.even:empty::after,
:host([slot="right"]) .seg.even:empty::before, :host([slot="right"]) .seg.even:empty::after,
:host([slot="bottom"]) .seg.odd:empty::before, :host([slot="bottom"]) .seg.odd:empty::after {
  box-sizing: border-box;
  --r: calc(var(--lineRadius) + var(--shadowRadius));
  height: calc(2 * var(--r));
  top: calc(var(--y-) - var(--r));
  border: white solid var(--shadowRadius);
  border-left-width: 0px;
  border-right-width: 0px;
  background: content-box DimGray;
  pointer-events: none;
}
:host([slot="top"]) .seg.odd:empty::before,
:host([slot="left"]) .seg.even:empty::before,
:host([slot="right"]) .seg.even:empty::before,
:host([slot="bottom"]) .seg.odd:empty::before {
  width: calc(max(0px, var(--l)));
  left: var(--x-);
  mask-image: linear-gradient(to right, black, transparent);
}
:host([slot="top"]) .seg.odd:empty::after,
:host([slot="left"]) .seg.even:empty::after,
:host([slot="right"]) .seg.even:empty::after,
:host([slot="bottom"]) .seg.odd:empty::after {
  width: calc(max(0px, -1 * var(--l)));
  left: calc(var(--x-) + var(--l));
  mask-image: linear-gradient(to left, black, transparent);
}

/* vertical */
:host([slot="top"]) .seg.even,
:host([slot="left"]) .seg.odd,
:host([slot="right"]) .seg.odd,
:host([slot="bottom"]) .seg.even {
  cursor: ew-resize;
}
:host([slot="top"]) .seg.even::before,    :host([slot="top"]) .seg.even::after,
:host([slot="left"]) .seg.odd::before,    :host([slot="left"]) .seg.odd::after,
:host([slot="right"]) .seg.odd::before,   :host([slot="right"]) .seg.odd::after,
:host([slot="bottom"]) .seg.even::before, :host([slot="bottom"]) .seg.even::after {
  box-sizing: border-box;
  width: calc(2 * var(--r));
  height: calc(max(var(--l), -1 * var(--l)) + 2 * var(--r));
  top: calc(var(--y-) + min(0px, var(--l)) - var(--r));
  left: calc(var(--x-) - var(--r));
}
:host([slot="top"]) .seg.even:empty::before,    :host([slot="top"]) .seg.even:empty::after,
:host([slot="left"]) .seg.odd:empty::before,    :host([slot="left"]) .seg.odd:empty::after,
:host([slot="right"]) .seg.odd:empty::before,   :host([slot="right"]) .seg.odd:empty::after,
:host([slot="bottom"]) .seg.even:empty::before, :host([slot="bottom"]) .seg.even:empty::after {
  box-sizing: border-box;
  --r: calc(var(--lineRadius) + var(--shadowRadius));
  width: calc(2 * var(--r));
  left: calc(var(--x-) - var(--r));
  border: white solid var(--shadowRadius);
  border-top-width: 0px;
  border-bottom-width: 0px;
  background: content-box DimGray;
  pointer-events: none;
}
:host([slot="top"]) .seg.even:empty::before,
:host([slot="left"]) .seg.odd:empty::before,
:host([slot="right"]) .seg.odd:empty::before,
:host([slot="bottom"]) .seg.even:empty::before {
  height: calc(max(0px, var(--l)));
  top: var(--y-);
  mask-image: linear-gradient(to bottom, black, transparent);
}
:host([slot="top"]) .seg.even:empty::after,
:host([slot="left"]) .seg.odd:empty::after,
:host([slot="right"]) .seg.odd:empty::after,
:host([slot="bottom"]) .seg.even:empty::after {
  height: calc(max(0px, -1 * var(--l)));
  top: calc(var(--y-) + var(--l));
  mask-image: linear-gradient(to top, black, transparent);
}

/* position calculation */
:host([slot="top"]) .seg.odd,
:host([slot="left"]) .seg.even,
:host([slot="right"]) .seg.even,
:host([slot="bottom"]) .seg.odd {
  --l: var(--length, calc(var(--endX, var(--startX, 0px)) - var(--x-)));
  --x: calc(var(--x-) + var(--l));
  --y-: var(--y);
}
:host([slot="left"]) > .seg.even,
:host([slot="right"]) > .seg.even {
  --x-: var(--startX, 0px);
  --y: var(--startY, 0px);
}

:host([slot="top"]) .seg.even,
:host([slot="left"]) .seg.odd,
:host([slot="right"]) .seg.odd,
:host([slot="bottom"]) .seg.even {
  --l: var(--length, calc(var(--endY, var(--startY, 0px)) - var(--y-)));
  --y: calc(var(--y-) + var(--l));
  --x-: var(--x);
}
:host([slot="top"]) > .seg.even,
:host([slot="bottom"]) > .seg.even {
  --y-: var(--startY, 0px);
  --x: var(--startX, 0px);
}
</style>

`;
customElements.define("l7-wire", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.appendChild(template_wire.content.cloneNode(true));
  }
  static get observedAttributes() {
    return ["path"];
  }
  attributeChangedCallback(name, old, value) {
    if ( old !== value ) {
      let path = this.path;
      let segments = Array.from(this.shadowRoot.querySelectorAll(".seg"));

      if ( segments.length > path.length ) {
        segments[path.length].remove();

      } else if ( segments.length < path.length ) {
        let last = segments[segments.length-1] || this.shadowRoot;
        for ( let n=segments.length; n<path.length; n++ ) {
          let seg = document.createElement("div");
          seg.classList.add("seg");
          seg.classList.add(n % 2 === 0 ? "even" : "odd");
          last.appendChild(seg);
          segments.push(seg);
          last = seg;
        }
      }

      for ( let n=0; n<path.length; n++ )
        segments[n].style.setProperty("--length", path[n]);
    }
  }

  get path() {
    return this.getAttribute("path").split(/\s*;\s*/);
  }
  set path(value) {
    return this.setAttribute("path", value.join(";"));
  }
});
