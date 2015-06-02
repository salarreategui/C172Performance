/*
 * Popup keypad.
 *
 * A calculator-style keypad for input for use when you are bouncing around in flight.
 *
 * The keypad appears when keypad.open() is called. the open function has 1 argument:
 *  - a function to call with the selected value as an argument when the user hits "done" or "cancel".
 *    The value is "undefined" if cancelled.
 *
 * The keypad is hidden when the final return function is called.
 *
 * The "fmt" argument has the following forms:
 * - "nx":	A number with up to x digits. No more than x can be entered. The digits are formatted with commas if more than 3 are entered.
 *			May be followed by a "-" to indicate negative values are allowed.
 * - "nx.y":A number with up to x integer digits and y faction digits. If more than x digits are entered,
 *			a "." is automatically put in so 29.92 can be entered as "2992".
 *			May be followed by a "-" to indicate negative values are allowed.
 * - "w":	Wind speed of the form "xxGyy". If more than 2 digits are entered, a G is automatically inserted.
 * - "d":	Wind direction of the form "xxxVyyy" or VRB. If more than 3 digits are entered a V is automatically inserted.
 *			VRB is a separate button. It will clear any existing entry. If digits are pressed, it will clear VRB.
 *
 * Note: This code relies on an external function fmtNum(number, digits) to provide formatted output for the values.
 * This needs to be converted to an internal function for a clean interface.
 */
