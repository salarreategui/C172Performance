/*
 * Vernier Slider.
 *
 * The vernier slider is an input mechanism that allows quick entry of numeric input. Visually, it's a horizontal bar with a "knob" on it.
 * When the knob is touched or selected it can be slid horzontally. The left position represents the minumum numeric value and the right position
 * represents the maximum. There's a line with labeled "ticks" below the slider to show the position of intermediate values.
 *
 * The slider is set with a minimum increment. If the increment is small relative to the min and max, then it can be difficult to slide
 * to an exact value. The vernier feature allows the knob to be "turned" up and down as if it was a knob on a threaded bar to move it
 * increment by increment to the left or right.
 *
 * The slider appears when vslider.open() is called. the open function has 6 arguments:
 *  - the min value
 *	- the max value
 *  - the minimum increment
 *  - the increment in value for the ticks below the bar. If this positive, the incement is added to the minimum successively. If negative,
 *    the absolute value is used as a modulus. Tick are not drawn if they wind up very close to either end and tick labels won't show if
 *    they would wind up too close the the end as well.
 *  - the initial value (position) of the slider
 *  - a function to call with the selected value as an argument when the user hits "done" or "cancel". The value is "undefined" if cancelled.
 *
 * The slider is hidden when the final return function is called.
 *
 * Note: This code relies on an external funcction fmtNum(number, digits) to provide formatted output for the values. This needs to be converted
 * to an internal function for a clean interface.
 */
