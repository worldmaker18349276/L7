"use strict";

const minHeadLength = 10;
function modifiersOf(event) {
  return (!!event.altKey) * 1 + (!!event.shiftKey) * 2 + (!!event.ctrlKey) * 4 + (!!event.metaKey) * 8;
}

customElements.define("dragg-able", class extends HTMLElement {
  constructor() {
    super();

    this._handlers = new Set();
    this.onpointerdown = this.onpointerdown.bind(this);
    this.onpointermove = this.onpointermove.bind(this);
    this.onpointercancel = this.onpointercancel.bind(this);
    this.onpointerup = this.onpointerup.bind(this);
  }
  connectedCallback() {
    this.addEventListener("pointerdown", this.onpointerdown);
    this.addEventListener("pointermove", this.onpointermove);
    this.addEventListener("pointercancel", this.onpointercancel);
    this.addEventListener("pointerup", this.onpointerup);
  }
  disconnectedCallback() {
    this.removeEventListener("pointerdown", this.onpointerdown);
    this.removeEventListener("pointermove", this.onpointermove);
    this.removeEventListener("pointercancel", this.onpointercancel);
    this.removeEventListener("pointerup", this.onpointerup);
  }

  onpointerdown(event) {
    if ( event.buttons === 1 && modifiersOf(event) === 0 && event.target === this ) {
      this.dispatchEvent(new CustomEvent("dragg", {
        bubbles: true,
        cancelable: false,
        composed: true,
        detail: {register: handler => this._handlers.add(handler)}
      }));
      if ( this._handlers.size === 0 )
        return;

      event.stopPropagation();
      event.target.setPointerCapture(event.pointerId);
      this.classList.add("dragging");
      this._x0 = event.pageX;
      this._y0 = event.pageY;
      this._started = false;

      for ( let handler of this._handlers )
        if ( handler.next().done )
          this._handlers.delete(handler);
    }
  }
  onpointermove(event) {
    if ( event.target.hasPointerCapture(event.pointerId) ) {
      let shiftX = event.pageX - this._x0;
      let shiftY = event.pageY - this._y0;

      if ( !this._started )
        this._started = Math.abs(shiftX) > 3 || Math.abs(shiftY) > 3;

      if ( this._started )
        for ( let handler of this._handlers )
          if ( handler.next([shiftX, shiftY]).done )
            this._handlers.delete(handler);
    }
  }
  onpointercancel(event) {
    if ( event.target.hasPointerCapture(event.pointerId) ) {
      if ( this._started )
        for ( let handler of this._handlers )
          handler.throw(new Error("draggcancel"));
      this._handlers.clear();

      event.target.releasePointerCapture(event.pointerId);
      this.classList.remove("dragging");
    }
  }
  onpointerup(event) {
    if ( event.target.hasPointerCapture(event.pointerId) ) {
      if ( this._started )
        for ( let handler of this._handlers )
          handler.return();
      this._handlers.clear();

      event.target.releasePointerCapture(event.pointerId);
      this.classList.remove("dragging");
    }
  }
});

// z-index:
//   1: shadow
//   2: stroke
//   3: handle
//   4: content
//   5: hovered

const dot_css = `
.dot {
  cursor: pointer;
  position: absolute;
}
.dot::before, .dot::after {
  content: "";
  display: block;
  position: absolute;

  top: var(---r);
  left: var(---r);
  right: var(---r);
  bottom: var(---r);
}
.dot::before {
  ---r: calc(-1 * (var(--DOTRADIUS) + var(--SHADOWRADIUS)));
  background: content-box var(--SHADOWCOLOR, transparent);
  pointer-events: none;
  opacity: var(--dotVisible, 1);
  z-index: 1;
}
.dot::after {
  box-sizing: border-box;
  ---r: calc(-1 * var(--HOVERRADIUS));
  border: calc(var(--HOVERRADIUS) - var(--DOTRADIUS)) solid transparent;
  background: content-box var(--frameColor, transparent);
  outline: var(--LINERADIUS) solid var(--dotFillColor, var(--frameColor, transparent));
  outline-offset: var(---r);
  opacity: var(--dotVisible, 1);
  pointer-events: auto;
  z-index: 3;
}
`;

