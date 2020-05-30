"use strict";

const MINHEADLENGTH = 10;
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
    if ( event.buttons === 1 && modifiersOf(event) === 0 ) {
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
//   2: line
//   3: dot
//   4: content
//   5: hovered

const template_box = document.createElement("template");
template_box.innerHTML = `
<style>
:host {
  position: absolute;
  width:  var(--width);
  height: var(--height);
  pointer-events: none;
  z-index: 4;
}
:host(:hover) {
  z-index: 5;
}
:host(:not([dir])) {
  left: var(--left);
  top:  var(--top);
}
:host([dir*="top"]) {
  bottom: calc(100% - var(--y));
}
:host([dir*="left"]) {
  right: calc(100% - var(--x));
}
:host([dir*="right"]) {
  left: var(--x);
}
:host([dir*="bottom"]) {
  top: var(--y);
}
.edge, .corner, .contents {
  /* reset controlled variables */
  --port-shadowVisible: initial;
  --port-dotVisible: initial;
  --port-cursor: initial;
  --port-dotColor: initial;
  --port-filledColor: initial;
  --port-horizontal: initial;
  --port-vertical: initial;
  --border-lineColor: initial;
  --border-clipTopLeft: initial;
  --border-clipTopRight: initial;
  --border-clipBottomLeft: initial;
  --border-clipBottomRight: initial;
}

/* background */
[part="background"] {
  position: absolute;
  top: 0px;
  left: 0px;
  right: 0px;
  bottom: 0px;
  background: var(--BGCOLOR);
  pointer-events: auto;
  cursor: move;

  /* outline: 2px solid yellow; */
  /* outline-offset: -1px; */
}

/* CORNERS */
.corner {
  --port-dotVisible: 0;
  --port-horizontal: 1;
  --port-vertical: 1;
}
.corner::slotted(:hover) {
  z-index: auto;
}
.corner[name*="top"]::slotted(*) {
  --y: 0%;
}
.corner[name*="left"]::slotted(*) {
  --x: 0%;
}
.corner[name*="right"]::slotted(*) {
  --x: 100%;
}
.corner[name*="bottom"]::slotted(*) {
  --y: 100%;
}
.corner[name="top-left"] {
  --port-cursor: nw-resize;
}
.corner[name="top-right"] {
  --port-cursor: ne-resize;
}
.corner[name="bottom-left"] {
  --port-cursor: sw-resize;
}
.corner[name="bottom-right"] {
  --port-cursor: se-resize;
}
:host([dir="bottom-right"]) .corner[name="top-left"],
:host([dir="bottom-left"]) .corner[name="top-right"],
:host([dir="top-right"]) .corner[name="bottom-left"],
:host([dir="top-left"]) .corner[name="bottom-right"] {
  --port-shadowVisible: 0;
  --port-dotVisible: inherit;
  --port-cursor: inherit;
  --port-dotColor: inherit;
  --port-filledColor: inherit;
}
:host([dir="bottom-right"]:hover) .corner[name="top-left"],
:host([dir="bottom-left"]:hover) .corner[name="top-right"],
:host([dir="top-right"]:hover) .corner[name="bottom-left"],
:host([dir="top-left"]:hover) .corner[name="bottom-right"] {
  --port-shadowVisible: initial;
}

/* EDGES */
.edge {
  --border-clipTopLeft: inherit;
  --border-clipTopRight: inherit;
  --border-clipBottomLeft: inherit;
  --border-clipBottomRight: inherit;
}
:host(:hover) .edge {
  --border-lineColor: var(--HOVERCOLOR);
}
</style>

<dragg-able part="background"></dragg-able>
<slot class="edge" name="top"></slot>
<slot class="edge" name="left"></slot>
<slot class="edge" name="right"></slot>
<slot class="edge" name="bottom"></slot>
<slot class="corner" name="top-left"></slot>
<slot class="corner" name="top-right"></slot>
<slot class="corner" name="bottom-left"></slot>
<slot class="corner" name="bottom-right"></slot>
<slot class="contents"></slot>
`;
customElements.define("l7-box", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.appendChild(template_box.content.cloneNode(true));

    this.ondragg = this.ondragg.bind(this);
  }
  connectedCallback() {
    this.shadowRoot.addEventListener("dragg", this.ondragg);
  }
  disconnectedCallback() {
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
  ondragg(event) {
    let mode;
    if ( event.target.matches("[part='background']") && event.target.getRootNode() === this.shadowRoot ) {
      // :host(:not([dir])) > [part="background"]

      if ( this.dir )
        return;

      mode = ["top", "bottom", "left", "right"];

    } else if ( event.target.matches("l7-border") && event.target.parentNode === this ) {
      // :scope > l7-border

      mode = [event.target.slot];

    } else if ( event.target.matches("l7-port") ) {
      // l7-box:not([dir="bottom-right"]) l7-port[slot="top-left"]
      // l7-box:not([dir="bottom-left"]) l7-port[slot="top-right"]
      // l7-box:not([dir="top-right"]) l7-port[slot="bottom-left"]
      // l7-box:not([dir="top-left"]) l7-port[slot="bottom-right"]

      if ( this.dir === "top-left" && event.target.matches("[slot='bottom-right']") )
        return;
      if ( this.dir === "top-right" && event.target.matches("[slot='bottom-left']") )
        return;
      if ( this.dir === "bottom-left" && event.target.matches("[slot='top-right']") )
        return;
      if ( this.dir === "bottom-right" && event.target.matches("[slot='top-left']") )
        return;

      mode = event.target.slot.split("-");

    } else {
      return;
    }

    let movable = !this.dir ? ["top", "left", "bottom", "right"] : this.dir.split("-");
    mode = mode.filter(s => movable.includes(s));

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

  /* controlled variables:
  --border-lineColor
  --border-clipTopLeft
  --border-clipTopRight
  --border-clipBottomLeft
  --border-clipBottomRight
  */
}
:host(:hover) {
  z-index: 5;
}
.ports {
  /* reset controlled variables */
  --port-shadowVisible: initial;
  --port-dotVisible: initial;
  --port-cursor: initial;
  --port-dotColor: initial;
  --port-filledColor: initial;
  --port-horizontal: initial;
  --port-vertical: initial;
  --border-lineColor: initial;
  --border-clipTopLeft: initial;
  --border-clipTopRight: initial;
  --border-clipBottomLeft: initial;
  --border-clipBottomRight: initial;
}

/* POSITION */
[part="line"] {
  position: absolute;
}
:host([slot="top"]) [part="line"] {
  left:   0px;
  right:  0px;
  height: 0px;
  top: var(--shift);
  cursor: n-resize;
}
:host([slot="bottom"]) [part="line"] {
  left:   0px;
  right:  0px;
  height: 0px;
  bottom: var(--shift);
  cursor: s-resize;
}
:host([slot="left"]) [part="line"] {
  top:    0px;
  bottom: 0px;
  width:  0px;
  left: var(--shift);
  cursor: w-resize;
}
:host([slot="right"]) [part="line"] {
  top:    0px;
  bottom: 0px;
  width:  0px;
  right: var(--shift);
  cursor: e-resize;
}

/* VIEW */
[part="line"]:hover {
  --border-lineColor: var(--FOCUSCOLOR);
}
[part="line"]::before, [part="line"]::after {
  content: "";
  display: block;
  position: absolute;
  top: var(---r);
  left: var(---r);
  right: var(---r);
  bottom: var(---r);
}
[part="line"]::before {
  box-sizing: border-box;
  ---r: calc(-1 * (var(--LINERADIUS) + var(--SHADOWRADIUS)));
  background: content-box var(--SHADOWCOLOR);
  pointer-events: none;
  z-index: 1;
}
[part="line"]::after {
  ---r: calc(-1 * var(--LINERADIUS));
  background: content-box var(--border-lineColor, var(--STROKECOLOR));
  pointer-events: none;
  z-index: 2;
}
[part="line"] .handle {
  position: absolute;
  pointer-events: auto;
  z-index: 2;

  /* outline: 1px dashed red; */
  /* outline-offset: -1px; */
}
:host([slot="top"]) [part="line"] .handle,
:host([slot="bottom"]) [part="line"] .handle {
  left:  var(--HOVERRADIUS);
  right: var(--HOVERRADIUS);
  top:    calc(-1 * var(--HOVERRADIUS));
  bottom: calc(-1 * var(--HOVERRADIUS));
}
:host([slot="left"]) [part="line"] .handle,
:host([slot="right"]) [part="line"] .handle {
  top:    var(--HOVERRADIUS);
  bottom: var(--HOVERRADIUS);
  left:  calc(-1 * var(--HOVERRADIUS));
  right: calc(-1 * var(--HOVERRADIUS));
}

/* CLIP */
[part="line"]::before {
  --c: calc(2 * var(--LINERADIUS) + var(--SHADOWRADIUS));
}
:host([slot="top"]:not(:hover)) [part="line"]::before {
  padding-left: calc(var(--border-clipTopLeft, 0) * var(--c));
  padding-right: calc(var(--border-clipTopRight, 0) * var(--c));
}
:host([slot="bottom"]:not(:hover)) [part="line"]::before {
  padding-left: calc(var(--border-clipBottomLeft, 0) * var(--c));
  padding-right: calc(var(--border-clipBottomRight, 0) * var(--c));
}
:host([slot="left"]:not(:hover)) [part="line"]::before {
  padding-top: calc(var(--border-clipTopLeft, 0) * var(--c));
  padding-bottom: calc(var(--border-clipBottomLeft, 0) * var(--c));
}
:host([slot="right"]:not(:hover)) [part="line"]::before {
  padding-top: calc(var(--border-clipTopRight, 0) * var(--c));
  padding-bottom: calc(var(--border-clipBottomRight, 0) * var(--c));
}

/* PORTS */
.ports {
  --border-lineColor: inherit;
  --port-dotColor: var(--border-lineColor);
}
[part="line"]:hover ~ .ports {
  --port-dotColor: var(--FOCUSCOLOR);
}
:host([slot="top"]) .ports::slotted(*) {
  --x: calc(clamp(0%, var(--offset), 100%));
  --y: var(--shift);
  --port-horizontal: 1;
}
:host([slot="bottom"]) .ports::slotted(*) {
  --x: calc(clamp(0%, var(--offset), 100%));
  --y: calc(100% - var(--shift));
  --port-horizontal: 1;
}
:host([slot="left"]) .ports::slotted(*) {
  --x: var(--shift);
  --y: calc(clamp(0%, var(--offset), 100%));
  --port-vertical: 1;
}
:host([slot="right"]) .ports::slotted(*) {
  --x: calc(100% - var(--shift));
  --y: calc(clamp(0%, var(--offset), 100%));
  --port-vertical: 1;
}
</style>

<dragg-able part="line"><div class="handle"></div></dragg-able>
<slot class="ports"></slot>
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
        this.shadowRoot.querySelector("[part='line']").title = this.getAttribute("name");
      }
    }
  }
  connectedCallback() {
    this.shadowRoot.addEventListener("dragg", this.ondragg);
    if ( this.style.getPropertyValue("--order") === "" )
      this.style.setProperty("--order", this.parentNode.querySelectorAll(`:scope > [slot="${this.slot}"]`).length-1);
  }
  disconnectedCallback() {
    this.shadowRoot.removeEventListener("dragg", this.ondragg);
  }

  get position() {
    let {offsetLeft, offsetTop, offsetWidth, offsetHeight} = this.shadowRoot.querySelector("[part='line']");
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
    if ( event.target.matches("[part='line']") && event.target.getRootNode() === this.shadowRoot ) {
      if ( (this.style.getPropertyValue("--order") || "0") === "0" )
        return;

      event.stopPropagation();
      event.detail.register(this.onreorder(this.slot));
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

  /* controlled variables:
  --port-shadowVisible
  --port-dotVisible
  --port-cursor
  --port-dotColor
  --port-filledColor
  --port-horizontal
  --port-vertical
  */
}
:host(:hover) {
  z-index: 5;
}

/* VIEW */
[part="dot"] {
  position: absolute;
  left: var(--x);
  top: var(--y);
  cursor: var(--port-cursor, pointer);
}
[part="dot"]::before, [part="dot"]::after {
  content: "";
  display: block;
  position: absolute;
  top: var(---r);
  left: var(---r);
  right: var(---r);
  bottom: var(---r);
}
[part="dot"]::before {
  ---r: calc(-1 * (var(--DOTRADIUS) + var(--SHADOWRADIUS)));
  background: content-box var(--SHADOWCOLOR);
  pointer-events: none;
  opacity: var(--port-shadowVisible, var(--port-dotVisible, 1));
  z-index: 1;
}
[part="dot"]::after {
  box-sizing: border-box;
  ---r: calc(-1 * var(--HOVERRADIUS));
  border: calc(var(--HOVERRADIUS) - var(--DOTRADIUS)) solid transparent;
  background: content-box var(--port-dotColor, var(--STROKECOLOR));
  outline: var(--LINERADIUS) solid var(--port-filledColor, var(--port-dotColor, var(--STROKECOLOR)));
  outline-offset: var(---r);
  opacity: var(--port-dotVisible, 1);
  pointer-events: auto;
  z-index: 3;
}

/* CLIP */
:host(:not(:hover)) ::slotted([dir="top-left"]) {
  --border-clipBottomRight: 1;
  --border-clipBottomLeft: var(--port-horizontal, 0);
  --border-clipTopRight: var(--port-vertical, 0);
}
:host(:not(:hover)) ::slotted([dir="top-right"]) {
  --border-clipBottomLeft: 1;
  --border-clipBottomRight: var(--port-horizontal, 0);
  --border-clipTopLeft: var(--port-vertical, 0);
}
:host(:not(:hover)) ::slotted([dir="bottom-left"]) {
  --border-clipTopRight: 1;
  --border-clipTopLeft: var(--port-horizontal, 0);
  --border-clipBottomRight: var(--port-vertical, 0);
}
:host(:not(:hover)) ::slotted([dir="bottom-right"]) {
  --border-clipTopLeft: 1;
  --border-clipTopRight: var(--port-horizontal, 0);
  --border-clipBottomLeft: var(--port-vertical, 0);
}

[part="dot"]:hover, [part="dot"]:hover ~ .contents {
  --port-dotColor: var(--FOCUSCOLOR);
}
:host([type="hollow"]) {
  --port-filledColor: var(--SHADOWCOLOR);
}
:host([type="hidden"]) {
  --port-dotVisible: 0;
}
</style>

<dragg-able part="dot"></dragg-able>
<slot class="contents"></slot>
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
  attributeChangedCallback(name, old, value) {
    if ( old !== value ) {
      if ( name === "name" ) {
        this.shadowRoot.querySelector("[part='dot']").title = this.getAttribute("name");
      }
    }
  }
  connectedCallback() {
    this.shadowRoot.addEventListener("dragg", this.ondragg);
  }
  disconnectedCallback() {
    this.shadowRoot.removeEventListener("dragg", this.ondragg);
  }

  get offset() {
    return this.style.getPropertyValue("--offset");
  }
  set offset(offset) {
    this.style.setProperty("--offset", offset);
  }
  get position() {
    let {offsetLeft, offsetTop} = this.shadowRoot.querySelector("[part='dot']");
    return {left:offsetLeft, top:offsetTop};
  }
  makeShifter(side) {
    let parentWidth = this.offsetWidth;
    let parentHeight = this.offsetHeight;
    let original_offset = this.offset;

    let {left, top} = this.position;
    if ( side === "top" || side === "bottom" )
      return (shiftX, shiftY) => shiftX === undefined ? original_offset
                                 : `${100*Math.max(0, Math.min(left+shiftX, parentWidth))/parentWidth}%`;
    if ( side === "left" || side === "right" )
      return (shiftX, shiftY) => shiftY === undefined ? original_offset
                                 : `${100*Math.max(0, Math.min(top+shiftY, parentHeight))/parentHeight}%`;
  }
  ondragg(event) {
    if ( this.matches("l7-border > l7-port") ) {
      event.stopPropagation();
      event.detail.register(this.onmove(this.parentNode.slot));
    }
  }
  *onmove(side) {
    let shifter = this.makeShifter(side);
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
  --lineColor: var(--HOVERCOLOR);
}

/* PORT */
[part="port"] {
  --port-shadowVisible: 0;
}
:host(:hover) [part="port"] {
  --port-shadowVisible: initial;
  z-index: auto;
}

/* SEGMENTS */
.seg {
  --length: initial;
}
.seg::before {
  box-sizing: border-box;
  content: "";
  display: block;
  position: absolute;
  --r: calc(var(--LINERADIUS) + var(--SHADOWRADIUS));
  background: content-box var(--SHADOWCOLOR);
  pointer-events: none;
  z-index: 2;
}
.seg::after {
  box-sizing: border-box;
  content: "";
  display: block;
  position: absolute;
  --r: var(--HOVERRADIUS);
  border: calc(var(--r) - var(--LINERADIUS)) solid transparent;
  background: content-box var(--lineColor);
  pointer-events: auto;
  z-index: 2;

  /* outline: 1px dashed blue; */
  /* outline-offset: -1px; */
}
.seg:empty::before {
  --r: calc(var(--LINERADIUS) + var(--SHADOWRADIUS));
  border: var(--SHADOWRADIUS) solid var(--SHADOWCOLOR);
  background: content-box var(--lineColor);
  pointer-events: none;
}
.seg:empty::after {
  display: none;
}

/* CLIP */
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

/* HORIZONTAL */
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
  height: calc(2 * var(--r));
  width: calc(max(var(--l), -1 * var(--l)) + 2 * var(--r));
  left: calc(var(--x-) + min(0px, var(--l)) - var(--r));
  top: calc(var(--y-) - var(--r));
}
:host([dir="top"]) .seg.odd:empty::before,
:host([dir="left"]) .seg.even:empty::before,
:host([dir="right"]) .seg.even:empty::before,
:host([dir="bottom"]) .seg.odd:empty::before {
  mask-image: linear-gradient(to right, black var(--r), transparent),
              linear-gradient(to left, black var(--r), transparent);
  mask-size:  calc(0.5 * var(--l)) auto,
              calc(-0.5 * var(--l)) auto;
  mask-position: left var(--r) top 0,
                 right var(--r) top 0;
  mask-repeat: no-repeat, no-repeat;
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
                                    transparent 0, transparent var(--DASHLENGTH2));
  background-size: var(--DASHLENGTH2) auto;
  background-origin: content-box;
  background-clip: content-box;
  background-repeat: repeat-x;
}