var keypad = {
	/*
	 * open the keyboard.
	 */
	open: function (done, fmt, units) {
		var wrapper;
		var m;
		var html;
		var e;
		var i;
		var elts;

		assert(done, 'keypad.open: no done function');
		assert(this.doneFunc == null, 'keypad.open: keypad already open');
		// Record the parameters.
		this.fmt = fmt;
		m = fmt.match(/(w|d|n(\d+)(?:\.(\d+))?(-)?)/);
		assert(m && m.length >= 2, 'keypad.open: bad  format: '+fmt);
		this.type = m[1][0];
		this.num = m[2];
		this.frac = m[3];
		this.neg = m[4];
		this.doneFunc = done;

		wrapper = document.createElement('div');
		wrapper.id = 'kp-wrapper';
		wrapper.style.visibility = 'hidden';
		// set up the slide in/out transition
		// compute proper HTMl for keypad
		html = this.kpHeaderHtml;
		switch (this.type) {
		case 'n':
			if (this.frac && !this.neg) {
				html += this.fracKpHtml;
			} else if (this.frac && this.neg) {
				html += this.fracNegKpHtml;
			} else if (this.neg) {
				html += this.intNegKpHtml;
			} else {
				html += this.intKpHtml;
			}
			break;
		case 'd':
			html += this.windDirKpHtml;
			break;
		case 'w':
			html += this.windSpeedKpHtml;
			break;
		}
		wrapper.innerHTML = html;
		document.body.appendChild(wrapper);	// add the key pad to the document
		// setup the units indicator, if any
		getElt('kp-value').innerHTML = '';
		e = getElt('kp-units');
		if (units) {
			e.innerHTML = units;
			e.style.padding = '4px';
			e.style.width = '1px';
		} else {
			e.innerHTML = '';
			e.style.padding = '0px';
		}
		keypad.setWrapperPosition();	// position the keypad
		noClickDelay(wrapper);		// turn off click delay on touch devices
		setPrefixProperty(wrapper.style, 'transitionProperty', 'transform');
		wrapper.style.visibility = 'visible';
		// set event listeners on keypad pads. We actually set listeners on all the "td" elements
		// in the pad because Android doesn't accurately send event to targets with no listeners nearby.
		elts = wrapper.querySelectorAll('td[data-kpValue]');
		for (i = 0; i < elts.length; i++) {
			elts[i].addEventListener('click', this, false);
		}
		getElt('kp-done').addEventListener('click', this, false);
		getElt('kp-cancel').addEventListener('click', this, false);
		window.addEventListener('resize', this, true);
		keypad.slideIn();
	},

	/*
	 * Return true if there's an open keypad.
	 */
	isOpen: function () {
		return (this.doneFunc != null);
	},

	/***
	 * Internal variables and functions
	 ***/
	fmt: '',		// current format string
	type: '',		// current format type (first character of fmt)
	num: '',		// current integer digits in fmt
	frac: '',		// current fraction digits in fmt
	neg: '',		// current indication of negative values in fmt
	doneFunc: null,	// current done function
	appearDuration: '250ms',
	/*
	 * HTML for keypads
	 */
	kpHeaderHtml:	// keypad header HTML
		'<table id="kp-header" class="headerBar">'
			+'<tr>'
				+'<td><button id="kp-cancel">Cancel</button></td>'
				+'<td></td>'
				+'<td><button id="kp-done">Done</button></td>'
			+'</tr>'
		+'</table>'
		+'<div id="kp-valueBar">'
			+'<table><tr><td id="kp-value"></td><td id="kp-units"></td></tr></table>'
		+'</div>',
	intKpHtml:		// numeric keypad HTML
		'<table id="kp-pad">'
			+'<tr>'
				+'<td data-kpValue="7">7</td>'
				+'<td data-kpValue="8">8</td>'
				+'<td data-kpValue="9">9</td>'
			+'</tr><tr>'
				+'<td data-kpValue="4">4</td>'
				+'<td data-kpValue="5">5</td>'
				+'<td data-kpValue="6">6</td>'
			+'</tr><tr>'
				+'<td data-kpValue="1">1</td>'
				+'<td data-kpValue="2">2</td>'
				+'<td data-kpValue="3">3</td>'
			+'</tr><tr>'
				+'<td></td>'
				+'<td data-kpValue="0">0</td>'
				+'<td data-kpValue="b">&lArr;</td>'
			+'</tr>'
		+'</table>',
	intNegKpHtml:	// numeric keypad with +/- HTML
		'<table id="kp-pad">'
			+'<tr>'
				+'<td data-kpValue="7">7</td>'
				+'<td data-kpValue="8">8</td>'
				+'<td data-kpValue="9">9</td>'
			+'</tr><tr>'
				+'<td data-kpValue="4">4</td>'
				+'<td data-kpValue="5">5</td>'
				+'<td data-kpValue="6">6</td>'
			+'</tr><tr>'
				+'<td data-kpValue="1">1</td>'
				+'<td data-kpValue="2">2</td>'
				+'<td data-kpValue="3">3</td>'
			+'</tr><tr>'
				+'<td data-kpValue="+/-">+/-</td>'
				+'<td data-kpValue="0">0</td>'
				+'<td data-kpValue="b">&lArr;</td>'
			+'</tr>'
		+'</table>',
	fracKpHtml:	// numeric keypad with "." HTML
		'<table id="kp-pad">'
			+'<tr>'
				+'<td data-kpValue="7">7</td>'
				+'<td data-kpValue="8">8</td>'
				+'<td data-kpValue="9">9</td>'
			+'</tr><tr>'
				+'<td data-kpValue="4">4</td>'
				+'<td data-kpValue="5">5</td>'
				+'<td data-kpValue="6">6</td>'
			+'</tr><tr>'
				+'<td data-kpValue="1">1</td>'
				+'<td data-kpValue="2">2</td>'
				+'<td data-kpValue="3">3</td>'
			+'</tr><tr>'
				+'<td data-kpValue=".">&#8729;</td>'
				+'<td data-kpValue="0">0</td>'
				+'<td data-kpValue="b">&lArr;</td>'
			+'</tr>'
		+'</table>',
	fracNegKpHtml:	// numeric keypad with "." and +/- HTML
		'<table id="kp-pad">'
			+'<tr>'
				+'<td data-kpValue="7">7</td>'
				+'<td data-kpValue="8">8</td>'
				+'<td data-kpValue="9">9</td>'
			+'</tr><tr>'
				+'<td data-kpValue="4">4</td>'
				+'<td data-kpValue="5">5</td>'
				+'<td data-kpValue="6">6</td>'
			+'</tr><tr>'
				+'<td data-kpValue="1">1</td>'
				+'<td data-kpValue="2">2</td>'
				+'<td data-kpValue="3">3</td>'
			+'</tr><tr>'
				+'<td></td>'
				+'<td data-kpValue="0">0</td>'
				+'<td></td>'
			+'</tr><tr>'
				+'<td data-kpValue=".">&#8729;</td>'
				+'<td data-kpValue="+/-">+/-</td>'
				+'<td data-kpValue="b">&lArr;</td>'
			+'</tr>'
		+'</table>',
	windDirKpHtml:	// wind direction keypad
		'<table id="kp-pad">'
			+'<tr>'
				+'<td data-kpValue="7">7</td>'
				+'<td data-kpValue="8">8</td>'
				+'<td data-kpValue="9">9</td>'
			+'</tr><tr>'
				+'<td data-kpValue="4">4</td>'
				+'<td data-kpValue="5">5</td>'
				+'<td data-kpValue="6">6</td>'
			+'</tr><tr>'
				+'<td data-kpValue="1">1</td>'
				+'<td data-kpValue="2">2</td>'
				+'<td data-kpValue="3">3</td>'
			+'</tr><tr>'
				+'<td></td>'
				+'<td data-kpValue="0">0</td>'
				+'<td></td>'
			+'</tr><tr>'
				+'<td data-kpValue="V">V</td>'
				+'<td data-kpValue="VRB">VRB</td>'
				+'<td data-kpValue="b">&lArr;</td>'
			+'</tr>'
		+'</table>',
	windSpeedKpHtml:	// wind speed keypad
		'<table id="kp-pad">'
			+'<tr>'
				+'<td data-kpValue="7">7</td>'
				+'<td data-kpValue="8">8</td>'
				+'<td data-kpValue="9">9</td>'
			+'</tr><tr>'
				+'<td data-kpValue="4">4</td>'
				+'<td data-kpValue="5">5</td>'
				+'<td data-kpValue="6">6</td>'
			+'</tr><tr>'
				+'<td data-kpValue="1">1</td>'
				+'<td data-kpValue="2">2</td>'
				+'<td data-kpValue="3">3</td>'
			+'</tr><tr>'
				+'<td data-kpValue="G">G</td>'
				+'<td data-kpValue="0">0</td>'
				+'<td data-kpValue="b">&lArr;</td>'
			+'</tr>'
		+'</table>',

	/****
	 * Event handlers
	 ****/

	/*
	 * Main event handler
	 */
	handleEvent: function (e) {
		var v;

		switch(e.type) {
		case 'click':
			e.preventDefault();
			e.stopPropagation();
			if (e.currentTarget.id == 'kp-done') {
				keypad.done();
				return (true);
			}
			if (e.currentTarget.id == 'kp-cancel') {
				this.cancel();
				return (true);
			}
			v = e.currentTarget.getAttribute('data-kpValue');
			if (v) {
				keypad.click(v);
				return (true);
			}
			break;
		case 'transitionend':
		case 'webkitTransitionEnd':
			// the end of a slide out transition, close the keypad
			keypad.close();
			break;
		case 'resize':		// also works for orientation change
			keypad.setWrapperPosition();
			break;
		default:
			break;
		}
		return (false);
	},

	/*
	 * Handle button presses.
	 */
	click: function (v) {
		var elt = getElt('kp-value');
		var s = elt.innerHTML.replace(/,/g, '');			// remove commas

		switch (v) {
		case 'b':
			if (s == 'VRB') {
				s = '';
			} else {
				s = s.slice(0, -1);		// delete last character
			}
			elt.innerHTML = (this.type == 'n' && this.num > 3 && s.replace(/^-?(\d*).*/, '$1').length >= 3? fmtNum(s): s);
			break;
		case '+/-':
			elt.innerHTML = (s.indexOf('-') == 0 ? s.slice(1) : '-'+s);
			break;
		case '.':
			if (this.frac &&  s.indexOf('.') < 0) {
				elt.innerHTML += '.';
			}
			break;
		case 'G':
		case "V":
			if (s.indexOf(v) < 0) {
				elt.innerHTML += v;
			}
			break;
		case 'VRB':
			elt.innerHTML = 'VRB';
			break;
		default:
			switch (this.type) {
			case 'n':
				if (s.indexOf('.') < 0? s.replace(/-/, '').length < this.num: s.replace(/.*\./, '').length < this.frac) {
					elt.innerHTML = (this.num > 3 && s.replace(/^-?(\d*).*/, '$1').length >= 3? fmtNum(s+v): s+v);
				} else if (s.indexOf('.') < 0 && this.frac) {
					this.click('.');
					this.click(v);
				}
				break;
			case 'w':
				if (s.replace(/^\d*G/, '').length < 2) {
					elt.innerHTML = s+v;
				} else if (s.indexOf('G') < 0) {
					this.click('G');
					this.click(v);
				}
				break;
			case 'd':
				if (s == 'VRB') {
					elt.innerHTML = v;
				} else if (s.replace(/^\d*V/, '').length < 3) {
					elt.innerHTML = s+v;
				} else if (s.indexOf('V') < 0) {
					this.click('V');
					this.click(v);
				}
				break;
			}
		}
	},

	/*
	 * Handle the done button.
	 */
	done: function () {
		var s = getElt('kp-value').innerHTML.replace(',', '');

		if (!s) {
			// if there's no value, then this is equivalent to cancel.
			keypad.cancel();
			return;
		}
		keypad.doneFunc(this.type == "n"? parseFloat(s): s);
		keypad.slideOut();
	},

	/*
	 * Handle the cancel button.
	 */
	cancel: function () {
		keypad.doneFunc();
		keypad.slideOut();
	},

	/*
	 * Close the keypad.
	 */
	close: function () {
		var elts;
		var wrapper = getElt('kp-wrapper');

		keypad.doneFunc = null;		// mark closed
		elts = wrapper.querySelectorAll('td[data-kpValue]');
		for (i = 0; i < elts.length; i++) {
			elts[i].removeEventListener('click', this, false);
		}
		getElt('kp-done').removeEventListener('click', this, false);
		getElt('kp-cancel').removeEventListener('click', this, false);
		window.removeEventListener('resize', this, true);
		wrapper.removeEventListener(getPrefixEventName('transitionend'), this, false);
		document.body.removeChild(wrapper);
		delete (wrapper);
	},

	/*
	 * Position the keypad.
	 */
	setWrapperPosition: function () {
		var wrapper = getElt('kp-wrapper');

		// set the top of keypad at the bottom. the transform will make it visible.
		wrapper.style.top = window.innerHeight+'px';
		// center the keypad horizontally.
		wrapper.style.left = Math.round((window.innerWidth - wrapper.offsetWidth) / 2)+'px';
	},

	/*
	 * Make the keypad appear by sliding in from the bottom.
	 * Note: the top of keypad header should be set just below the bottom of the viewport.
	 */
	slideIn: function () {
		var wrapper = getElt('kp-wrapper');

		setPrefixProperty(wrapper.style, 'transitionTimingFunction', 'ease-out');
		setPrefixProperty(wrapper.style, 'transitionDuration', this.appearDuration);
		setPrefixProperty(wrapper.style, 'transform', 'translateY(-100%)');
	},

	/*
	 * Make the keypad disappear by sliding out the bottom.
	 * Note: the top of keypad header should be set just below the bottom of the viewport.
	 * The transition end event handler will destroy the keypad.
	 */
	slideOut: function () {
		var wrapper = getElt('kp-wrapper');

		wrapper.addEventListener(getPrefixEventName('transitionend'), this, false);
		setPrefixProperty(wrapper.style, 'transitionTimingFunction', 'ease-in');
		setPrefixProperty(wrapper.style, 'transitionDuration', this.appearDuration);
		setPrefixProperty(wrapper.style, 'transform', 'translateY(0)');
	}
};