const template_box = document.createElement("template");
template_box.innerHTML = `
<style>
:host {
  position: absolute;
  left:   var(--left);
  top:    var(--top);
  width:  var(--width);
  height: var(--height);

  background: var(--BGCOLOR);
  pointer-events: none;
  z-index: 4;
}
:host(:hover) {
  z-index: 5;
}
:host([dir="bottom"]), :host([dir="right"]) {
  left: var(--x);
  top:  var(--y);
}
:host([dir="top"]), :host([dir="left"]) {
  left: calc(var(--x) - var(--width));
  top:  calc(var(--y) - var(--height));
}

.interior {
  pointer-events: auto;
  position: absolute;
  z-index: 3;

  /* outline: 2px solid yellow; */
  /* outline-offset: -1px; */
}
${dot_css}
.dot::before, .dot::after {
  --dotVisible: 0;
}
.top {
  top: 0px;
}
.left {
  left: 0px;
}
.right {
  right: 0px;
}
.bottom {
  bottom: 0px;
}
.interior {
  cursor: move;
}
.dot.top.left {
  cursor: nw-resize;
}
.dot.top.right {
  cursor: ne-resize;
}
.dot.bottom.left {
  cursor: sw-resize;
}
.dot.bottom.right {
  cursor: se-resize;
}

::slotted(*) {
  --dotVisible: initial;
  --dotFillColor: initial;
  --frameColor: var(--STROKECOLOR);
}
:host(:hover) ::slotted(*) {
  --frameColor: var(--HOVERCOLOR);
}
.dot:hover {
  --frameColor: var(--FOCUSCOLOR);
}

::slotted(*) {
  --clip-top: 0;
  --clip-left: 0;
  --clip-right: 0;
  --clip-bottom: 0;
}
:host([dir="bottom"]:not(:hover)) ::slotted([dir="left"]),
:host([dir="bottom"]:not(:hover)) ::slotted([dir="right"]),
:host([dir="right"]:not(:hover)) ::slotted([dir="left"]),
:host([dir="left"]:not(:hover)) ::slotted([dir="right"]) {
  --clip-top: 1;
}
:host([dir="right"]:not(:hover)) ::slotted([dir="top"]),
:host([dir="right"]:not(:hover)) ::slotted([dir="bottom"]),
:host([dir="bottom"]:not(:hover)) ::slotted([dir="top"]),
:host([dir="top"]:not(:hover)) ::slotted([dir="bottom"]) {
  --clip-left: 1;
}
:host([dir="left"]:not(:hover)) ::slotted([dir="top"]),
:host([dir="left"]:not(:hover)) ::slotted([dir="bottom"]),
:host([dir="bottom"]:not(:hover)) ::slotted([dir="top"]),
:host([dir="top"]:not(:hover)) ::slotted([dir="bottom"]) {
  --clip-right: 1;
}
:host([dir="top"]:not(:hover)) ::slotted([dir="left"]),
:host([dir="top"]:not(:hover)) ::slotted([dir="right"]),
:host([dir="right"]:not(:hover)) ::slotted([dir="left"]),
:host([dir="left"]:not(:hover)) ::slotted([dir="right"]) {
  --clip-bottom: 1;
}

:host([dir="top"]) .dot.end,
:host([dir="left"]) .dot.end,
:host([dir="right"]) .dot.start,
:host([dir="bottom"]) .dot.start {
  cursor: pointer;
}
:host([dir="top"]) .dot.end::after,
:host([dir="left"]) .dot.end::after,
:host([dir="right"]) .dot.start::after,
:host([dir="bottom"]) .dot.start::after {
  --dotVisible: 1;
}
:host([dir="top"]:hover) .dot.end::before,
:host([dir="left"]:hover) .dot.end::before,
:host([dir="right"]:hover) .dot.start::before,
:host([dir="bottom"]:hover) .dot.start::before {
  --dotVisible: 1;
}
</style>

<dragg-able class="handle interior top left right bottom"></dragg-able>
<slot name="top"></slot>
<slot name="left"></slot>
<slot name="right"></slot>
<slot name="bottom"></slot>
<dragg-able class="handle dot top left start"></dragg-able>
<dragg-able class="handle dot top right"></dragg-able>
<dragg-able class="handle dot bottom left"></dragg-able>
<dragg-able class="handle dot bottom right end"></dragg-able>
<slot></slot>
`;
customElements.define("l7-box", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.appendChild(template_box.content.cloneNode(true));

    this.onborderschange = this.onborderschange.bind(this);
    this.ondragg = this.ondragg.bind(this);
  }
  connectedCallback() {
    this._observer = new MutationObserver(this.onborderschange);
    this._observer.observe(this, {childList: true});

    this.shadowRoot.addEventListener("dragg", this.ondragg);
  }
  disconnectedCallback() {
    this._observer.disconnect();
    this.shadowRoot.removeEventListener("dragg", this.ondragg);
  }

  get dir() {
    return this.getAttribute("dir");
  }
  get rect() {
    let left = this.style.getPropertyValue("--left");
    let top = this.style.getPropertyValue("--top");
    let width = this.style.getPropertyValue("--width");
    let height = this.style.getPropertyValue("--height");
    return {left, top, width, height};
  }
  set rect({left, top, width, height}) {
    this.style.setProperty("--left", left);
    this.style.setProperty("--top", top);
    this.style.setProperty("--width", width);
    this.style.setProperty("--height", height);
  }
  get position() {
    let {offsetLeft, offsetTop, offsetWidth, offsetHeight} = this;
    return {left:offsetLeft, top:offsetTop, width:offsetWidth, height:offsetHeight};
  }
  makeResizer(mode=["bottom", "right"]) {
    let parentWidth = this.offsetParent.offsetWidth;
    let parentHeight = this.offsetParent.offsetHeight;
    let original_rect = this.rect;
    let {left, top, width, height} = this.position;

    let xmin = -Infinity,
        xmax = +Infinity,
        ymin = -Infinity,
        ymax = +Infinity;
    if ( mode.includes("left") && !mode.includes("right") )
      xmax = width;
    if ( !mode.includes("left") && mode.includes("right") )
      xmin = -width;
    if ( mode.includes("top") && !mode.includes("bottom") )
      ymax = height;
    if ( !mode.includes("top") && mode.includes("bottom") )
      ymin = -height;

    return (shiftX, shiftY) => {
      let rect = Object.assign(original_rect, {});
      if ( shiftX === undefined || shiftY === undefined )
        return rect;

      shiftX = Math.max(xmin, Math.min(shiftX, xmax));
      shiftY = Math.max(ymin, Math.min(shiftY, ymax));

      if ( mode.includes("left") )
        rect.left = `${100*(left+shiftX)/parentWidth}%`;

      if ( !mode.includes("left") && mode.includes("right") )
        rect.width = `${100*(width+shiftX)/parentWidth}%`;
      if ( mode.includes("left") && !mode.includes("right") )
        rect.width = `${100*(width-shiftX)/parentWidth}%`;

      if ( mode.includes("top") )
        rect.top = `${100*(top+shiftY)/parentHeight}%`;

      if ( !mode.includes("top") && mode.includes("bottom") )
        rect.height = `${100*(height+shiftY)/parentHeight}%`;
      if ( mode.includes("top") && !mode.includes("bottom") )
        rect.height = `${100*(height-shiftY)/parentHeight}%`;

      return rect;
    };
  }
  onborderschange() {
    for ( let side of ["top", "left"] ) {
      let borders = Array.from(this.querySelectorAll(`:scope > l7-border[slot="${side}"]`));
      for ( let [i, border] of borders.entries() )
        if ( border.style.getPropertyValue("--order") === "" )
          border.style.setProperty("--order", i);
    }
    for ( let side of ["bottom", "right"] ) {
      let borders = Array.from(this.querySelectorAll(`:scope > l7-border[slot="${side}"]`));
      for ( let [i, border] of borders.reverse().entries() )
        if ( border.style.getPropertyValue("--order") === "" )
          border.style.setProperty("--order", i);
    }
  }
  ondragg(event) {
    let mode;
    if ( event.target.matches(".handle") && event.target.getRootNode() === this.shadowRoot ) {
      if ( (this.dir === "top" || this.dir === "left") && event.target.matches(".interior, .end") )
        return;
      if ( (this.dir === "bottom" || this.dir === "right") && event.target.matches(".interior, .start") )
        return;

      mode = Array.from(event.target.classList);

    } else if ( event.target.matches("l7-border") && event.target.parentNode === this ) {
      mode = [event.target.slot];

    } else {
      return;
    }

    if ( !this.dir ) {
      mode = mode.filter(s => ["top", "left", "bottom", "right"].includes(s));
    } else if ( this.dir === "top" || this.dir === "left" ) {
      mode = mode.filter(s => ["top", "left"].includes(s));
    } else if ( this.dir === "bottom" || this.dir === "right" ) {
      mode = mode.filter(s => ["bottom", "right"].includes(s));
    }

    event.detail.register(this.onresize(mode));
    event.stopPropagation();
  }
  *onresize(mode) {
    let resizer = this.makeResizer(mode);
    this.classList.add("resizing");

    try {
      while ( true ) {
        let [shiftX, shiftY] = yield;
        this.rect = resizer(shiftX, shiftY);

        for ( let wire of this.querySelectorAll("l7-wire") )
          wire.updateDelta();
      }

    } catch {
      this.rect = resizer();

      for ( let wire of this.querySelectorAll("l7-wire") )
        wire.updateDelta();

    } finally {
      this.classList.remove("resizing");

    }
  }
});

