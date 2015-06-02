/*
 * Utility functions.
 * These should be independent of aircraft type and program infrastructure.
 */

/*
 * Constants
 */
var STD_ATM_HPA = 1013.25;			// Std atmosphere hPa
var STD_ATM_HG = 29.92;				// Std atmosphere Hg
var LBSPERGALJETA = 6.6667;			// lbs/gal Jet A
var LBSPERGALAVGAS = 6;				// lbs/gal aviation gas
var FTPERNM = 6076.1;				// feet per nautical mile
var FTPERM = 3.2808;				// feet per meter
var GALPERL = 0.26417;				// gallons per liter
var LBSPERKG = 2.2046;				// pounds per kilogram

/****
 * Utility functions
 ****/

/*
 * Complain if the assertion is not true.
 */
function assert (a, s) {
	if (!a) {
		alert("Assertion failure: " + s);
	}
}

/*
 * This typeOf function can detect built-in objects and null.
 */
function typeOf (value) {
	var s = typeof value;

	if (s === 'object') {
		if (value) {
			switch (Object.prototype.toString.call(value)) {
			case '[object Array]':
				s = 'array';
				break;
			case '[object RegExp]':
				s = 'regexp';
				break;
			case '[object Arguments]':
				s = 'arguments';
				break;
			case '[object Date]':
				s = 'date';
				break;
			}
		} else {
			s = 'null';
		}
	}
	return (s);
}

/*
 * Format a number with commas
 * If digits is given and greater than 0, then only that number of digits appear to the right of the decimal.
 * Modified from www.js-x.com
 */
function fmtNum (num, digits) {
	var x;
	var i;
	var len;
	var ret = "";

	if (typeof (num) == "string" && num.length == 0) {
		return (0);
	}
	if (!isValid(num)) {
		return ("-");
	}
	if (digits >= 0) {
		x = Math.abs(num).toFixed(digits).split("\.");
	} else {
		x = Math.abs(num).toString().split("\.");
	}
	len = x[0].length;
	for (i = len; i > 0; i--) {
		if ((len - i) % 3 == 0) {
			ret = "," + ret;
		}
		ret = x[0].substr(i - 1, 1) + ret;
	}
	ret = ret.substr(0, ret.length - 1);
	if (x.length > 1) {
		ret = ret + "." + x[1];
	}
	return ((num < 0? "-": "") + ret);
}

/*
 * Format minutes to HH:MM
 */
function fmtTime (min) {
	var hr;

	if (!isValid(min)) {
		return ("-:-");
	}
	min = Math.round(min);
	hr = Math.floor(min / 60);
	min -= hr * 60;
	return ((hr < 10? "0": "") + String(hr) + ":" + (min < 10? "0": "") + String(min));
}

/*
 * Format a heading
 */
function fmtHeading (h) {
	if (h < 10) {
		return ('00' + String(h));
	}
	if (h < 100) {
		return ('0' + String(h));
	}
	return (String(h));
}

/*
 * Find the display width of text in pixels.
 */
function textWidth(text, fontProp) {
	var elt;
	var width;
	var statVar = textWidth;		// static variables

	if (!statVar.elt) {
		// create a div that's technically visible, but in a place that's not displayed
		elt = statVar.elt = document.createElement("div");
		elt.style.position = "absolute";
		elt.style.left = "-999em";
		// style it
		elt.style.whiteSpace = "nowrap";
		elt.style.padding ="0px";
	} else {
		elt = statVar.elt;
	}
	elt.style.font = fontProp || "12px arial";
	elt.innerHTML = text;
	document.body.appendChild(elt);
	width = elt.clientWidth;
	document.body.removeChild(elt);
	return (width);
}

/*
 * This is a fake function so that fixImage.php can find image url's.
 */
function url (s) {
	return (s);
}

/*
 * Copy the enumerable properties of p to o, and return o.
 * If o and p have a property by the same name, o's property is overwritten.
 * This function does not handle getters and setters or copy attributes.
 */
function objectExtend (o, p) {
	var prop;

	for (prop in p) {
		o[prop] = p[prop];
	}
	return o;
}

/*
 * Copy the enumerable properties of p to o, and return o.
 * If o and p have a property by the same name, o's property is left alone.
 * This function does not handle getters and setters or copy attributes.
 */
function objectMerge (o, p) {
	var prop;

	for (prop in p) {
		if (!o.hasOwnProperty(prop)) {
			o[prop] = p[prop];
		}
	}
	return o;
}

/*
 * Copy the enumerable properties of o, and return o.
 * This function does not handle getters and setters or copy attributes.
 */
function objectCopy (o) {
	var ocopy = {};
	var prop;

	for (prop in o) {
		ocopy[prop] = o[prop];
	}
	return (ocopy);
}

/****
 * Rounding functions.
 * Can specify the number of digits to round to. Positive digits specify places to the right of
 * the decimal point and negative digits specify places to the left of the decimal point.
 ****/
function roundUp (value, digits) {
	var factor = 1;

	if (digits) {
		factor = Math.pow(10, digits);
	}
	return (Math.ceil(value * factor) / factor);
}