/* VERTICAL */
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
  width: calc(2 * var(--r));
  height: calc(max(var(--l), -1 * var(--l)) + 2 * var(--r));
  top: calc(var(--y-) + min(0px, var(--l)) - var(--r));
  left: calc(var(--x-) - var(--r));
}
:host([dir="top"]) .seg.even:empty::before,
:host([dir="left"]) .seg.odd:empty::before,
:host([dir="right"]) .seg.odd:empty::before,
:host([dir="bottom"]) .seg.even:empty::before {
  mask-image: linear-gradient(to bottom, black var(--r), transparent),
              linear-gradient(to top, black var(--r), transparent);
  mask-size:  auto calc(0.5 * var(--l)),
              auto calc(-0.5 * var(--l));
  mask-position: left 0 top var(--r),
                 left 0 bottom var(--r);
  mask-repeat: no-repeat, no-repeat;
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
                                    transparent 0, transparent var(--DASHLENGTH2));
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

<l7-port part="port"></l7-port>
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
        if ( this.hasAttribute("from") )
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
    if ( this.hasAttribute("from") )
      return document.getElementById(this.getAttribute("from"));
    else
      return this;
  }
  get end() {
    if ( this.hasAttribute("to") )
      return document.getElementById(this.getAttribute("to"));
    else
      return this;
  }
  updateDelta() {
    let start = this.start, end = this.end;
    if ( !start || !end )
      return;

    let rect1 = start.getBoundingClientRect();
    let rect2 = end.getBoundingClientRect();
    let deltaX = rect2.left - rect1.left;
    let deltaY = rect2.top - rect1.top;
    if ( start.dir === "bottom" ) deltaY -= MINHEADLENGTH;
    if ( start.dir === "right" )  deltaX -= MINHEADLENGTH;
    if ( end.dir === "top" )      deltaY -= MINHEADLENGTH;
    if ( end.dir === "left" )     deltaX -= MINHEADLENGTH;

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
      path[0] = `${path[0]} + ${MINHEADLENGTH}px`;
    if ( path[path.length-1] )
      path[path.length-1] = `${path[path.length-1]} + ${MINHEADLENGTH}px`;

    return path;
  }
  getDefaultPath() {
    let start = this.start, end = this.end;
    if ( !start || !end )
      return "";

    switch ( `${start.dir} ${end.dir}` ) {
      // │ ┌─┐  ───┐
      // └─┘ │   ┌─┘
      //         └───
      case "bottom top":
      case "right left":
        return "max(0px, 50%) 50% min(0px, 100%) 50% max(0px, 50%)";

      case "top bottom":
      case "left right":
        return "min(0px, 50%) 50% max(0px, 100%) 50% min(0px, 50%)";

      // │ │    ───┐
      // └─┘    ───┘
      case "bottom bottom":
      case "right right":
        return "max(0px, 100%) 100% min(0px, 100%)";

      case "top top":
      case "left left":
        return "min(0px, 100%) 100% max(0px, 100%)";

      //    │        ┌──┐
      //  ┌─┘     ───┘  │
      //  └─────        │
      case "bottom left":
      case "right top":
        return "max(0px, 50%) min(0px, 100%) max(0px, 50%) max(0px, 50%) min(0px, 100%) max(0px, 50%)";

      case "top right":
      case "left bottom":
        return "min(0px, 50%) max(0px, 100%) min(0px, 50%) min(0px, 50%) max(0px, 100%) min(0px, 50%)";

      //    │
      //    └─┐
      //  ────┘
      case "bottom right":
      case "right bottom":
        return "max(0px, 50%) max(0px, 100%) max(0px, 50%) min(0px, 50%) min(0px, 100%) min(0px, 50%)";

      //  ┌──┐
      //  │  └───
      //  │
      case "top left":
      case "left top":
        return "min(0px, 50%) min(0px, 100%) min(0px, 50%) max(0px, 50%) max(0px, 100%) max(0px, 50%)";
    }
  }
});