var vslider = {
	/*
	 * open the slider.
	 */
	open: function (min, max, incr, tick, value, done) {
		var ctx;
		var wrapper;
		var vpHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
		var style;

		// setup the div and canvas that hold the slider
		this.sliderY = this.valuePad + this.valueHeight + this.valuePad + this.knobHeight/2 + .5;
		this.tickBarY = this.sliderY + this.knobHeight/2 + this.valuePad + this.valueHeight + this.tickEndZone + this.tickHeight + .5;

		wrapper = document.createElement('div');
		wrapper.id = 'vs-wrapper';
		//wrapper.style.webkitTransitionProperty = '-webkit-transform';
		setPrefixProperty(wrapper.style, "transitionProperty", "transform");
		wrapper.innerHTML
			= '<table id="vs-header" class="headerBar">'
				+'<tr>'
					+'<td><button id="vs-cancel">Cancel</button></td>'
					+'<td><button id="vs-done">Done</button></td>'
				+'</tr>'
			+'</table>'
			+'<div id="vs-canvasWrapper"><canvas id="vs-canvas"></canvas></div>';
		document.body.appendChild(wrapper);
		style = window.getComputedStyle(getElt('vs-canvasWrapper'), '');
		this.canvasMargin =
			Number(style.paddingLeft.replace(/px/, '')) + Number(style.paddingRight.replace(/px/, ''));
		// Get the drawing context, if supported and clear the canvas.
		this.canvas = getElt("vs-canvas");
		if (this.canvas.getContext == undefined) {
			//canvas.innerHTML = "Please use a browser that supports HTML5 (IE9, Safari, Firefox, Chrome)";
			return;
		}
		this.canvas.height = this.canvas.clientHeight =
			this.tickBarY + (2 * this.valuePad);
		this.canvas.width = this.canvas.clientWidth = wrapper.clientWidth - this.canvasMargin;
		ctx = this.canvas.getContext('2d');
		// set up the slide in/out transition
		setPrefixProperty(wrapper.style, 'transitionProperty', 'transform');
		this.setWrapperPosition();
		// Fix for Android clearRect bug
		if (gDev.platform == "Android" && gDev.phoneGap) {
			this.canvas.width = 1;
			this.canvas.width = wrapper.clientWidth - 16;
		} else {
			ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		}
		// Record the VS parameters.
		this.min = Number(min);
		this.max = Number(max);
		this.incr = Number(incr);
		this.tick = Number(tick);
		this.done = done;
		// Check for how many fixed digits there are to the right of the "." in the increment.
		// This is how all the values will be displayed.
		if (incr.toString().indexOf(".") >= 0) {
			this.digits = incr.toString().length - 1 - incr.toString().indexOf(".");
		} else {
			this.digits = undefined;
		}
		// Draw the tick bar and the slider.
		this.prompt = false;
		this.value = Number(value);
		this.drawTickBar();
		this.drawSlider(this.value);
		// Listen for events.
		this.canvas.addEventListener(getPointerEventName('pointerdown'), this, false);
		noClickDelay(getElt('vs-cancel'));
		noClickDelay(getElt('vs-done'));
		getElt('vs-cancel').addEventListener('click', this, false);
		getElt('vs-done').addEventListener('click', this, false);
		window.addEventListener('orientationchange', this, true);
		window.addEventListener('resize', this, true);

		wrapper.style.visibility = "visible";
		this.slideIn();
		/*
		if (showHelp) {
			notice('Set input values by sliding the knob left or right along the bar.'
				+ '"Turn" the knob by stroking up or down along the knob to make fine adjustments.');
		}
		*/
	},

	/*
	 * Handle touch/mouse events.
	 */
	handleEvent: function (e) {
		var x, y, r;

		// Get the x and y values from the right place for the event.
		switch(e.type) {
		case "touchstart":
		case "touchmove":
		case "mousedown":
		case "mousemove":
			e.preventDefault();
			e.stopPropagation();
			r = this.canvas.getBoundingClientRect();
			x = this.getX(e) - r.left;
			y = this.getY(e) - r.top;
			break;
		case "touchend":
			x = y = undefined;
			break;
		case "mouseup":
		default:
			break;
		}
		// Handle each event type.
		switch (e.type) {
		case "mousedown":
		case "touchstart":
			// The start of a touch or mouse down movement.
			// If touching within the knob, don't move. Otherwise move the knob to the new position and turn off vernier mode.
			if (Math.abs(x - this.valueToX(this.value)) > this.vernierZone) {
				this.value = this.xToValue(x);
				this.vernier = false;
			} else {
				this.vernier = undefined;	// we'll figure this out when we see the initial motion
			}
			this.lastX = x;					// record x and y value to detect relative drag motion.
			this.lastY = y;
			this.lastValue = this.value;
			// Listen for movement and end events.
			this.canvas.addEventListener(getPointerEventName('pointermove'), this, false);
			this.canvas.addEventListener(getPointerEventName('pointerup'), this, false);
			// Redraw slider.
			this.prompt = false;
			this.drawSlider(this.value);
			break;
		case "mousemove":
		case "touchmove":
			if (Math.abs(y - this.sliderY) <= this.knobHeight / 2) {
				/*
				 * If the user touches the knob first, then vernier mode is determined by whether
				 * the movement slides horzontally more than vernierZone units or slides vertically
				 * more than vernierDelta units. If the horizontal limit happens first than vernier
				 * mode is disabled and the knob will follow horizontal movement and ignore vertical
				 * movement. If the veritical limit happens first then vernier mode is enabled and
				 * further horizontal movement is ignored. In vernier mode the slider moves slowly
				 * one increment left or right for each vernierDelta of vertical motion from the start.
				 * This simulates twisting the slider knob up or down on a threaded shaft.
				 * Up motion is right. Down motion is left. Once the vernier motion is determined,
				 * we stick with it until the mouse/touch is released.
				 */
				if (this.vernier == undefined) {
					if (Math.abs(x - this.lastX) >= this.vernierZone) {
						this.vernier = false;
					} else if (Math.abs(y - this.lastY) >= this.vernierDelta) {
						this.vernier = true;
					}
				}
				if (this.vernier != undefined) {
					if (this.vernier) {
						this.value = this.lastValue + this.incr * Math.round((this.lastY - y) / this.vernierDelta);
						this.value = Math.max(this.value, this.min);
						this.value = Math.min(this.value, this.max);
					} else {
						this.value = this.xToValue(x);
					}
					this.drawSlider(this.value);
				}
			} else if (y < 0 || y > this.canvas.height) {
				// Stop tracking if out of bounds.
				// XXX never fires because events are attached only to canvas
				this.canvas.removeEventListener(getPointerEventName('pointermove'), this, false);
				this.canvas.removeEventListener(getPointerEventName('pointerup'), this, false);
			}
			break;
		case "mouseup":
		case "touchend":
			// The end of a canvas selection. Stop listening for drag events.
			this.canvas.removeEventListener(getPointerEventName('pointermove'), this, false);
			this.canvas.removeEventListener(getPointerEventName('pointerup'), this, false);
			// tapping/clicking the top or bottom of the knob will move it one increment
			if (this.vernier == undefined) {
				if (Math.abs(this.lastY - this.sliderY) <= this.knobHeight / 2
				  && Math.abs(this.lastX - this.valueToX(this.value)) <= this.vernierZone) {
					if (this.sliderY - this.lastY > this.knobHeight / 4) {			// top
						this.value += this.incr;
						this.value = Math.min(this.value, this.max);
						this.drawSlider(this.value);
					} else if (this.lastY - this.sliderY > this.knobHeight / 4) {	// bottom
						this.value -= this.incr;
						this.value = Math.max(this.value, this.min);
						this.drawSlider(this.value);
					}
				}
			}
			break;
		case 'click':
			// Cancel or Done. Return a value on done or "undefined" on cancel.
			if (this.done) {
				if (e.currentTarget.id == 'vs-done') {
					if (this.digits != undefined) {
						var s = this.value.toString();
						this.done(s.substr(0, s.indexOf('.') + this.digits + 1));
					} else {
						this.done(this.value);
					}
				} else {
					this.done(undefined);
				}
			}
			this.slideOut();
			break;
		case 'transitionend':
		case 'webkitTransitionEnd':
			// the end of a slide out transition, close the slider
			this.close();
			break;
		case 'orientationchange':
		case 'resize':
			// redraw slider on orientation change
			this.setWrapperPosition();
			this.canvas.width = this.canvas.clientWidth = getElt('vs-wrapper').clientWidth - 16;
			this.drawTickBar();
			this.drawSlider(this.value);
			break;
		default:
			break;
		}
	},

	/*
	 * Internal configuration constants
	 */
	knobWidth: 20,
	knobHeight: 150,
	knurls: 6,			// # of knob knurls per 1/4 circumference
	valueWidth: 50,		// px width of value label
	valueHeight: 24,	// px height of value label
	valuePad: 7,		// px distance between displayed value and other stuff
	sliderEndPad: 28.5,	// px distance from slider end to side of canvas. Accomodates value label
	sliderFont: 'bold 12pt sans-serif',
	sliderBarWidth: 10,
	tickFont: 'bold 10pt sans-serif',
	tickHeight: 10,
	tickEndZone: 5,		// px distance from end below which no tick us drawn.
	vernierZone: 24,	// px distance from knob center where vernier operates
	vernierDelta: 20,	// vertical px distance to drag to move knob one horizontal increment
	vArrowSize: 16,		// vernier arrow size
	promptTime: 3,		// seconds to display help prompt
	canvasMargin: 0,	// margin between canvas area and edge. set from CSS.
	appearDuration: '250ms',

	/*
	 * Internal globals
	 */
	canvas: undefined,
	sliderY: undefined,		// vertical position of slider bar in pixels (45.5)
	tickBarY: undefined,	// veritcal position of tick bar in pixels (88.5)
	min: undefined,
	max: undefined,
	incr: undefined,
	tick: undefined,
	digits: undefined,
	value: undefined,
	vernier: undefined,		// vernier mode, undefined means mode hasn't been determined.
	lastX: undefined,
	lastY: undefined,
	lastValue: undefined,

	/*
	 * Internal functions.
	 */

	/*
	 * Draw the slider at the right X value.
	 * This is done by completely redrawing it. No hardware acceleration. This seems to work fine on iPad and browsers.
	 * Don't you just love modern processors?
	 */
	drawSlider:	function (value) {
		var sliderY = this.sliderY;
		var knobWidth = this.knobWidth;
		var knobHeight = this.knobHeight;
		var valueWidth = this.valueWidth;
		var valueHeight = this.valueHeight;
		var valuePad = this.valuePad;
		var sliderEndPad = this.sliderEndPad;
		var vArrowSize = this.vArrowSize;
		var ctx;
		var r, h, s, i;
		var x = this.valueToX(value);

		// Clear the old knob and slider bar area.
		ctx = this.canvas.getContext("2d");
		if (gDev.platform == "Android" && gDev.phoneGap) {
			// Fix for Android clearRect bug
			ctx.save();
			ctx.fillStyle = "white";	// add transparency?
			ctx.fillRect(0, 0, this.canvas.width, sliderY + knobHeight/2 + 1);
			ctx.restore();
		} else {
			ctx.clearRect(0, 0, this.canvas.width, sliderY + knobHeight/2 + 1);
		}
		ctx.strokeStyle = "black";
		// Draw the slider bar.
		ctx.save();
		ctx.lineWidth = this.sliderBarWidth;
		ctx.beginPath();
		ctx.moveTo(sliderEndPad, sliderY);
		ctx.lineTo(this.canvas.width - sliderEndPad, sliderY);
		ctx.stroke();
		ctx.restore();
		// Draw the knob outline
		ctx.save();
		ctx.beginPath();
		ctx.fillStyle = "grey";
		ctx.lineWidth = 1;
		r = knobWidth/2;
		h = knobHeight/2 - r;
		ctx.moveTo(x - r, sliderY - h);
		ctx.arc(x, sliderY - h, r, -Math.PI, 0);
		ctx.lineTo(x + r, sliderY + h);
		ctx.arc(x, sliderY + h, r, 0, -Math.PI);
		ctx.lineTo(x - r, sliderY - h);
		ctx.fill();
		ctx.stroke();
		ctx.restore();
		// Draw the knurl marks.
		// There are "knurls" marks per 1/2 knob (ie. 1/4 of the circumference) at even angular intervals.
		ctx.save();
		ctx.beginPath();
		ctx.lineWidth = 1;
		for (i = 1; i < this.knurls; i++) {
			c = Math.cos(i * Math.PI/(this.knurls * 2));
			ctx.moveTo(x - r, sliderY - (c * h));
			ctx.quadraticCurveTo(x - r, sliderY - (c * (h+r)), x, sliderY - (c * (h+r)));
			ctx.quadraticCurveTo(x + r, sliderY - (c * (h+r)), x + r, sliderY - (c * h));
			ctx.moveTo(x - r, sliderY + (c * h));
			ctx.quadraticCurveTo(x - r, sliderY + (c * (h+r)), x, sliderY + (c * (h+r)));
			ctx.quadraticCurveTo(x + r, sliderY + (c * (h+r)), x + r, sliderY + (c * h));
		}
		ctx.moveTo(x - r, sliderY);			// draw the last line across the middle.
		ctx.lineTo(x + r, sliderY);
		ctx.stroke();
		ctx.restore();
		// draw the vernier arrows
		ctx.save();
		ctx.fillStyle = "#C0D0FF";
		ctx.strokeStyle = "#C0D0FF";
		ctx.lineWidth = 3;
		// draw upper arrow head
		ctx.beginPath();
		ctx.moveTo(x, sliderY - h);
		ctx.lineTo(x + (vArrowSize / 2), sliderY - h + vArrowSize);
		ctx.lineTo(x - (vArrowSize / 2), sliderY - h + vArrowSize);
		ctx.lineTo(x, sliderY - h);
		ctx.fill();
		// draw upper arrow line
		ctx.beginPath();
		ctx.moveTo(x, sliderY - h + vArrowSize);
		ctx.lineTo(x, sliderY - h + (2 * vArrowSize));
		ctx.stroke();
		// draw lower arrow head
		ctx.beginPath();
		ctx.moveTo(x, sliderY + h);
		ctx.lineTo(x + (vArrowSize / 2), sliderY + h - vArrowSize);
		ctx.lineTo(x - (vArrowSize / 2), sliderY + h - vArrowSize);
		ctx.lineTo(x, sliderY + h);
		ctx.fill();
		// draw lower arrow line
		ctx.beginPath();
		ctx.moveTo(x, sliderY + h - vArrowSize);
		ctx.lineTo(x, sliderY + h - (2 * vArrowSize));
		ctx.stroke();
		ctx.restore();
		// draw "+" in upper arrow
		ctx.save();
		ctx.strokeStyle = "black";		// "+" and "-" color
		s = vArrowSize / 5;
		ctx.save();
		ctx.translate(x, sliderY - h + (4 * vArrowSize / 6));
		ctx.beginPath();
		ctx.moveTo(-s, 0); ctx.lineTo(s, 0);
		ctx.moveTo(0, -s); ctx.lineTo(0, s);
		ctx.stroke();
		ctx.restore();
		// draw "-" in lower arrow
		ctx.save();
		ctx.translate(x, sliderY + h - (4 * vArrowSize / 6));
		ctx.beginPath();
		ctx.moveTo(-s, 0); ctx.lineTo(s, 0);
		ctx.stroke();
		ctx.restore();
		ctx.restore();
		// Draw a box around the value
		ctx.save();
		ctx.beginPath();
		ctx.lineWidth = 1;
		ctx.strokeRect(x - (valueWidth/2), sliderY - ((knobHeight/2) + valuePad + valueHeight), valueWidth, valueHeight);
		ctx.restore();
		// Draw the value
		ctx.save();
		ctx.beginPath();
		ctx.font = this.sliderFont;
		ctx.textBaseline = "middle";
		ctx.textAlign = "center";
		ctx.fillText(fmtNum(value, this.digits), x, sliderY - ((knobHeight/2) + valuePad + valueHeight/2));
		ctx.restore();
		// Draw the prompt if required.
		if (this.prompt) {
			this.drawPrompt(value);
		}
	},

	/*
	 * Draw the bar at the bottome with tick marks.
	 */
	drawTickBar: function () {
		var tickBarY = this.tickBarY;
		var tickHeight = this.tickHeight;
		var tick = this.tick;
		var minX = this.valueToX(this.min);
		var maxX = this.valueToX(this.max);
		var i, x;
		var ctx;

		ctx = this.canvas.getContext("2d");
		ctx.font = this.tickFont;
		ctx.strokeStyle = "black";
		ctx.lineWidth = 2;
		// Draw the tick bar
		ctx.save();
		ctx.beginPath();
		ctx.moveTo(this.sliderEndPad, tickBarY);
		ctx.lineTo(this.canvas.width - this.sliderEndPad, tickBarY);
		ctx.stroke();
		// Draw the ticks
		if (!tick) {		// just draw max and min
			tick = this.max - this.min;
		}
		for (i = this.min; i <= this.max; ) {
			x = this.valueToX(i);
			// Draw the tick if it's not too close to either end.
			if (x == minX || x == maxX || (((x - minX) > this.tickEndZone) && ((maxX - x) > this.tickEndZone))) {
				ctx.beginPath();
				ctx.moveTo(x, tickBarY);
				ctx.lineTo(x, tickBarY - tickHeight);
				ctx.stroke();
				// Draw the tick label if it's not too close to either end.
				if (x == minX || x == maxX || ((x - minX) > this.valueWidth) && ((maxX - x) > this.valueWidth)) {
					ctx.beginPath();
					ctx.textBaseline = "bottom";
					ctx.textAlign = "center";
					ctx.fillText(fmtNum(i.toString(), this.digits), x, tickBarY - (tickHeight + this.valuePad));
				}
			}
			if (tick < 0) {								// modulus tick. start from a modulus. done first time through
				// assert(i == this.min, "vslider.drawTickBar()");
				tick = -tick;
				i = (Math.floor(i / tick) * tick);		// for modulus ticks, start from a modulus
			}
			if (i < this.max && i + tick > this.max) {	// next tick is beyond the max, do the max next
				i = this.max;
			} else {
				i += tick;
			}
		}
		ctx.restore();
	},

	/*
	 * Convert a slider value to an X offset in the canvas.
	 */
	valueToX: function (value) {
		var x;

		value = Math.max(value, this.min);
		value = Math.min(value, this.max);
		x = this.sliderEndPad + ((value - this.min) / (this.max - this.min)) * (this.canvas.width - (2 * this.sliderEndPad));
		return (Math.round(x));
	},

	/*
	 * Convert an X offset in the canvas to a slider value.
	 */
	xToValue: function (x) {
		var value;

		x = Math.max(x - this.sliderEndPad, 0);
		x = Math.min(this.canvas.width - (2 * this.sliderEndPad), x);
		value = this.min + (x / (this.canvas.width - 2 * this.sliderEndPad) * (this.max - this.min));
		return (Math.round(value/this.incr) * this.incr);
	},

	close: function () {
		var wrapper = getElt('vs-wrapper');

		// remove all the event listeners.
		wrapper.style.visibility = "hidden";
		this.canvas.removeEventListener(getPointerEventName('pointerdown'), this, false);
		this.canvas.removeEventListener(getPointerEventName('pointermove'), this, false);
		this.canvas.removeEventListener(getPointerEventName('pointerup'), this, false);
		getElt('vs-cancel').removeEventListener('click', this, false);
		getElt('vs-done').removeEventListener('click', this, false);
		wrapper.removeEventListener(getPrefixEventName('transitionend'), this, false);
		window.removeEventListener('orientationchange', this, true);
		window.removeEventListener('resize', this, true);
		document.body.removeChild(wrapper);
		delete (wrapper);
	},

	/*
	 * Position the slider.
	 */
	setWrapperPosition: function () {
		var wrapper = getElt('vs-wrapper');

		// set the top of keypad at the bottom. the transform will make it visible.
		wrapper.style.top = window.innerHeight+'px';
		// center the keypad horizontally.
		wrapper.style.left = Math.round((window.innerWidth - wrapper.offsetWidth) / 2)+'px';
	},

	/*
	 * Make the slider appear by sliding in from the bottom.
	 * Note: the top of slider header should be set just below the bottom of the viewport.
	 */
	slideIn: function () {
		var wrapper = getElt('vs-wrapper');

		setPrefixProperty(wrapper.style, 'transitionTimingFunction', 'ease-out');
		setPrefixProperty(wrapper.style, 'transitionDuration', this.appearDuration);
		setPrefixProperty(wrapper.style, 'transform', 'translateY(-100%)');
	},

	/*
	 * Make the slider disappear by sliding out the bottom.
	 * Note: the top of slider header should be set just below the bottom of the viewport.
	 * The transition end event handler will destroy the slider.
	 */
	slideOut: function () {
		var wrapper = getElt('vs-wrapper');

		wrapper.addEventListener(getPrefixEventName('transitionend'), this, false);
		setPrefixProperty(wrapper.style, 'transitionTimingFunction', 'ease-in');
		setPrefixProperty(wrapper.style, 'transitionDuration', this.appearDuration);
		setPrefixProperty(wrapper.style, 'transform', 'translateY(0)');
	},

	/*
	 * Get the event X coordinate.
	 */
	getX: function (e) {
		var x = getPointerX(e);

		// adjust screen coordinates for zoom
		if (document.body.style.zoom && document.body.style.zoom != 1) {
			x = x / document.body.style.zoom;
		}
		return (x);
	},

	/*
	 * Get the event Y coordinate.
	 */
	getY: function (e) {
		var y = getPointerY(e);

		// adjust screen coordinates for zoom
		if (document.body.style.zoom && document.body.style.zoom != 1) {
			y = y / document.body.style.zoom;
		}
		return (y);
	}
};