function roundDown (value, digits) {
	var factor = 1;

	if (digits) {
		factor = Math.pow(10, digits);
	}
	return (Math.floor(value * factor) / factor);
}

function round (value, digits) {
	var factor = 1;

	if (digits) {
		factor = Math.pow(10, digits);
	}
	return (Math.round(value * factor) / factor);
}

/*
 * These function round to a multiple. They use round() to digits to cut off any small
 * errors due floating point arithmetic.
 */

/*
 * Find the rightmost non-zero digit of the multiplier
 */
function _findDigits (mult) {
	var digits, n;

	mult = Math.abs(mult) || 1;
	digits = Math.floor(log10(mult));	// leftmost digit
	n = mult / Math.pow(10, digits);	// shift leftmost digit to ones position
	while (n - Math.round(n) > 0) {			// while there are digits in the fraction
		digits--;
		n *= 10;							// shift the next digit in the one's position
	}
	return (-digits);
}

function roundUpMult (value, mult) {
	return (round(Math.ceil(value / mult) * mult, _findDigits(mult)));
}

function roundDownMult (value, mult) {
	return (round(Math.floor(value / mult) * mult, _findDigits(mult)));
}

function roundMult (value, mult) {
	return (round(Math.round(value / mult) * mult, _findDigits(mult)));
}

/*
 * Log base 10.
 */
function log10 (n) {
	return (Math.log(n)/Math.log(10));
}

/*
 * Get a single digit from a value.
 * digit == 0 for the units digit, increasing for digits to the left and decreasing for digits to right of the decimal point.
 * getDigit(12.34, -1) == 3
 */
function getDigit (value, digit) {
	return (Math.floor((Math.abs(value) / Math.pow(10, digit)) % 10));
}

/*
 * Get a set of digits from a value
 * getDigits(12.34, 1, 2) == 12.
 */
function getDigits (value, digit, len) {
	return (Math.floor((Math.abs(value) / Math.pow(10, digit - (len - 1))) % Math.pow(10, len)));
}

/*
 * Add a new value to an average.
 * avg = addAverage(avg, value, n);
 */
function addAverage (avg, value, n) {
	return (((n-1) * avg + value) / n);
}

function lineLength (dx, dy) {
	return (Math.sqrt((dx * dx) + (dy * dy)));
}

/****
 * Local browser storage functions
 * Uses HTML5 local storage, if available. Cookies otherwise.
 ****/

/*
 * Set a key to a value.
 */
function setStorage (key, value) {
	var SAVEDAYS = 3650;			// Save for 10 years

	if (window.localStorage) {
		localStorage.setItem(key, value);
	} else {
		setCookie(key, value, SAVEDAYS);
	}
}

/*
 * Get a value associated witha key.
 */
function getStorage (key) {
	if (window.localStorage) {
		return localStorage.getItem(key);
	}
	return getCookie(key);
}

/*
 * Delete a key.
 */
function deleteStorage (key) {
	if (window.localStorage) {
		localStorage.removeItem(key);
	} else {
		setCookie(key, 0, 0);
	}
}

/*
 * Delete all stored keys.
 */
function clearStorage () {
	if (window.localStorage) {
		localStorage.clear();
	} else {
		var cookies = document.cookie.split(";");
		var cookie;

		while ((cookie = cookies.shift()) != undefined) {
			document.cookie = cookie.replace(/\=.*/, "") + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
		}
	}
}

/*
 * get and set cookies
 */
function setCookie (cName, value, expireDays) {
	var exdate=new Date();

	exdate.setDate(exdate.getDate() + expireDays);
	document.cookie = cName + "=" + encodeURIComponent(value)
		+ ((expireDays === null)? "": "; max-age=" + (expireDays * 60*60*24) + "; expires=" + exdate.toGMTString());
}

function getCookie (cName) {
	var cStart; var cEnd;

	if (document.cookie.length > 0) {
		cStart = document.cookie.indexOf(cName + "=");
		if (cStart != -1) {
			cStart = cStart + cName.length + 1;
			cEnd = document.cookie.indexOf(";", cStart);
			if (cEnd == -1) {
				cEnd = document.cookie.length;
			}
			return decodeURIComponent(document.cookie.substring(cStart, cEnd));
		}
	}
	return ("");
}

/*
 * compare two version strings of the form "X.Y.Z...".
 * Returns 0 if a==b; >0 if a>b; and <0 if a<b.
 * Comp sets how much of the version is compared
 * Comp=0 compares only the major version (e.g. X), comp=1 compares major and minor (X.Y) etc.
 */
function versionCompare (a, b, comp) {
	var va, vb;
	var i;

	if (!b) {
		return (1);
	}
	if (!a) {
		return (-1);
	}
	va = a.split(".");
	vb = b.split(".");
	if (comp == undefined) {
		comp = va.length;
	}
	for (i = 0; i < Math.min(va.length, vb.length); i++) {
		if (va[i] != vb[i] || i == comp) {
			return (va[i] - vb[i]);
		}
	}
	return (va.length - vb.length);
}

/********
 * DOM functions
 ********/

/*
 * Get an element and complain if it doesn't exist.
 */
