/**
 * Emulation of pre-IOS7 iPhone thumbwheels.
 *
 * Derived from: spinningwheels.js
 *	http://cubiq.org/spinning-wheel-on-webkit-for-iphone-ipod-touch/11
 *	Copyright (c) 2009 Matteo Spinelli, http://cubiq.org/
 *	Released under MIT license
 *	http://cubiq.org/dropbox/mit-license.txt
 *	Version 1.4 - Last updated: 2009.07.09
 */

/*
 * jslint browser: true, continue: true, eqeq: true, forin: true,
 * plusplus: true, regexp: true, sloppy: true, vars: true, white: true
 */
/*global typeOf: false, assert: false, range: false, round: false, roundMult: false, noClickDelay: false*/

/* XXX make the private methods private */

var thumbWheel = {
	/****
	 * Public methods
	 ****/

	/*
	 * Open a new thumbwheel instance.
	 * Each instance is created from scratch every time.
	 * Arguments:
	 *	wheels: an array of objects. Each object contains the following elements:
	 *		texts: an array of text to display for each position in the wheel.
	 *		selection: the index of the default selected text in the texts array.
	 *		style: (optional) a string specifying the style for this wheel separated by " ".
	 *			The style options are:
	 *			"left": left alignment.
	 *			"right": right alignment.
	 *			"center": center alignment.
	 *			"shrink": shrink this wheel to minimum width. Can be used in combination with above.
	 *		If no style is specified, then the leftmost wheel defaults to "right". The leftmost wheel
	 *		defaults to "left". Interior wheels default to "center shrink".
	 *	done: a function called when the thumbwheel completes.
	 *		The function argument is either an array of selected element indices,
	 *		or null if the thumbwheel is cancelled.
	 */
	open: function (wheels, done) {
		var html, ul, div;
		var wheelNum, wheel;
		var index;
		var vpWidth = Math.max(document.documentElement.clientWidth, window.innerWidth);
		var vpHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);

		assert(typeOf(wheels) == 'array', "thumbWheel.open: bad wheels arg");
		// record args and initialize
		this.wheels = wheels;
		this.doneFunc = done;
		this.wheelData = new Array(wheels.length);
		this.selections = new Array(wheels.length);
		// Create the main thumbwheel wrapper
		div = document.createElement('div');
		div.id = 'tw-wrapper';
		setPrefixProperty(div.style, 'transitionProperty', 'transform');
		div.innerHTML
			= '<table id="tw-header" class="headerBar">'
				+'<tr>'
					+'<td><button id="tw-cancel">Cancel</button></td>'
					+'<td><button id="tw-done">Done</button></td>'
				+'</tr>'
			+'</table>'
			+'<div id="tw-wheels-wrapper">'
				+'<div id="tw-wheels"></div>'
			+'</div>'
			+'<div id="tw-frame">'
				+'<div id="tw-frame-hi"></div>'
				+'<div id="tw-frame-mid"></div>'
				+'<div id="tw-frame-lo"></div>'
			+'</div>';
		document.body.appendChild(div);
		// record elements
		this.twWrapper = div;													// the TW wrapper
		this.twWheelsWrapper = document.getElementById('tw-wheels-wrapper');	// theels visible area
		this.twWheels = document.getElementById('tw-wheels');					// pseudo table element (inner wrapper)
		this.twFrame = document.getElementById('tw-frame');						// the wheel "bezel"
		this.twHeader = document.getElementById('tw-header');
		// adjust for header height
		this.twFrame.style.top
			= this.twWheelsWrapper.style.top
			= this.twHeader.offsetHeight+'px';
		this.twHeight = this.stdHeight + this.twHeader.offsetHeight - this.cellHeight;
		this.twWrapper.style.height = this.twHeight+'px';
		// Create HTML wheel elements
		for (wheelNum = 0; wheelNum < this.wheels.length; wheelNum++) {
			wheel = this.wheels[wheelNum];
			assert(typeOf(wheel.texts) == 'array', "thumbWheel.open: bad wheel");
			// Create the wheel
			ul = document.createElement('ul');
			html = '';
			for (index = 0; index < wheel.texts.length; index++) {
				html += '<li>'+wheel.texts[index]+'</li>';
			}
			ul.innerHTML = html;
			ul.setAttribute("data-tw-wheelNum", String(wheelNum));
			// create wheel container div
			div = document.createElement('div');
			// Add styles
			if (wheel.style) {
				div.className = wheel.style.trim().replace(/([^ ]+)/g, 'tw-$1');
			} else if (this.wheels.length == 1) {
				div.className = "tw-center";			// default single wheel
			} else if (wheelNum == 0) {
				div.className = "tw-right";				// default leftmost
			} else if (wheelNum == (this.wheels.length - 1)) {
				div.className = "tw-left";				// default rightmost
			} else {
				div.className = "tw-center tw-shrink";	// default interior
			}
			div.setAttribute("data-tw-wheelNum", String(wheelNum));
			div.appendChild(ul);
			// Append the wheel to the wrapper
			this.twWheels.appendChild(div);
			// setup the data for this wheel
			this.wheelData[wheelNum] = {};
			this.wheelData[wheelNum].yPosition = 0;
			this.wheelData[wheelNum].maxScroll = this.indexToPosition(wheel.texts.length - 1);
			this.wheelData[wheelNum].div = div;
			this.wheelData[wheelNum].ul = ul;
			this.wheelData[wheelNum].shrink = !!div.className.match('tw-shrink');
			this.wheelData[wheelNum].readonly =
				(wheel.texts.length <= 1 || !!(wheel.style && wheel.style.match(/readonly/)));
			// set the default transition for wheel movement
			setPrefixProperty(ul.style, 'transitionTimingFunction', 'cubic-bezier(0, 0, 0.2, 1)');
			// Place the wheel to its default position (if other than 0)
			this.selections[wheelNum] = range((wheel.selection || 0), 0, wheel.texts.length - 1);
			if (this.selections[wheelNum] > 0) {
				this.wheelSetPosition(wheelNum, this.indexToPosition(this.selections[wheelNum]));
			}
		}
		this.setWrapperPosition();
/*
		// Global events
		if (window.Touch) {
			document.addEventListener(getPointerEventName('pointerdown'), this, false);	// Prevent page scrolling
			document.addEventListener(getPointerEventName('pointermove'), this, false);	// Prevent page scrolling
		}
*/
		// Optimize on orientation change
		window.addEventListener('orientationchange', this, true);
		window.addEventListener('resize', this, true);
		// Cancel/Done buttons events
		noClickDelay(document.getElementById('tw-cancel'));
		noClickDelay(document.getElementById('tw-done'));
		document.getElementById('tw-cancel').addEventListener('click', this, false);
		document.getElementById('tw-done').addEventListener('click', this, false);
		// Scroll the wheels
		this.twFrame.addEventListener(getPointerEventName('pointerdown'), this, false);
		// make the thumbwheels appear
		this.slideIn();
	},

	/***
	 * Internal variables and functions
	 ***/

	/*
	 * Internal variables
	 */
	cellHeight: 44,			// also std header height
	stdHeight: 269,			// height of TW with std header
	friction: 0.001,
	appearDuration: '250ms',

	/****
	 * Event handlers
	 ****/

	/*
	 * Main event handler
	 */
	handleEvent: function (e) {
		switch (e.type) {
		case 'touchstart':
		case 'mousedown':
			e.preventDefault();
			e.stopPropagation();
			if (e.currentTarget.id == 'tw-frame') {
				this.handleScrollStart(e);
			}
			break;
		case 'touchmove':
		case 'mousemove':
			e.preventDefault();
			e.stopPropagation();
			if (e.currentTarget.id == 'tw-frame') {
				this.handleScrollMove(e);
			}
			break;
		case 'touchend':
		case 'mouseup':
			if (e.currentTarget.id == 'tw-frame') {
				this.handleScrollEnd(e);
			}
			break;
		case 'click':
			this.handleClickButton(e);
			break;
		case 'transitionend':
		case 'webkitTransitionEnd':
			if (e.target.id == 'tw-wrapper') {
				this.handleSlideTransitionEnd();
			} else {
				this.handleScrollTransitionEnd(e);
			}
			break;
		case 'orientationchange':
		case 'resize':
			this.setWrapperPosition();
			break;
		default:
			break;
		}
	},

	/*
	 * Wheel scroll start event handler.
	 */
	handleScrollStart: function (e) {
		var wheelNum;
		var rect = this.twWheels.getBoundingClientRect();
		var eventX = getPointerX(e) - rect.left;	// Clicked position minus left offset
		var eventY = getPointerY(e) - rect.top;	// Clicked position minus top offset
		var x, y;
		var style;

		// Find the clicked wheel
		x = 0;
		for (wheelNum = 0; wheelNum < this.wheelData.length; wheelNum++) {
			x += this.wheelData[wheelNum].div.offsetWidth;
			if (eventX < x) {
				break;
			}
		}
		assert(wheelNum < this.wheelData.length, "thumbWheel.handleScrollStart: can't find wheel");
		this.activeWheel = wheelNum;
		// If wheel is readonly do nothing
		if (this.wheelData[wheelNum].readonly) {
			this.twFrame.removeEventListener(getPointerEventName('pointermove'), this, false);
			this.twFrame.removeEventListener(getPointerEventName('pointerup'), this, false);
			return (true);
		}
		// remove any transitions in progress
		this.wheelData[wheelNum].ul.removeEventListener(getPointerEventName('transitionend'), this, false);	// Remove transition event (if any)
		setPrefixProperty(this.wheelData[wheelNum].ul.style, 'transitionDuration', '0');
		// Stop and hold wheel position
		style = window.getComputedStyle(this.wheelData[wheelNum].ul);
		y = this.getTranformTranslationY(getPrefixProperty(style, 'transform'));
		if (y != this.wheelData[wheelNum].yPosition) {
			this.wheelSetPosition(wheelNum, y);
		}
		// record the start position and time
		this.startY = eventY;
		this.scrollStartY = this.wheelData[wheelNum].yPosition;
		this.scrollStartTime = e.timeStamp;
		// follow the pointer
		this.twFrame.addEventListener(getPointerEventName('pointermove'), this, false);
		this.twFrame.addEventListener(getPointerEventName('pointerup'), this, false);
		return (true);
	},

	/*
	 * Wheel scroll move event handler.
	 */
	handleScrollMove: function (e) {
		var wheelNum = this.activeWheel;
		var rect = this.twWheels.getBoundingClientRect();
		var eventY = getPointerY(e) - rect.top;	// Clicked position minus top offset
		var distance = eventY - this.startY;

		this.wheelSetPosition(wheelNum, this.wheelData[wheelNum].yPosition + distance);
		this.startY = eventY;
	},

	/*
	 * Wheel scroll move event handler.
	 */
	handleScrollEnd: function (e) {
		var wheelNum = this.activeWheel;
		var time = e.timeStamp - this.scrollStartTime;
		var distance = this.wheelData[wheelNum].yPosition - this.scrollStartY;
		var position;

		// remove listeners for up/move events
		this.twFrame.removeEventListener(getPointerEventName('pointermove'), this, false);
		this.twFrame.removeEventListener(getPointerEventName('pointerup'), this, false);
		// If move is beyond wheel limits [-maxScroll, 0], then smoothly scroll to the nearest limit
		if (this.wheelData[wheelNum].yPosition > 0) {
			this.selections[wheelNum] = this.wheelGetIndex(wheelNum, 0);	// record selection
			this.wheelScrollToPosition(wheelNum, 0);						// move the wheel
			return (false);
		}
		if (this.wheelData[wheelNum].yPosition < this.wheelData[wheelNum].maxScroll) {
			this.wheelScrollToPosition(wheelNum, this.wheelData[wheelNum].maxScroll);
			// record selection
			this.selections[wheelNum] = this.wheelGetIndex(wheelNum, this.wheelData[wheelNum].maxScroll);
			return (false);
		}
		// a tap on a visible element will bring it to the selected area.
		if (Math.abs(distance) < 5 && time < 500) {
			// a tap on a visible element will bring it to the selected area, if in bounds
			distance = Math.round(this.twWheelsWrapper.clientHeight / 2) - this.startY;
			position = this.wheelData[wheelNum].yPosition + roundMult(distance, this.cellHeight);
			if (position <= 0 && position >= this.wheelData[wheelNum].maxScroll) {
				this.selections[wheelNum] = this.wheelGetIndex(wheelNum, position);	// record selection
				this.wheelScrollToIndex(wheelNum, this.selections[wheelNum]);		// move the wheel
			}
			// record selection
			return (false);
		}
		// Short drags, will simply realign to the nearest wheel
		if (Math.abs(distance) < this.cellHeight) {
			// record selection
			this.selections[wheelNum] = this.wheelGetIndex(wheelNum);		// record selection
			this.wheelScrollToIndex(wheelNum, this.selections[wheelNum]);	// move the wheel
			return (false);
		}
		// For larger movements, fake wheel decelerating after release
		time = (distance / time) / this.friction;		// t = v/a
		distance = (this.friction / 2) * (time * time);	// d = 1/2 * a*t^2
		if (time < 0) {
			time = -time;
			distance = -distance;
		}
		// compute new position.
		position = this.wheelData[wheelNum].yPosition + distance;
		// Limit at normal limits.
		position = range(position, this.wheelData[wheelNum].maxScroll, 0);
		// cut down time proportionally if computed distance would have been out of bounds
		time = time * ((position - this.wheelData[wheelNum].yPosition) / distance);
		// record selection and go to it
		this.selections[wheelNum] = this.wheelGetIndex(wheelNum, position);						// record selection
		this.wheelScrollToIndex(wheelNum, this.selections[wheelNum], Math.round(time) + 'ms');	// move the wheel
		return (true);
	},

	/*
	 * Wheel scroll transition end handler.
	 */
	handleScrollTransitionEnd: function (e) {
		var wheelNum = Number(e.target.getAttribute("data-tw-wheelNum"));

		e.target.removeEventListener(getPointerEventName('transitionend'), this, false);
		// wherever the scroll ended, move to the nearest real index
		this.wheelScrollToIndex(wheelNum, this.wheelGetIndex(wheelNum), '150ms');
		return (false);
	},

	/*
	 *	Done/Cancel button handler.
	 */
	handleClickButton: function (e) {
		if (this.doneFunc) {
			this.doneFunc(e.currentTarget.id == 'tw-cancel'? null: this.selections);
		}
		this.slideOut();
	},

	/*
	 * Slide out transition end handler.
	 * Destroy the thumbwheel after it slides out.
	 */
	handleSlideTransitionEnd: function () {
		// remove event handlers
		this.twWrapper.removeEventListener(getPointerEventName('transitionend'), this, false);
		this.twFrame.removeEventListener(getPointerEventName('pointerdown'), this, false);
		document.getElementById('tw-cancel').removeEventListener('click', this, false);
		document.getElementById('tw-done').removeEventListener('click', this, false);
/*
		if (window.Touch) {
			document.removeEventListener(getPointerEventName('pointerdown'), this, false);
			document.removeEventListener(getPointerEventName('pointermove'), this, false);
		}
*/
		window.removeEventListener('orientationchange', this, true);
		window.removeEventListener('resize', this, true);
		// destroy the current thumbwheel
		document.body.removeChild(this.twWrapper);
		// reset object pointer so that space can be reclaimed
		this.wheels = undefined;
		this.doneFunc = undefined;
		this.wheelData = undefined;
		this.selections = undefined;
		this.twWrapper = undefined;
		this.twWheelsWrapper = undefined;
		this.twWheels = undefined;
		this.twFrame = undefined;
		this.twHeader = undefined;
	},

	/****
	 * Internal non-event-handler methods
	 ****/

	/*
	 * Set up the wheel widths.
	 */
	setupWheelWidth: function () {
		var wheelNum;
		var n = 0;		// the number of non-shrink wheels
		var width = this.twWrapper.offsetWidth;

		// subtract the width of "shrink" wheels from the overall width and
		// compute the number of non-"shrink" wheels
		for (wheelNum = 0; wheelNum < this.wheelData.length; wheelNum++) {
			if (this.wheelData[wheelNum].shrink) {
				width -= this.wheelData[wheelNum].div.offsetWidth;
			} else {
				n++;
			}
		}
		// make the non-"shrink" wheels equal width
		if (n) {
			width = round(width / n)+"px";
			for (wheelNum = 0; wheelNum < this.wheelData.length; wheelNum++) {
				if (!this.wheelData[wheelNum].shrink) {
					this.wheelData[wheelNum].div.style.width = width;
				}
			}
		}
	},

	/*
	 * Move a wheel to a Y position, in pixels.
	 * Stops any scrolling transition thats in effect.
	 */
	wheelSetPosition: function (wheelNum, pos) {
		this.wheelData[wheelNum].yPosition = pos;
		setPrefixProperty(this.wheelData[wheelNum].ul.style, 'transform', 'translateY('+pos+'px)');
	},

	/*
	 * Smoothly scroll a wheel to a Y position, in pixels.
	 */
	wheelScrollToPosition: function (wheelNum, pos, runtime) {
		assert(pos <= 0 && pos >= this.wheelData[wheelNum].maxScroll, "wheelScrollToPosition: bad position");
		setPrefixProperty(this.wheelData[wheelNum].ul.style, 'transitionDuration', runtime ||'100ms');
		this.wheelSetPosition(wheelNum, pos || 0);
	},

	/*
	 * Smoothly scroll to a wheels to an index, in pixels.
	 */
	wheelScrollToIndex: function (wheelNum, index, runtime) {
		this.wheelScrollToPosition(wheelNum, this.indexToPosition(index), runtime);
	},

	wheelGetIndex: function (wheelNum, pos) {
		if (pos == undefined) {
			pos = this.wheelData[wheelNum].yPosition;
		}
		return (range(Math.round(-pos / this.cellHeight), 0, this.wheels[wheelNum].texts.length - 1));
	},

	indexToPosition: function (index) {
		return (-index * this.cellHeight);
	},

	/*
	 * Set the position of the wrapper on the screen
	 */
	setWrapperPosition: function () {
		var wrapper = this.twWrapper;

		// XXX in IE bottom scrollbar obscures a bit of of the wrapper for some reason.
		wrapper.style.top = window.innerHeight+'px';	// set at bottom. transform will make it visible.
		// center the thumbwheels if it doesn't take up the whole width
		if (wrapper.offsetWidth < window.innerWidth) {
			wrapper.style.left = Math.round((window.innerWidth - wrapper.offsetWidth) / 2)+'px';
		} else {
			wrapper.style.left = '0px';
		}
		this.setupWheelWidth();
	},

	/*
	 * Make the thumbwheels appear by sliding in from the bottom.
	 * Note: the top of thumbwheel header should be set just below the bottom of the viewport.
	 */
	slideIn: function () {
		var wrapper = this.twWrapper;

		setPrefixProperty(wrapper.style, 'transitionTimingFunction', 'ease-out');
		setPrefixProperty(wrapper.style, 'transitionDuration', this.appearDuration);
		setPrefixProperty(wrapper.style, 'transform', 'translateY(-100%)');
	},

	/*
	 * Make the thumbwheels disappear by sliding out the bottom.
	 * Note: the top of thumbwheel header should be set just below the bottom of the viewport.
	 * The transition end event handler will destroy the thumbwheel.
	 */
	slideOut: function () {
		var wrapper = this.twWrapper;

		wrapper.addEventListener(getPrefixEventName('transitionend'), this, false);
		setPrefixProperty(wrapper.style, 'transitionTimingFunction', 'ease-in');
		setPrefixProperty(wrapper.style, 'transitionDuration', this.appearDuration);
		setPrefixProperty(wrapper.style, 'transform', 'translateY(0)');
	},

	/****
	 * Helper functions
	 ****/

	/*
	 * Get the Y translation value from the current transform.
	 */
	getTranformTranslationY: function (string) {
		var type;

		string = String(string).trim();
		if (string == 'none') {
			return (0);
		}
		type = string.slice(0, string.indexOf('('));
		if (type == 'matrix3d') {
			return (Number(string.slice(9, -1).split(',')[13]));
		}
		if (type == 'matrix') {
			return (Number(string.slice(7, -1).split(',')[5]));
		}
		return (0);
	}
};