const template_border = document.createElement("template");
template_border.innerHTML = `
<style>
:host {
  --shift: calc(min(100%, 2 * var(--order, 0) * var(--HOVERRADIUS)));

  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: auto;
}
:host(:hover) {
  z-index: 5;
}

.center, .line::before, .line::after, .line .handle {
  content: "";
  display: block;
  position: absolute;

  ---r: calc(-1 * var(--r));
  --s: calc(var(--shift) - var(--r));
  --w: calc(2 * var(--r));
}
.center {
  --r: 0px;
}
.line::before {
  box-sizing: border-box;
  --r: calc(var(--LINERADIUS) + var(--SHADOWRADIUS));
  background: content-box var(--SHADOWCOLOR);
  pointer-events: none;
  z-index: 1;

  --c: calc(2 * var(--LINERADIUS) + var(--SHADOWRADIUS));
  padding-top:    calc(var(--clip-top, 0) * var(--c));
  padding-left:   calc(var(--clip-left, 0) * var(--c));
  padding-right:  calc(var(--clip-right, 0) * var(--c));
  padding-bottom: calc(var(--clip-bottom, 0) * var(--c));
}
.line::after {
  --r: var(--LINERADIUS);
  background: content-box var(--frameColor);
  pointer-events: none;
  z-index: 2;
}
.line .handle {
  --r: var(--HOVERRADIUS);
  pointer-events: auto;
  z-index: 3;

  /* outline: 1px dashed red; */
  /* outline-offset: -1px; */
}
.line:hover, .line:hover ~ ::slotted(*) {
  --frameColor: var(--FOCUSCOLOR);
}

.line .handle {
  ---r: var(--r);
}
:host([slot="top"]) .center,
:host([slot="top"]) .line::before,
:host([slot="top"]) .line::after,
:host([slot="top"]) .line .handle {
  left:   var(---r);
  right:  var(---r);
  top:    var(--s);
  height: var(--w);
}
:host([slot="bottom"]) .center,
:host([slot="bottom"]) .line::before,
:host([slot="bottom"]) .line::after,
:host([slot="bottom"]) .line .handle {
  left:   var(---r);
  right:  var(---r);
  bottom: var(--s);
  height: var(--w);
}
:host([slot="left"]) .center,
:host([slot="left"]) .line::before,
:host([slot="left"]) .line::after,
:host([slot="left"]) .line .handle {
  top:    var(---r);
  bottom: var(---r);
  left:   var(--s);
  width:  var(--w);
}
:host([slot="right"]) .center,
:host([slot="right"]) .line::before,
:host([slot="right"]) .line::after,
:host([slot="right"]) .line .handle {
  top:    var(---r);
  bottom: var(---r);
  right:  var(--s);
  width:  var(--w);
}
:host([slot="top"]) .line {
  cursor: n-resize;
}
:host([slot="bottom"]) .line {
  cursor: s-resize;
}
:host([slot="left"]) .line {
  cursor: w-resize;
}
:host([slot="right"]) .line {
  cursor: e-resize;
}

:host([slot="top"]) ::slotted(*) {
  --x: calc(clamp(0%, var(--offset), 100%));
  --y: var(--shift);
}
:host([slot="bottom"]) ::slotted(*) {
  --x: calc(clamp(0%, var(--offset), 100%));
  --y: calc(100% - var(--shift));
}
:host([slot="left"]) ::slotted(*) {
  --x: var(--shift);
  --y: calc(clamp(0%, var(--offset), 100%));
}
:host([slot="right"]) ::slotted(*) {
  --x: calc(100% - var(--shift));
  --y: calc(clamp(0%, var(--offset), 100%));
}
</style>

<div class="center"></div>
<dragg-able class="line"><div class="handle"></div></dragg-able>
<slot></slot>
`;
customElements.define("l7-border", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.appendChild(template_border.content.cloneNode(true));

    this.ondragg = this.ondragg.bind(this);
  }
  static get observedAttributes() {
    return ["name"];
  }
  attributeChangedCallback(name, old, value) {
    if ( old !== value ) {
      if ( name === "name" ) {
        this.shadowRoot.querySelector(".line").title = this.getAttribute("name");
      }
    }
  }
  connectedCallback() {
    this.shadowRoot.addEventListener("dragg", this.ondragg);
  }
  disconnectedCallback() {
    this.shadowRoot.removeEventListener("dragg", this.ondragg);
  }

  get position() {
    let {offsetLeft, offsetTop, offsetWidth, offsetHeight} = this.shadowRoot.querySelector(".center");
    return {left:offsetLeft, top:offsetTop, width:offsetWidth, height:offsetHeight};
  }
  makeSorter(side="top") {
    let original_borders = [];
    for ( let border of this.parentNode.querySelectorAll(`:scope > l7-border[slot="${this.slot}"]`) )
      original_borders[parseInt(border.style.getPropertyValue("--order"))] = border;
    let original_index = original_borders.indexOf(this);

    let step;
    if ( original_borders.length <= 1 )
      step = 0;
    else if ( side === "top" || side === "bottom" )
      step = original_borders[1].position.top
           - original_borders[0].position.top;
    else if ( side === "left" || side === "right" )
      step = original_borders[1].position.left
           - original_borders[0].position.left;

    return (shiftX, shiftY) => {
      let borders = Array.from(original_borders);
      if ( shiftX === undefined || shiftY === undefined )
        return borders;

      let shift = side === "top" || side === "bottom" ? shiftY : shiftX;
      let index = original_index + Math.round(shift/step);
      index = Math.max(0, Math.min(index, original_borders.length-1));

      borders.splice(original_index, 1);
      borders.splice(index, 0, this);

      return borders;
    };
  }
  ondragg(event) {
    if ( event.target.matches(".line") && event.target.getRootNode() === this.shadowRoot ) {
      if ( this.style.getPropertyValue("--order") === "0" )
        return;

      event.detail.register(this.onreorder(this.slot));
      event.stopPropagation();
    }
  }
  *onreorder(side) {
    let sorter = this.makeSorter(side);
    this.classList.add("reordering");

    try {
      while ( true ) {
        let [shiftX, shiftY] = yield;
        let borders = sorter(shiftX, shiftY);
        for ( let [i, border] of borders.entries() )
          border.style.setProperty("--order", i);

        for ( let wire of this.parentNode.querySelectorAll("l7-wire") )
          wire.updateDelta();
      }

    } catch {
      let borders = sorter();
      for ( let [i, border] of borders.entries() )
        border.style.setProperty("--order", i);

      for ( let wire of this.parentNode.querySelectorAll("l7-wire") )
        wire.updateDelta();

    } finally {
      this.classList.remove("reordering");

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

${dot_css}
.dot {
  left: var(--x);
  top: var(--y);
}
:host([type="hollow"]) {
  --dotFillColor: var(--SHADOWCOLOR);
}
.dot:hover, .dot:hover ~ ::slotted(*) {
  --frameColor: var(--FOCUSCOLOR);
}
:host([type="hidden"]) {
  --dotVisible: 0;
}
</style>

<dragg-able class="dot"></dragg-able>
<slot></slot>
`;
customElements.define("l7-port", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.appendChild(template_port.content.cloneNode(true));

    this.ondragg = this.ondragg.bind(this);
  }
  static get observedAttributes() {
    return ["name"];
  }
  connectedCallback() {
    this.shadowRoot.addEventListener("dragg", this.ondragg);
  }
  disconnectedCallback() {
    this.shadowRoot.removeEventListener("dragg", this.ondragg);
  }
  attributeChangedCallback(name, old, value) {
    if ( old !== value ) {
      if ( name === "name" ) {
        this.shadowRoot.querySelector(".dot").title = this.getAttribute("name");
      }
    }
  }

  get offset() {
    return this.style.getPropertyValue("--offset");
  }
  set offset(offset) {
    this.style.setProperty("--offset", offset);
  }
  get position() {
    let {offsetLeft, offsetTop, offsetWidth, offsetHeight} = this.shadowRoot.querySelector(".dot");
    return {left:offsetLeft, top:offsetTop, width:offsetWidth, height:offsetHeight};
  }
  makeShifter() {
    let parentWidth = this.offsetWidth;
    let parentHeight = this.offsetHeight;
    let original_offset = this.offset;

    let {left, top} = this.position;
    if ( this.matches("[slot='top'] > *, [slot='bottom'] > *") )
      return (shiftX, shiftY) => shiftX === undefined ? original_offset
                                 : `${100*Math.max(0, Math.min(left+shiftX, parentWidth))/parentWidth}%`;
    if ( this.matches("[slot='left'] > *, [slot='right'] > *") )
      return (shiftX, shiftY) => shiftY === undefined ? original_offset
                                 : `${100*Math.max(0, Math.min(top+shiftY, parentHeight))/parentHeight}%`;
  }
  ondragg(event) {
    if ( event.target.matches(".dot") && event.target.getRootNode() === this.shadowRoot ) {
      event.stopPropagation();
      event.detail.register(this.onmove());

    } else if ( event.target.matches("l7-box, l7-wire") && event.target.parentNode === this ) {
      event.stopPropagation();
      event.detail.register(this.onmove());
    }
  }
  *onmove() {
    let shifter = this.makeShifter();
    this.classList.add("moving");

    try {
      while ( true ) {
        let [shiftX, shiftY] = yield;
        this.offset = shifter(shiftX, shiftY);

        for ( let wire of this.querySelectorAll("l7-wire") )
          wire.updateDelta();
      }

    } catch {
      this.offset = shifter();

      for ( let wire of this.querySelectorAll("l7-wire") )
        wire.updateDelta();

    } finally {
      this.classList.remove("moving");

    }
  }
});

const template_wire = document.createElement("template");
template_wire.innerHTML = `
<style>
:host {
  position: absolute;
  left: var(--x);
  top: var(--y);
  width: 0px;
  height: 0px;

  z-index: 4;
  --lineColor: var(--STROKECOLOR);
}
:host(:hover) {
  z-index: 5;
  --frameColor: var(--FOCUSCOLOR);
  --lineColor: var(--FOCUSCOLOR);
}

${dot_css}
:host(:not(:hover)) .dot::before {
  --dotVisible: 0;
}

.seg {
  --length: initial;
  z-index: inherit;
}
:host > .seg {
  z-index: 1;
}
.seg::before {
  content: "";
  display: block;
  position: absolute;
  --r: calc(var(--LINERADIUS) + var(--SHADOWRADIUS));
  background: content-box var(--SHADOWCOLOR);
  pointer-events: auto;
  z-index: inherit;
}
.seg::after {
  content: "";
  display: block;
  position: absolute;
  --r: var(--HOVERRADIUS);
  border: calc(var(--r) - var(--LINERADIUS)) solid transparent;
  background: content-box var(--lineColor);
  pointer-events: auto;
  z-index: inherit;
}
.seg:not(:empty)::after {
  /* outline: 1px dashed blue; */
  /* outline-offset: -1px; */
}


:host([dir="top"]) > .seg::before {
  padding-bottom: calc(2 * var(--LINERADIUS) + var(--SHADOWRADIUS));
}
:host([dir="left"]) > .seg::before {
  padding-right: calc(2 * var(--LINERADIUS) + var(--SHADOWRADIUS));
}
:host([dir="right"]) > .seg::before {
  padding-left: calc(2 * var(--LINERADIUS) + var(--SHADOWRADIUS));
}
:host([dir="bottom"]) > .seg::before {
  padding-top: calc(2 * var(--LINERADIUS) + var(--SHADOWRADIUS));
}

/* horizontal */
:host([dir="top"]) .seg.odd,
:host([dir="left"]) .seg.even,
:host([dir="right"]) .seg.even,
:host([dir="bottom"]) .seg.odd {
  cursor: ns-resize;
}
:host([dir="top"]) .seg.odd::before,    :host([dir="top"]) .seg.odd::after,
:host([dir="left"]) .seg.even::before,  :host([dir="left"]) .seg.even::after,
:host([dir="right"]) .seg.even::before, :host([dir="right"]) .seg.even::after,
:host([dir="bottom"]) .seg.odd::before, :host([dir="bottom"]) .seg.odd::after {
  box-sizing: border-box;
  height: calc(2 * var(--r));
  width: calc(max(var(--l), -1 * var(--l)) + 2 * var(--r));
  left: calc(var(--x-) + min(0px, var(--l)) - var(--r));
  top: calc(var(--y-) - var(--r));
}
:host([dir="top"]) .seg.odd:empty::before,    :host([dir="top"]) .seg.odd:empty::after,
:host([dir="left"]) .seg.even:empty::before,  :host([dir="left"]) .seg.even:empty::after,
:host([dir="right"]) .seg.even:empty::before, :host([dir="right"]) .seg.even:empty::after,
:host([dir="bottom"]) .seg.odd:empty::before, :host([dir="bottom"]) .seg.odd:empty::after {
  box-sizing: border-box;
  --r: calc(var(--LINERADIUS) + var(--SHADOWRADIUS));
  height: calc(2 * var(--r));
  top: calc(var(--y-) - var(--r));
  border: var(--SHADOWRADIUS) solid var(--SHADOWCOLOR);
  border-left-width: 0px;
  border-right-width: 0px;
  background: content-box var(--lineColor);
  pointer-events: none;
}
:host([dir="top"]) .seg.odd:empty::before,
:host([dir="left"]) .seg.even:empty::before,
:host([dir="right"]) .seg.even:empty::before,
:host([dir="bottom"]) .seg.odd:empty::before {
  width: calc(max(0px, var(--l)));
  left: var(--x-);
  mask-image: linear-gradient(to right, black, transparent);
}
:host([dir="top"]) .seg.odd:empty::after,
:host([dir="left"]) .seg.even:empty::after,
:host([dir="right"]) .seg.even:empty::after,
:host([dir="bottom"]) .seg.odd:empty::after {
  width: calc(max(0px, -1 * var(--l)));
  left: calc(var(--x-) + var(--l));
  mask-image: linear-gradient(to left, black, transparent);
}
:host([type="dashed"][dir="top"]) .seg.odd::after,
:host([type="dashed"][dir="left"]) .seg.even::after,
:host([type="dashed"][dir="right"]) .seg.even::after,
:host([type="dashed"][dir="bottom"]) .seg.odd::after,
:host([type="dashed"][dir="top"]) .seg.odd:empty::before,
:host([type="dashed"][dir="left"]) .seg.even:empty::before,
:host([type="dashed"][dir="right"]) .seg.even:empty::before,
:host([type="dashed"][dir="bottom"]) .seg.odd:empty::before {
  background-color: initial;
  background-image: linear-gradient(to right, var(--lineColor) 0, var(--DASHLENGTH1),
                                    var(--SHADOWCOLOR) 0, var(--SHADOWCOLOR) var(--DASHLENGTH2));
  background-size: var(--DASHLENGTH2) auto;
  background-origin: content-box;
  background-clip: content-box;
  background-repeat: repeat-x;
}

/* vertical */
:host([dir="top"]) .seg.even,
:host([dir="left"]) .seg.odd,
:host([dir="right"]) .seg.odd,
:host([dir="bottom"]) .seg.even {
  cursor: ew-resize;
}
:host([dir="top"]) .seg.even::before,    :host([dir="top"]) .seg.even::after,
:host([dir="left"]) .seg.odd::before,    :host([dir="left"]) .seg.odd::after,
:host([dir="right"]) .seg.odd::before,   :host([dir="right"]) .seg.odd::after,
:host([dir="bottom"]) .seg.even::before, :host([dir="bottom"]) .seg.even::after {
  box-sizing: border-box;
  width: calc(2 * var(--r));
  height: calc(max(var(--l), -1 * var(--l)) + 2 * var(--r));
  top: calc(var(--y-) + min(0px, var(--l)) - var(--r));
  left: calc(var(--x-) - var(--r));
}
:host([dir="top"]) .seg.even:empty::before,    :host([dir="top"]) .seg.even:empty::after,
:host([dir="left"]) .seg.odd:empty::before,    :host([dir="left"]) .seg.odd:empty::after,
:host([dir="right"]) .seg.odd:empty::before,   :host([dir="right"]) .seg.odd:empty::after,
:host([dir="bottom"]) .seg.even:empty::before, :host([dir="bottom"]) .seg.even:empty::after {
  box-sizing: border-box;
  --r: calc(var(--LINERADIUS) + var(--SHADOWRADIUS));
  width: calc(2 * var(--r));
  left: calc(var(--x-) - var(--r));
  border: var(--SHADOWRADIUS) solid var(--SHADOWCOLOR);
  border-top-width: 0px;
  border-bottom-width: 0px;
  background: content-box var(--lineColor);
  pointer-events: none;
}
:host([dir="top"]) .seg.even:empty::before,
:host([dir="left"]) .seg.odd:empty::before,
:host([dir="right"]) .seg.odd:empty::before,
:host([dir="bottom"]) .seg.even:empty::before {
  height: calc(max(0px, var(--l)));
  top: var(--y-);
  mask-image: linear-gradient(to bottom, black, transparent);
}
:host([dir="top"]) .seg.even:empty::after,
:host([dir="left"]) .seg.odd:empty::after,
:host([dir="right"]) .seg.odd:empty::after,
:host([dir="bottom"]) .seg.even:empty::after {
  height: calc(max(0px, -1 * var(--l)));
  top: calc(var(--y-) + var(--l));
  mask-image: linear-gradient(to top, black, transparent);
}
:host([type="dashed"][dir="top"]) .seg.even::after,
:host([type="dashed"][dir="left"]) .seg.odd::after,
:host([type="dashed"][dir="right"]) .seg.odd::after,
:host([type="dashed"][dir="bottom"]) .seg.even::after,
:host([type="dashed"][dir="top"]) .seg.even:empty::before,
:host([type="dashed"][dir="left"]) .seg.odd:empty::before,
:host([type="dashed"][dir="right"]) .seg.odd:empty::before,
:host([type="dashed"][dir="bottom"]) .seg.even:empty::before {
  background-color: initial;
  background-image: linear-gradient(to bottom, var(--lineColor) 0, var(--DASHLENGTH1),
                                    var(--SHADOWCOLOR) 0, var(--SHADOWCOLOR) var(--DASHLENGTH2));
  background-size: auto var(--DASHLENGTH2);
  background-origin: content-box;
  background-clip: content-box;
  background-repeat: repeat-y;
}

/* position calculation */
:host([dir="top"]) .seg.odd,
:host([dir="left"]) .seg.even,
:host([dir="right"]) .seg.even,
:host([dir="bottom"]) .seg.odd {
  --\\%: calc(var(--deltaX) / 100);
  --l: var(--length);
  --x: calc(var(--x-) + var(--l));
  --y-: var(--y);
}
:host([dir="left"]) > .seg.even,
:host([dir="right"]) > .seg.even {
  --x-: 0px;
  --y: 0px;
}

:host([dir="top"]) .seg.even,
:host([dir="left"]) .seg.odd,
:host([dir="right"]) .seg.odd,
:host([dir="bottom"]) .seg.even {
  --\\%: calc(var(--deltaY) / 100);
  --l: var(--length);
  --y: calc(var(--y-) + var(--l));
  --x-: var(--x);
}
:host([dir="top"]) > .seg.even,
:host([dir="bottom"]) > .seg.even {
  --y-: 0px;
  --x: 0px;
}
</style>

<dragg-able class="dot"></dragg-able>
`;
customElements.define("l7-wire", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.appendChild(template_wire.content.cloneNode(true));
    this._requested = false;
  }
  static get observedAttributes() {
    return ["from", "to", "style"];
  }
  attributeChangedCallback(name, old, value) {
    if ( old !== value ) {
      if ( name === "style" ) {
        let path = this.getComputedPath();
        if ( this.dir === "top" || this.dir === "left" )
          path = path.reverse().map(p => `-1 * (${p})`);

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
          segments[n].style.setProperty("--length", `calc(${path[n]})`);

      } else if ( name === "from" || name === "to" ) {
        this.updateDelta();
      }
    }
  }
  connectedCallback() {
    requestAnimationFrame(() => this.updateDelta());
  }

  get dir() {
    return this.getAttribute("dir");
  }
  get start() {
    let start;
    if ( this.dir === "bottom" || this.dir === "right" )
      start = this;
    if ( this.dir === "top" || this.dir === "left" )
      start = document.getElementById(this.getAttribute("from"));
    if ( !start || start.dir !== "bottom" && start.dir !== "right" )
      return;
    return start;
  }
  get end() {
    let end;
    if ( this.dir === "bottom" || this.dir === "right" )
      end = document.getElementById(this.getAttribute("to"));
    if ( this.dir === "top" || this.dir === "left" )
      end = this;
    if ( !end || end.dir !== "top" && end.dir !== "left" )
      return;
    return end;
  }
  updateDelta() {
    let start = this.start, end = this.end;
    if ( !start || !end )
      return;

    let rect1 = start.getBoundingClientRect();
    let rect2 = end.getBoundingClientRect();
    let deltaX = rect2.left - rect1.left;
    let deltaY = rect2.top - rect1.top;
    if ( start.dir === "bottom" ) deltaY -= minHeadLength;
    if ( start.dir === "right" )  deltaX -= minHeadLength;
    if ( end.dir === "top" )      deltaY -= minHeadLength;
    if ( end.dir === "left" )     deltaX -= minHeadLength;

    start.setDelta(deltaX, deltaY);
    end.setDelta(deltaX, deltaY);
  }
  setDelta(deltaX, deltaY) {
    this._deltaX = deltaX;
    this._deltaY = deltaY;

    if ( !this._requested ) {
      this._requested = true;

      requestAnimationFrame(() => {
        let signX_old = parseFloat(this.style.getPropertyValue("--deltaX")) >= 0;
        let signY_old = parseFloat(this.style.getPropertyValue("--deltaY")) >= 0;
        let signX_curr = this._deltaX >= 0;
        let signY_curr = this._deltaY >= 0;

        this.style.setProperty("--deltaX", this._deltaX + "px");
        this.style.setProperty("--deltaY", this._deltaY + "px");

        if ( signX_old !== signX_curr || signY_old !== signY_curr )
          this.style.removeProperty("--path");

        this._requested = false;
      });
    }
  }
  getComputedPath() {
    let path = this.style.getPropertyValue("--path") || this.getDefaultPath();

    // parse path as list of lengths
    let regex = /(.*?[^\s\+\-\*\/,\(])(\s+(?![\+\-\*\/]\s|,|\))|\s*$)/gy;
    path = Array.from(path.matchAll(regex)).map(res => res[1]);

    // TODO: deal with fr

    // fake percentage unit
    path = path.map(p => p.replace("%", " * var(--\\%)"));

    // initial/final head length
    if ( path[0] )
      path[0] = `${path[0]} + ${minHeadLength}px`;
    if ( path[path.length-1] )
      path[path.length-1] = `${path[path.length-1]} + ${minHeadLength}px`;

    return path;
  }
  getDefaultPath() {
    let start = this.start, end = this.end;
    if ( !start || !end )
      return "";

    switch ( `${start.dir} ${end.dir}` ) {
      case "bottom top":
      case "right left":
        return "max(0px, 50%) 50% min(0px, 100%) 50% max(0px, 50%)";

      case "bottom left":
      case "right bottom":
        return "max(0px, 50%) min(0px, 100%) max(0px, 50%) max(0px, 50%) min(0px, 100%) max(0px, 50%)";
    }
  }
});