function getElt (s) {
	var e;

	e = document.getElementById(s);
	assert(e, "Bad object ID:" + s);
	return (e);
}

/*
 * Log a console message.
 * Uses HTML element if console.log() doesn't exist or if forced.
 */
function logMsg (s) {
	if (window.console && window.console.log) {
		window.console.log(s);
	}
	// document.getElementById("Console").innerHTML = document.getElementById("Console").innerHTML + s + ' ';
}

/*
 * Log an event with a time stamp
 */
function logEventTime (s, deltaStart) {
	var now = new Date();
	var statVar = logEventTime;

	now = now.getTime();
	if (!statVar.start) {
		statVar.start = gStart.getTime();
		statVar.last = statVar.start;
	}
	logMsg("Time: "+(now - statVar.start)+"ms (+"+(now - statVar.last)+"ms"
		+(deltaStart? " delta: "+(now - deltaStart)+"ms" :"")
		+"): "+s
	);
	statVar.last = now;
	return (now);
}

/*
 * Add a CSS class to an element
 */
function addCSSClass (elt, className) {
	var a = elt.className.split(/\s+/);

	if (elt.className.match(className)) {
		return;		// already has it
	}
	a.push(className);
	elt.className = a.join(" ");
}

/****
 * Functions to get/set/show/hide different HTML elements.
 ****/

/*
 * Show or hide an element.
 * if "show" is "toggle", toggle the elements visibility.
 * Otherwise set visibility based on "show" true or false.
 * If style is given, it's the display setting to use when visible.
 */
function showElt (id, show, style) {
	var e = getElt(id);

	if (!style) {
		switch (e.nodeName.toLowerCase()) {
		case "table":
			style = "table";
			break;
		case "td":
			style = "table-cell";
			break;
		case "tr":
			style = "table-row";
			break;
		case "div":
			style = "block";
			break;
		case "span":
			style = "inline";
			break;
		default:
			style = "";
			break;
		}
	}
	if (show =="toggle") {
		e.style.display = (e.style.display == "none"? style: "none");
	} else {
		e.style.display = (show? style: "none");
	}
}

/*
 * Show or hide a class of elements.
 */
function showClass (c, show, style) {
	var elts, i;

	// Set the style to "none" if show is false.
	// If show is true, leave it alone if defined, or set it to "" if undefined.
	style = (!show? "none": (style == undefined? "": style));
	// Set the stlye of all the elements in the class.
	elts = document.getElementsByClassName(c);
	for (i = 0; i < elts.length; i++) {
		elts[i].style.display = style;
	}
}

/*
 * Show or hide the span encloses an element.
 * If the element is not enclosed by a span, it will assert.
 */
function showSpan (id, show, style) {
	var e = getParentTag(id, "span");

	// Set the style to "none" if show is false, "" otherwise.
	e.style.display = (!show? "none": (style == undefined? "": style));
}

/*
 * Show or hide the table row that encloses an element.
 * If the element is not enclosed by a table row, it will assert.
 */
function showRow (id, show) {
	var e = document.getElementById(id+"Row");

	if (!e) {
		e = getParentTag(id, "tr");
	}
	// Set the style to "none" if show is false, "" otherwise.
	e.style.display = (show? "table-row": "none");
}

/*
 * Show or hide the table cell that encloses an element.
 * If the element is not enclosed by a table cell, it will assert.
 */
function showCell (id, show) {
	var e = getParentTag(id, "td");

	// Set the style to "none" if show is false, "" otherwise.
	e.style.display = (show? "table-cell": "none");
}

/*
 * Return the enclosing element with a given tag for an element.
 * E.g. getParentTag("id", "tr") returns enclosing table row.
 */
function getParentTag (id, tag) {
	var e = getElt(id);

	while (e.nodeName.toLowerCase() != tag && e.nodeName.toLowerCase() != "body") {
		e = e.parentNode;
	}
	assert(e.nodeName.toLowerCase() == tag, "getParentTag: no parent found with tag: "+tag+", for id: "+id);
	return (e.nodeName.toLowerCase() == tag? e: null);
}

/*
 * Set the contents of the next sibling <td> cell.
 */
function setNextTableEntry (id, html) {
	var e = getElt(id);

	// Find the enclosing <td> element.
	while (e.nodeName.toLowerCase() != "td") {
		assert(e.nodeName.toLowerCase() != "body", "setNextTableEntry: no td found");
		e = e.parentNode;
	}
	e = e.nextElementSibling;
	assert(e && e.nodeName.toLowerCase() == "td", "setNextTableEntry: no next td found");
	e.innerHTML = html;
}

/*
 * Go through all the leaf nodes and count the number of nodes for which the supplied
 * function is true.
 */
function countLeafNodes (root, fn) {
	var i;
	var count = 0;

	forEachInTree(root,
		function (elt) {
			if (fn(elt)) {
				count++;
			}
		}
	);
	return (count);
}

function forEachInTree (elt, fn, arg) {
	var i;

	if (elt.childNodes.length > 0) {
		for (i = 0; i < elt.childNodes.length; i++) {
			forEachInTree(elt.childNodes[i], fn, arg);
		}
	} else {
		fn(elt, arg);
	}
}

/*
 * Center an element in the viewport.
 */
function centerElt (id) {
	var elt = getElt(id);
	var r = elt.getBoundingClientRect();

	elt.style.top = round((window.innerHeight - r.height) / 2)+'px';
	elt.style.left = round((window.innerWidth - r.width) / 2)+'px';
}

/*
 * Return an element style property with the correct prefix for the current browser.
 * If prefixOnly is set, it just returns the prefix.
 */
function prefixProperty(o, prop, prefixOnly) {
	var i;
	var p;
	var vendorPrefixes = ["webkit"];

	if (prop in o) {
		return (prefixOnly? "": prop);
	}
	// Capitalize the first letter
	prop = prop.replace(/^./, function (t) {return(t.toUpperCase());});
	for (i = 0; i < vendorPrefixes.length; i++) {
		p = vendorPrefixes[i]+prop;
		if (p in o) {	// could use document.body.style
			return (prefixOnly ? vendorPrefixes[i] : p);
		}
	}
	return (null);
}

/*
 * Set a property that may have a browser-dependent prefix.
 */
function setPrefixProperty (o, prop, value) {
	var pprop = prefixProperty(o, prop, false);
	var prefix;

	// if transitionProperty, then test the prefix of the value
	if (prop == "transitionProperty") {
		prefix = prefixProperty(o, value, true);
		if (prefix) {
			value = "-"+prefix+"-"+value;	// add prefix: e.g. -webkit-transform
		}
	}
	o[pprop] = value;
}

/*
 * Get a property that may have a browser-dependent prefix.
 */
function getPrefixProperty (o, prop) {
	var pprop = prefixProperty(o, prop, false);
	var prefix;
	var value;

	value = o[pprop];
	// if transitionProperty, then remove any prefixes from the returned value
	if (prop == "transitionProperty") {
		value = value.replace(/\\b-\w*-/g, "");
	}
	return (value);
}

/*
 * Get the name of an event that may have a browser-dependent prefix.
 */
function getPrefixEventName (evtName) {
	switch (evtName) {
	case "transitionend":
		if (prefixProperty(document.body.style, "transitionProperty", true) == "webkit") {
			evtName = "webkitTransitionEnd";
		}
		break;
	default:
		break;
	}
	return (evtName);
}

/*
 * Get the real name of a pointer event.
 */
function getPointerEventName (evtName) {
	switch (evtName) {
	case "pointerdown":
		evtName = window.Touch? 'touchstart': 'mousedown';
		break;
	case "pointerup":
		evtName = window.Touch? 'touchend': 'mouseup';
		break;
	case "pointermove":
		evtName = window.Touch? 'touchmove': 'mousemove';
		break;
	}
	return (evtName);
}

/*
 * Get the X value out of a pointer event object.
 */
function getPointerX (e) {
	var value;

	switch(e.type) {
	case "touchstart":
	case "touchmove":
	case "touchend":
		value = e.targetTouches[0].clientX;
		break;

	default:
		value = e.clientX;
		break;
	}
	return (value);
}

/*
 * Get the Y value out of a pointer event object.
 */
function getPointerY (e) {
	var value;

	switch(e.type) {
	case "touchstart":
	case "touchmove":
	case "touchend":
		value = e.targetTouches[0].clientY;
		break;

	default:
		value = e.clientY;
		break;
	}
	return (value);
}

/****
 * Conversion functions.
 ****/

/*
 * Convert from degrees to radians.
 */
function degToRad (angle) {
	return (angle * Math.PI / 180);
}

/*
 * Convert from radians to degrees.
 */
function radToDeg (rad) {
	return (rad * 180 / Math.PI);
}

/*
 * Convert from percentage slope to radians.
 */
function pctToRad (pct) {
	return (Math.atan(pct / 100));
}

/*
 * Convert Celsius to Fahrenheit.
 */
function degCToF (C) {
	return (32 + C*(212-32)/100);
}

/*
 * Compute standard temp at a pressure altitude
 */
function stdTemp (pa) {
	return (15 - 1.981 * pa / 1000);
}

/*
 * Compute degrees above/below standard temp for that pressure altitude.
 */
function stdTempDiff (pa, oat) {
	return (oat - stdTemp(pa));
}

/*
 * Compute the Pressure Altitude.
 */
function pressureAlt (altitude, altimeter) {
	if (altitude >= 18000) {
		return (altitude);
	}
	return (altitude - (altimeter - 29.92) * 1000);
}

/*
 * Compute the Density Altitude.
 */
function densityAlt (pa, oat) {
	return (145426 * (1 - Math.pow(Math.pow((288.16 - 1.981*pa/1000)/288.16, 5.2563) / ((273.16 + oat)/288.16), 0.235)));
}

/*
 * Convert hectopascals to inches of mercury
 */
function hpaToInhg (hPa) {
	return (round(hPa * STD_ATM_HG/STD_ATM_HPA, 2));
}

/*
 * Convert inches of mercury to hectopascals
 */
function inhgToHpa (hg) {
	return (round(hg * STD_ATM_HPA/STD_ATM_HG));
}

/*
 * Convert meters to feet
 */
function mToFt (m) {
	return (round(m * FTPERM));
}

/*
 * Convert feet to meters
 */
function ftToM (ft) {
	return (round(ft / FTPERM));
}

/*
 * Convert liters to gallons
 */
function lToGal (l) {
	return (round(l * GALPERL));
}

/*
 * Convert gallons to liters
 */
function galToL (gal) {
	return (round(gal / GALPERL));
}

/*
 * Convert kilograms to pounds
 */
function kgToLbs (kg) {
	return (round(kg * LBSPERKG));
}

/*
 * Convert pounds to kilograms
 */
function lbsToKg (lbs) {
	return (round(lbs / LBSPERKG));
}

/*
 * Convert Calibrated airspeed to True airspeed.
 */
function casToTAS (cas, pa, sat) {
	var M = casToMach(cas, pa);				// speed in Mach
	var CS;									// speed of sound at altitude
	var KC0 = 273.15;						// 0 Celcius in Kelvin

	if (M >= 1) {							// must be subsonic
		return (NaN);
	}
	CS = 38.967854 * Math.sqrt(sat + KC0);
	return (M * CS);
}

/*
 * Convert True airspeed to Calibrated airspeed
 */
function tasToCAS (tas, pa, sat) {
	var M;									// speed in Mach
	var CS;									// speed of sound at altitude
	var CS_0 = 661.4786;					// std speed of sound @ sea level in kts.
	var KC0 = 273.15;						// 0 Celsius in Kelvin

	if (pa > 36089) {
		return (NaN);						// this computation is only valid below this pressure altitude
	}
	CS = 38.967854 * Math.sqrt(sat + KC0);
	M = tas / CS;
	return (CS_0
		* Math.sqrt(5
			* (Math.pow(1
				+ Math.pow(1 - 6.8755856E-6 * pa, 5.2558797)
				* (Math.pow(1 + Math.pow(M, 2)/5, 3.5) -1)
				, 2/7
			) - 1)
		)
	);
}

/*
 * Compute Static Air Temperature from Indicated Air Temperature, given true airspeed.
 */
function iatToSAT (iat, tas) {
	return (iat - ramRise(tas));
}

/*
 * Compute Indicated Air Temperature from Static Air Temperature, given true airspeed.
 */
function satToIAT (sat, tas) {
	return (sat + ramRise(tas));
}

/*
 * Compute the temperature rise at the temperature probe with speed due to compression and friction.
 * From http://en.wikipedia.org/wiki/Total_air_temperature
 */
function ramRise (tas) {
	return (tas * tas / 7569);
}

/*
 * Compute speed in Mach from calibrated airspeed and pressure altitude.
 */
function casToMach (cas, pa) {
	var DP;									// delta pressure in ASI
	var P;									// pressure at alt. in lb/sqft
	var P_0 = 2116.2166;					// std sea level air pressure in lb/sqft
	var CS_0 = 661.4786;					// std speed of sound @ sea level in kts.

	DP = P_0 * (Math.pow(1 + 0.2 * Math.pow(cas/CS_0, 2), 3.5) - 1);
	P = P_0 * Math.pow(1 - 6.8755856E-6 * pa, 5.2558797);
	return (Math.sqrt(5 * (Math.pow(DP/P + 1, 2/7) - 1)));
}

/*
 * Cold weather altitude adjustment.
 * When the temperature is below standard conditions the true altitude will be LOWER
 * than the indicated altitude. This computes an amount, in feet, that should be added
 * to a charted height above airport (HAA).
 */
function coldAltAdj (haa, isa) {
	if (isa >= 0) {
		return (0);
	}
	return (roundUp(haa * -isa * 0.004, -1));	// round up to 10'
}

/*
 * Compute the glide distance as affected by wind.
 * The glide ratio is fixed (i.e. the slope of the glide) so that the distance covered
 * for a given altitude drop remains contant throughout the glide. However, the time for
 * a given altitude drop changes because the TAS changes as altitude drops for a fixed
 * glide IAS.
 */
function glideDistance (glideRatio, ias, hwind, alt, dalt, isa) {
	var a;
	var time;
	var dist = 0;
	var wdelta = (hwind >= 0? 0: 1000 * hwind / (alt - dalt));

	// Compute the total time for the glide. We divide the glide into 1000' altitude
	// segments from the initial altitude to the destination altitude and then compute
	// the time for each segment.
	for (a = alt; a >= dalt + 1000; a -= 1000) {
		time = glideRatio * 1000 / casToTAS(ias, a, stdTemp(a) + isa);
		dist -= time * hwind;
		hwind -= wdelta;
	}
	// Add time to cover any remaining segment of less than 1000' above the destination altitude.
	if (a > dalt) {
		time = glideRatio * (a - dalt) / casToTAS(ias, pa, stdTemp(a) + isa);
		dist -= time * hwind;
	}
	// The glide distance is the no-wind glide distance, with the distance any headwind
	// moved the plane over the glide time subtracted out. If the headwind is negative
	// (a tailwind) this adds to the glide distance.
	return ((glideRatio * (alt - dalt)) + dist);
}

/*
 * Compute a headwind component.
 */
function headwind (angle, wind) {
	return (Math.cos(degToRad(angle)) * wind);
}

/*
 * Compute a cross-wind component.
 */
function crosswind (angle, wind) {
	return (Math.sin(degToRad(angle)) * wind);
}

/*
 * Adjust takeoff roll for slope. This uses the formula from:
 * http://pilotsweb.com/train/takeoff.htm. Which in turn is the same as Herrington as published in:
 * http://www.eaa1000.av.org/technicl/takeoff/takeoff.htm. As noted in the latter the correction
 * for headwind is aircraft specific while slope is really only dependent on liftoff speed, so we
 * use the POH tables for headwind correction.
 *
 * Because this calculation is not in the POH, only adjust for positive slopes. In other words,
 * this will return a greater roll than the POH value (which is allowed). Negative slopes will
 * return the original value.
 */
function TOSlopeAdjust (roll, slope, Vr) {
	var G = 32.2;					// Gravitational constant g=32.2 ft/sec/sec

	if (slope <= 0) {				// Don't decrease the roll for negative slopes to stay within the POH operating procedures
		return (roll);
	}
	Vr *= FTPERNM / (60 * 60);		// convert from kts to ft/sec
	slope = pctToRad(slope);		// convert from percentage slope to radians
	return (roll / (1 - ((2 * G * roll * Math.sin(slope)) / (Vr * Vr))));
}

/*
 * Adjust a V speed in KCAS for weight.
 */
function speedAdjustCas (Vspec, Wspec, weight) {
	return (Vspec * Math.sqrt(weight/Wspec));
}

/*
 * Compute the climb gradient in ft/nm.
 */
function climbGradient (roc, gs) {
	return (roc / (gs / 60));
}

/*
 * Compute great circle distance between two points in nm.
 * http://en.wikipedia.org/wiki/Great-circle_distance
 */
function GCDistance (lat1, long1, lat2, long2) {
	var RADIUS = 6371.01 * 0.539957;	// radius of earth in nm
	var radians;
	var t;

	lat1 = degToRad(lat1);
	long1 = degToRad(long1);
	lat2 = degToRad(lat2);
	long2 = degToRad(long2);
	t = Math.cos(long1) * Math.cos(long2) + Math.sin(long1) * Math.sin(long2);
	radians = Math.acos(Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * t);
	return(radians * RADIUS);
}

/*
 * Interpolate a Y value given 2 points and an x value between them.
 */
function interpolate (x, x1, y1, x2, y2)
{
	assert((x >= x1 && x <= x2) || (x >= x2 && x <= x1) || isNaN(x + x1 + y1 + x2 + y2), "interploate: bad value");
	return (y1 + (x - x1) * (y2 - y1)/(x2 - x1));
}

/*
 * Returns a value constrained to a range
 */
function range(value, min, max) {
	return (Math.max(Math.min(value, max), min));
}

/*
 * Adjust a compass direction so that it falls in the range 0 < v <= 360.
 */
function adjust360 (d) {
	d %= 360;
	if (d <= 0) {
		d += 360;
	}
	return (d);
}

/*
 * Compute the shortest angle difference in degrees (+-180) from a to b. Positive values means b is clockwise from a.
 * Negative values mean b is counter-clockwise from a.
 */
function angleDiff (a, b) {
	var diff = b - a;

	diff %= 360;
	if (diff <= -180) {
		diff += 360;
	} else if (diff > 180) {
		diff -= 360;
	}
	return (diff);
}

/*
 * Returns true if angle a, in degrees, is between start moving clockwise to end.
 */
function isAngleIn (a, start, end) {
	if (end > start) {
		return (a >= start && a <= end);
	} else {
		return ((a >= start && a <= 360) || (a >= 0 && a <= end));
	}
}

/*
 * Compute the reciprocal runway identifier given the base identifier.
 * Basically this flips the base 180 degrees and flips any L or R designation.
 */
function runwayRecip (id) {
	var m;
	var d;

	m = id.match(/(\d{1,2})([LRC]?)/);
	if (m != null) {
		d = String(adjust360(runwayDir(id) + 180) / 10);
		if (d.length == 1) {
			d = "0"+d;
		}
		if (m[2].length > 0) {
			switch (m[2]) {
			case 'C':
				d += 'C';
				break;
			case 'L':
				d += 'R';
				break;
			case 'R':
				d += 'L';
				break;
			default:
				d += m[2];
				break;
			}
		}
		return (d);
	}
}

/*
 * Return the magnetic runway direction from the runway ID.
 * This strips the [LRC] from the end and multiplies by 10.
 */
function runwayDir (id) {
	var m;

	m = String(id).match(/(\d{1,2})[LRC]?/);
	if (m != null) {
		return (parseInt(m[1], 10) * 10);
	}
	return (NaN);
}

/*
 * Convert a numeric heading to a three digit heading string.
 */
function toHeadingString (hdg) {
	hdg = round(hdg);
	if (hdg >= 100) {
		return (String(hdg));
	}
	if (hdg >= 10) {
		return ("0"+String(hdg));
	}
	return ("00"+String(hdg));
}

/****
 * Table lookup functions
 ****/

/*
 * Interpolate a computed value based on entries in a table based on one or more parameters.
 * A table is an object composed of three elements:
 *	- name: a string describing the table
 *	- parmNames: an array of strings describing each parameter of the table in order, such as ["weight", "temperature", "altitude"]
 *  - a: an array of objects each containing:
 *      - p: a value of the first parameter.
 *      - a: or v:
 *          v: is the value associated with that parameter value
 *          a: is an array of objects for further parameters
 * interpolateTable() finds the nearest parameter values for "p" in the array and interpolates if required. If there are more
 * parameters, it recursively descends interpolating all the way. The parameter order given to the function must reflect
 * the table organization order. See the help page for an explanation of the interpolation process.
 * The actual work is done by a helper function interpolateTableR(). This is only a wrapper to extract the array, catch exceptions
 * thrown when a parameter is outside of any of the parameter values in an array or sub-array, and set up an error object describing
 * the parameter that caused the problem.
 */

var gTableError = {};		// global table exception object

function interpolateTable (tableID, p /* more parameters*/) {
	var i;
	var table = getACData(tableID);
	var error, errMap;
	var value;
	var args = [];		// array to collect args, since arguments[] is not a real array
	var interpolateTableR = function (a, n, p /* varargs */) {	// the real interpolation function
		var i;
		var error;
		var parms = [];

		for (i = 3; i < arguments.length; i++) {
			parms.push(arguments[i]);
		}
		assert(a, "Bad Table");
		assert(n >= 0, "interpolateTable: bad recursion");
		// Find the index of the first entry in array "a" that has a parameter that is
		// greater than or equal to "p".
		// The table is assumed to be ordered such that the parameter increases in value.
		if (!isValid(p)) {
			error = {};
			error.msg = "invalid";
			error.parm = n;
			throw (error);
		}
		if (p < a[0].p) {
			error = {};
			error.msg = "too low";
			error.parm = n;
			throw (error);
		}
		for (i = 0; i < a.length; i++) {
			if (p <= a[i].p) {
				break;
			}
		}
		if (i >= a.length) {
			error = {};
			error.msg = "too high";
			error.parm = n;
			throw (error);
		}
		if (p == a[i].p) {
			// p exactly matched the table entry.
			if (parms.length == 0) {
				// No more parameters. Just return the value.
				assert(a[i].v != undefined, "Bad Table (2)");
				return (a[i].v);
			}
			// More parameters. Recurse using the sub-table for this entry and the remaining parameters.
			assert(a[i].a, "Bad Table (3)");
			return (interpolateTableR.apply(null, [a[i].a].concat(n+1, parms)));
		}
		assert(i > 0, "interpolateTable");
		// p fell between Table[i] and Table[i-1]. Interpolate.
		if (parms.length == 0) {
			// No more parameters. Just interpolate between the values in this table.
			assert(a[i-1].v != undefined, "Bad Table (4)");
			assert(a[i].v != undefined, "Bad Table (5)");
			return (interpolate(p, a[i-1].p, a[i-1].v, a[i].p, a[i].v));
		}
		// More parameters. Recurse to get the interpolation of the sub-tables for Table[i] and Table[i-1].
		// Then interpolate those values using this parameter.
		assert(a[i-1].a, "Bad Table (6)");
		assert(a[i].a, "Bad Table (7)");
		return (
			interpolate(p,
				a[i-1].p, interpolateTableR.apply(null, [a[i-1].a].concat(n+1, parms)),
				a[i].p, interpolateTableR.apply(null, [a[i].a].concat(n+1, parms))
			)
		);
	};

	assert(arguments.length >= 2 && arguments.length == (table.parmNames.length + 1), "interpolateTable: Bad args");
	assert(table && table.a, "interpolateTable: bad table ("+tableID+")");

	args.push(table.a);		// extract the array
	args.push(0);			// add an argument to indicate the current parameter being processed
	// copy the remaining parameters
	for (i = 1; i < arguments.length; i++) {
		args.push(arguments[i]);
	}
	// if the last arg is an object then it's an error map.
	errMap = args[args.length - 1];
	if (typeOf(errMap) == "object") {
		args.pop();		// remove it from the list
	} else {
		errMap = null;	// no error map
	}
	try {
		value = interpolateTableR.apply(null, args);	// call interpolateTableR(args)
		return (value);
	} catch (error) {
		// Return an error object. If used in arithmetic then it will convert to NaN.
		// We also record the error in gTableError so that it can also be retrieved by lastTableError().
		gTableError.lastID = tableID;
		gTableError[tableID] = TableError(error.msg, table.parmNames[error.parm]);
		return (gTableError[tableID]);
	}
}

/*
 * Return the last interpolateTable error associated with tableID.
 * If no tableID is given, the last interpolateTable error is returned.
 */
function lastTableError (tableID) {
	if (!tableID) {
		tableID = gTableError.lastID;
	}
	if (tableID && tableID in gTableError) {
		return (gTableError[tableID]);
	}
	return ({});
}

/*
 * Clear recent table errors.
 */
function clearTableError () {
	gTableError = {};
}

function tableMin (tableID, parmName) {
	var table = getACData(tableID);
	var parm;

	assert(table && table.a, "tableMin: bad table: "+tableID);
	for (parm = 0; parm < table.parmNames.length; parm++) {
		if (parmName == table.parmNames[parm]) {
			break;
		}
	}
	assert(parm < table.parmNames.length, "tableMin: can't find parmName: "+parmName);
	return (table.parmMin[parm]);
}

function tableMax (tableID, parmName) {
	var table = getACData(tableID);
	var parm;

	assert(table && table.a, "tableMax: bad table: "+tableID);
	for (parm = 0; parm < table.parmNames.length; parm++) {
		if (parmName == table.parmNames[parm]) {
			break;
		}
	}
	assert(parm < table.parmNames.length, "tableMax: can't find parmName: "+parmName);
	return (table.parmMax[parm]);
}

/*
 * Compose an error object
 */
function TableError (msg, name) {
	return ({msg:msg, parmName: name, valueOf:function () {return (NaN);}});
}

/*
 * Create an unordered list of keys. Keys added more than once only appear once.
 * Use an object with boolean keys so that the "in" operator work for enumeration and presence.
 * Can't put elements called "add", "remove", "clear" or "len" in list.
 */
function uList (/* varargs */) {
	var ul = {};

	ul.add = function (/* varargs */) {		// add new keys
		var i;
		var elt;

		for (i = 0; i < arguments.length; i++) {
			switch (typeOf(arguments[i])) {
			case "object":
				this.add.apply(this, Object.keys(arguments[i]));	// add ulist
				break;
			case "array":
				this.add.apply(this, arguments[i]);					// add array
				break;
			case "string":
				elt = arguments[i];
				assert(!elt.match(/^(add|remove|clear|len)$/), "ulist: bad elt: "+elt);
				if (!this[elt]) {
					this.len++;
					this[elt] = true;						// add element
				}
				break;
			}
		}
	};
	ul.remove = function (/* varargs */) {	// remove keys
		var i;

		for (i = 0; i < arguments.length; i++) {
			switch (typeOf(arguments[i])) {
			case "object":
				this.remove.apply(this, Object.keys(arguments[i]));	// remove ulist
				break;
			case "array":
				this.remove.apply(this, arguments[i]);				// remove array
				break;
			case "string":
				if (this[arguments[i]]) {
					this.len--;
					delete this[arguments[i]];						// remove element
				}
				break;
			}
		}
	};
	ul.clear = function () {				// clear the list
		var elt;

		for (elt in this) {
			this.remove(elt);
		}
	};
	ul.len = 0;
	Object.defineProperty(ul, "add", {enumerable: false});
	Object.defineProperty(ul, "remove", {enumerable: false});
	Object.defineProperty(ul, "clear", {enumerable: false});
	Object.defineProperty(ul, "len", {enumerable: false});
	ul.add.apply(ul, arguments);
	return (ul);
}

/*
 * Ajax object. Methods for dealing with Ajax calls.
 * In the style of Jquery.
 */
var ajax = {
	/*
	 * Returns true if we're online.
	 * Always returns true for Android native app due to bug.
	 */
	isOnline: function () {
		return ((gDev.phoneGap && gDev.platform == "Android") || navigator.onLine);
	},

	/*
	 * Make an asynchronous call to a server.
	 * Calls doneFunc when complete. If successful, second arg is "success", otherwise it's error"".
	 * The first arg is response text on success, status otherwise.
	 * The third arg is the request object itself.
	 * If parms is an object POST is used,
	 * otherwise GET is used and parms should be a GET argument string (appended after "?").
	 */
	call: function (url, parms, doneFunc, timeout) {
		var req = new XMLHttpRequest();
		var timer;
		var timedout = false;

		if (!ajax.isOnline() && !url.match(/^file:/)) {
			req.status = 0;
			doneFunc(0, "error", req);
			return;
		}
		if (timeout > 0) {
			timer = setTimeout(
				function () {
					timedout = true;
					req.abort();
				},
				timeout
			);
		}
		req.onreadystatechange = function () {
			if (req.readyState != 4) {
				return;
			}
			if (timer && !timedout) {
				clearTimeout(timer);
			}
			if (req.status == 200) {
				doneFunc(req.responseText, "success", req);
logMsg("ajax.call: success: "+req.responseText);
			} else {
				logMsg("ajax.call error: URL: "+url+", status: " + req.status);
				doneFunc(req.status, "error", req);
			}
		};
		try {
			if (typeOf(parms) == 'object') {
				req.open('POST', url, true);
				req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
				req.send(parms);
			} else {
				req.open('GET', url+'?'+parms, true);
logMsg("ajax.call: send: "+url+'?'+parms);
				req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
				req.send(null);
			}
		} catch (e) {
			logMsg("ajax.call exception: URL: "+url+", Exception:" + JSON.stringify(e));
			doneFunc(-2, JSON.stringify(e), req);
		}
	},
};

