/*
 * This code should be common across most aircraft.
 * Provides interface to input and output fields along with the computation infrastructure.
 */

/*global STD_ATM_HPA:false, STD_ATM_HG:false, LBSPERGALJETA:false, LBSPERGALAVGAS:false, FTPERNM:false, FTPERM:false, GALPERL:false, LBSPERKG:false,
setStorage:false, getStorage:false, deleteStorage:false, clearStorage:false, setCookie:false,, getCookie:false,
versionCompare:false, getElt:false, logMsg:false, logEventTime:false, addCSSClass:false, showElt:false, showClass:false,
showSpan:false, showRow:false, showCell:false, getParentTag:false, setNextTableEntry:false, countLeafNodes:false,
isHideableError:false, assert:false, typeOf:false, fmtNum:false, fmtTime:false, fmtHeading:false, textWidth:false,
url:false,
getIO:false, roundMult:false, inputMax:false, inputMin:false, setInput:false, isValid:false, getElt:false,
NoClickDelay:false, inhgToHpa:false, handleChange:false, inputDefault:false, twWInd:false, twWindDir:false, showElt:false, gIO:false,
helpDone:false, hpaToInhg:false, mToFt:false, uList:false, isCurrentUnits:false*/

/*
 * Invalid value markers:
 * The default invalid value is NaN. It is also used to mark invalid input values because any simple computation with
 * NaN results in NaN. INVALID_NULL is used to mark output that has no value. INVALID_RANGE is used to mark output that
 * is an error value due to some variable being out of POH range.
 * All invalid values are considered numbers bt Javascript, even NaN.
 */
var INVALID = NaN;				// general invalid input or result
var INVALID_INPUT = 9.3e99;		// invalid input, NaN also works
var INVALID_NULL = 9.1e99;		// invalid result, but no ouput (-)
var INVALID_RANGE = 9.2e99;		// input outside POH envelope

/*
 * The gIO object contains the internal representation of each input and output field, plus various IO related globals.
 * The elts object contains a key (element ID) for each input or output element. Each key references an object with the following
 * elements:
 * - input:
 *		True if the id is an input
 * - value:
 *		The current internal representation of the element value. May be INVALID or NaN if the value is out of range.
 * - pending:
		True if an input has been updated.
 * - desc:
 *		A descriptor for each input that descibes type, min & max values, and computation functions.
 */
var gIO = {
	elts: {},					// IO field elements by id
	aircraft: null,				// saved aircraft
	aircraftEditable: false,	// indicates aircraft page is editable
	trips: null,				// saved trips
        checks:null,
        checkOpen: -1,
        checkEditable: false,
	tripEditable: false,		// indicates trips page is editable
	tripOpen: -1,				// index of the open trip
	tripIDs: null,				// precomputed list of element IDs that are in a trip
	// invalid saveID chars.
	saveIdPat: new RegExp("[^\\w\\!\\#\\$\\%\\&\\'\\(\\)\\*\\+\\,\\-\\.\\;\\=\\@\\[\\]\\^\\_\\`\\{\\}\\~]", "g"),
	convIDPat: /(\w*)_(hpa|inhg|ft|m|gal|l|lbs|kg)$/,	// RE to extract based ID and units
	// units and conversion functions
	unitController: {
		"gal": "SetFuelUnits",
		"l": "SetFuelUnits",
		"lbs": "SetWeightUnits",
		"kg": "SetWeightUnits",
		"ft": "SetRunwayUnits",
		"m": "SetRunwayUnits",
		"inhg": "SetAltimeterUnits",
		"hpa": "SetAltimeterUnits"
	},
	convFn: {
		"inhg-hpa": inhgToHpa,
		"hpa-inhg": hpaToInhg,
		"m-ft": mToFt,
		"ft-m": ftToM,
		"gal-l": galToL,
		"l-gal": lToGal,
		"lbs-kg": lbsToKg,
		"kg-lbs": kgToLbs
	},
	unitAlternate: {},			// list of alternates for each unit, built in setupIO
	saveTime: null,				// time of last local save
	cloudSaveTime: null,		// time of last cloud save
	cloudStorageNotify: true,	// alert user on storage failure
	cloudEnabled: true,			// enable backup
	pageDesc: null,				// page descriptor object. see setupPages
	inputPopup: false			// an input popup is active
};

/****
 * Internal functions to handle input events
 ****/

/*
 * Get the current value for an input field.
 * Different types do this in different ways.
 */
function getInputField (id) {
	var value;
	var io = gIO.elts[id];
	var i;
	var elt;
	var options;

	assert(io && io.input && io.desc.type, "getInputField: bad type for id: " + id);
	switch(io.desc.type[0]) {
	case "c":				// checkbox
		value = getElt(id).checked;
		break;
	case "r":				// radio buttons
		options = document.getElementsByName(id);
		value = INVALID;
		for (i = 0; i < options.length; i++) {
			if (options[i].checked) {
				value = options[i].value;
			}
		}
		break;
	case "o":				// options
	case "O":
		if (gDev.platform == "iPhone") {
			value = getElt(id).selValue;
		} else {
			value = getElt(id).value;
		}
		break;
	case "T":
		value = getElt(id).innerHTML;
		break;
	default:				// everything else
		elt = getElt(id);
		// many browsers will return "" for invalid numbers
		if (elt.type != "number" || elt.value.match(/\d+|\d*\.\d+/)) {
			value = elt.value;
		} else {
			value = INVALID;
		}
		break;
	}
	return (value);
}

/*
 * Set the input field value as if the user entered it.
 * Different input types do this in different ways.
 * Pages will need to be recomputed after this/
 */
function setInputField (id, value) {
	var options;
	var i;
	var io = gIO.elts[id];
	var elt;

	assert(io && io.input, "setInputField: bad type for id: " + id);
	switch(io.desc.type[0]) {
	case "c":				// checkbox
		if (!isValid(value)) {
			value = inputDefault(id);
		}
		getElt(id).checked = value;
		break;
	case "r":				// radio buttons
		if (!isValid(value)) {
			value = inputDefault(id);
		}
		options = document.getElementsByName(id);
		for (i = 0; i < options.length; i++) {
			if (options[i].value == value) {
				options[i].checked = true;
				break;
			}
		}
		break;
	case "o":				// pre-defined options
	case "O":				// dynamic options
		elt = getElt(id);
		if (!isValid(value)) {
			value = inputDefault(id);
		}
		if (gDev.platform == "iPhone") {
			i = findOptionIndex(id, value);
			assert(i >= 0, "setInputField: bad option: "+value);
			elt.selValue = value;
			elt.value = elt.options[i].text;
		} else if (elt.value != value) {
			elt.value = value;
		}
		break;
	case "T":
		getElt(id).innerHTML = value;
		break;
	default:				// everything else
		getElt(id).value = value;
		break;
	}
}

/*
 * onchange handler for all inputs
 */
function handleChange (id) {
	var value;
	var io;
	var lid, sid;

	// logEventTime("handleChange start");
	if (id == undefined || typeof (id) == "object") {
		if (this.id) {
			id = this.id;
		} else if (this.name) {
			id = this.name;
		} else {
			assert(this.event, "handleChange: bad event: "+id);
			if (this.event.target) {
				id = this.event.target.id;
			} else if (this.event.srcElement) {
				id = this.event.srcElement.id;			// IE - sigh
			}
		}
	}
	value = getInputField(id);
	lid = gIO.elts[id].link || id;
	io = gIO.elts[lid];		// get linked io element
	assert(io && io.input, "handleChange: bad id: "+lid);
	if (value != io.fieldValue) {
		setupInput(lid, value);
		if (io.desc.onchange) {
			evalComp(io.desc.onchange, {id: lid});		// execute target onchange handler (only one)
		}
		// compute each linked elements page
		for (sid in io.linked) {
			computePage(gIO.elts[sid].page);
		}
		saveInput();
		// Android bug: selected values aren't displayed until refreshed
		if (gDev.platform == "Android" && io.desc.type[0].toLowerCase() == 'o') {
			refreshElt(id);
		}
	}
	// logEventTime("handleChange complete");
	return (true);
}

/*
 * onfocus handler for each numeric input element.
 * Note: readonly elements don't have blur() and select() functions in Webviews. Use setSelectionRange().
 */
function handleFocus (e) {
	var elt = this;
	var id = this.id;
	var io = gIO.elts[id];
	var old, incr;
	var numInputStyle = getIO("SetNumInputStyle");
	var select = function (elt) {
		try {
			elt.setSelectionRange(0, 99);
		} catch (e) {}
	};
	var blur = function (elt) {
		try {
			elt.blur();
		} catch (e) {}
	};

	assert(io && io.input, "handleFocus: bad id: "+id);
	// ignore new requests while an input popup is present
	if (gIO.inputPopup) {
		blur(elt);
		return;
	}
	switch (io.desc.type[0]) {
	case "n":
		if (numInputStyle == "keypad") {
			e.preventDefault();
			e.stopPropagation();
			blur(elt);		// allows the user to reselect this element
			gIO.inputPopup = true;				// disable more popups
			keypad.open(
				function (value) {
					if (value != undefined) {
						setInput(id, value);
						blur(elt);		// allows the user to reselect this element
					}
					// on Android, event propagation from hitting the 'done' button can cause a focus
					// event to fire, so delay allowing focus events for a bit.
					setTimeout(function () {gIO.inputPopup = false;	}, 100);
				},
				io.desc.type+(inputMin(id) < 0? "-": ""),
				io.desc.sw? io.desc.sw.replace(/^.*\|([^\?]+)/, '$1'): undefined
			);
		} else if ((numInputStyle == "tPicker" && io.desc.sw) || (numInputStyle == "vSlider" && io.desc.vtick)) {
			e.preventDefault();
			e.stopPropagation();
			blur(elt);		// allows the user to reselect this element
			// Get the initial value and the increment between min and max.
			old = inputOld(id);
			if (old == undefined) {
				old = (isValid(getIO(id))? getIO(id): inputDefault(id));
			}
			incr = (io.desc.incr? io.desc.incr: 1);
			if (numInputStyle == "vSlider") {
				//  Use the vernier slider. vtick and incr elements give the tick
				gIO.inputPopup = true;				// disable more popups
				vslider.open(
					inputMin(id),
					inputMax(id),
					incr,
					io.desc.vtick,
					old,
					function (value) {
						if (value != undefined) {
							setInput(id, value);
							blur(elt);		// allows the user to reselect this element
						}
						gIO.inputPopup = false;			// enable popups
					}
				);
			} else {
				// Use the Spinning Wheel picker
				assert(io.desc.sw, "handleFocus: no sw entry");
				twNumber(id, inputMin(id), inputMax(id), incr, old);
			}
		} else {
			select(elt);	// select the entire contents of the element to facilitate entering a complete new value.
		}
		break;
	case "o":
	case "O":
		if (gDev.platform == "iPhone") {
			e.preventDefault();
			e.stopPropagation();
			twSelect(id);	// replace the horrid IOS7 option selector
			blur(elt);		// allows the user to reselect this element
		}
		break;
	case "d":
	case "w":
		if (numInputStyle == "keypad") {
			e.preventDefault();
			e.stopPropagation();
			keypad.open(
				function (value) {
					if (value != undefined) {
						setInput(id, value);
						blur(elt);
					}
					gIO.inputPopup = false;			// enable popups
				},
				io.desc.type,
				io.desc.type == "w"? "kt.": "&deg;"
			);
			gIO.inputPopup = true;				// disable more popups
		} else if (numInputStyle == "tPicker") {
			e.preventDefault();
			e.stopPropagation();
			if (io.desc.type[0] == "w") {
				twWind(id);		// call the spinning wheel wind speed function
			} else {
				twWindDir(id);	// call the spinning wheel wind direction function
			}
			blur(elt);		// allows the user to reselect this element
		} else {
			select(elt);	// select the entire contents of the element to facilitate entering a complete new value.
		}
		break;
	default:
		select(elt);	// select the entire contents of the element to facilitate entering a complete new value.
		break;
	}
	return (true);
}

/*
 * Enter key handler.
 * This allows the "enter" key to complete an input field. Otherwise a change in focus would be required
 */
function handleEnter (event) {
	//assert(this.event == event && this.event.target.id == id, "handleEnter: this ("+this.event+","+this.id+") != passed");
	if (event.keyCode == 13) {
		handleChange(this.id);
	}
	return (true);
}

/*
 * Make an element clickable on touch interface without delay.
 * You can use it on a container element and it will dispatch clicks to the targets within.
 * It's probably good to avoid container elements that have interactive canvases due to the overhead.
 * This also assures that the event will be dispatched when the touch is released, so that any
 * release events will not propagate to popups displayed by the event handler.
 * Inspired by: http://cubiq.org/remove-onclick-delay-on-webkit-for-iphone
 */
function noClickDelay (elt) {
	if (window.Touch) {
		new NoClickDelay(elt);		// event listener retains object reference
	}
}

function NoClickDelay (elt) {
	if (window.Touch) {
		this.element = elt;
		this.element.addEventListener('touchstart', this, false);
	}
}

NoClickDelay.prototype.handleEvent = function (e) {
	var target = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);

	if (target.nodeType == 3) {		// use parent for text nodes
		target = target.parentNode;
	}
	switch (e.type) {
	case 'touchstart':
		e.preventDefault();
		this.target = target;
		this.moved = false;
		this.element.addEventListener('touchmove', this, false);
		this.element.addEventListener('touchend', this, false);
		break;
	case 'touchmove':
		if (target != this.target) {	// make sure touch stays in target
			this.moved = true;
		}
		break;
	case 'touchend':
		this.element.removeEventListener('touchmove', this, false);
		this.element.removeEventListener('touchend', this, false);
		if (!this.moved) {
			// dispatch event
			var event = document.createEvent('MouseEvents');
			event.initEvent('click', true, true);
			target.dispatchEvent(event);
			// set focus on input tags
			switch (target.nodeName.toLowerCase()) {
			case 'input':
			case 'select':
				target.focus();
				break;
			}
		}
		break;
	}
};

/****
 * Page functions
 ****/

/*
 * Select a new page.
 */
function selectPage (page) {
	var parent;
	var childPages;
	var p, tab, i;

	// Only allow a change to anything other than the TOU page after the TOU has been accepted.
	if (!checkTOU() && page != "TOU") {
		notice("Please accept the Terms of Use");
		return;
	}
	// If there was a deactivate commend pending, execute it.
	if (gIO.pageDesc.deactivate) {
		evalComp(gIO.pageDesc.deactivate);
		gIO.pageDesc.deactivate = null;
	}
	if (gUI.style == "small") {
		// Small user interface.
		// On the small UI (e.g. iPhone) selecting a page that contains sub-page will only display the index.

		// Turn off all the pages, indexes and header back button
		for (p in gIO.pageDesc.pages) {
			if (p != "Home") {
				showElt(p + "Page", false, "block");
			}
			if ("childPages" in gIO.pageDesc.pages[p]) {
				showElt(p + "Index", false, "block");
			}
		}
		showElt("backButton", false, "block");
		// Setup the small UI header.
		// Also make sure the parent page is visible, or the selected page won't show.
		getElt("PageTitle").innerHTML = gIO.pageDesc.pages[page].name;
		if ("parentPage" in gIO.pageDesc.pages[page]) {
			if (gIO.pageDesc.pages[page].parentPage == "Home") {
				getElt("backButton").innerHTML = "Home";
			} else {
				getElt("backButton").innerHTML = "Back";
				showElt(gIO.pageDesc.pages[page].parentPage + "Page", true, "block");	// make sure containing parent is visible
			}
			showElt("backButton", true, "block");
			showElt(page + "Page", true, "block");
		}
		// If this page has child pages, then show the index.
		if ("childPages" in gIO.pageDesc.pages[page]) {
			showElt(page + "Index", true, "block");
		}
	} else {
		// Desktop user interface.
		// Unslect the current tab and select the new one.

		// Turn off any help.
		helpDone();
		// Turn off all the pages.
		for (p in gIO.pageDesc.pages) {
			if (p != "Home") {
				showElt(p + "Page", false, "block");
			}
		}
		// If the page contains sub-pages. Act as if the first one was selected.
		if ("childPages" in gIO.pageDesc.pages[page]) {
			page = gIO.pageDesc.pages[page].childPages[0];
		}
		parent = gIO.pageDesc.pages[page].parentPage;
		if (parent && parent != "Home") {
			// Pages that are sub-page of other non-home pages, contain an index on the left.
			// Indicate the selected page in the index, and show the page and it's containing parent.
			childPages = gIO.pageDesc.pages[parent].childPages;
			for (i = 0; i < childPages.length; i++) {
				getElt(childPages[i] + "-list").className = (childPages[i] == page? "selected-list": "unselected-list");
			}
			showElt(page + "Page", true, "block");
			showElt(parent + "Page", true, "block");
			tab = parent;
		} else {
			// Just show the page. For popup pages and sub-pages of the home page.
			showElt(page + "Page", true, "block");
			tab = page;
		}
		// Indicate the selected page in the tabs on the top of the home page.
		childPages = gIO.pageDesc.pages["Home"].childPages;
		if (tab) {
			for (i = 0; i < childPages.length; i++) {
				getElt(childPages[i] + "-tab").className = (childPages[i] == tab? "selected-tab": "unselected-tab");
			}
		}
	}
	// If the page has an activate function, call it and set up the correctonding deactivate request.
	if ("activate" in gIO.pageDesc.pages[page]) {
		evalComp(gIO.pageDesc.pages[page].activate);
		gIO.pageDesc.deactivate = gIO.pageDesc.pages[page].deactivate;
	}
	// Remember the currently selected page.
	gIO.pageDesc.selectedPage = page;
	computePage(page);
}

/*
 * Select the parent page.
 */
function pageBack () {
	var page = gIO.pageDesc.selectedPage;

	assert("parentPage" in gIO.pageDesc.pages[page]);
	selectPage(gIO.pageDesc.pages[page].parentPage);
}

/*
 * Force a page redisplay.
 */
function refreshPage () {
	showElt(gIO.pageDesc.selectedPage + "Page", false, "block");
	setTimeout(function() {showElt(gIO.pageDesc.selectedPage + "Page", true, "block");}, 0);
}

/*
 * Force an element redisplay.
 */
function refreshElt (id) {
	showElt(id, false);
	setTimeout(function () {showElt(id, true);}, 0);
}

/*
 * Compute the page.
 * This looks up the compute element of the page descriptor then determines whether any
 * of the inputs have changed values since the last time the computation function was called.
 * If an input has changed or no inputs are listed, then the computation function is called.
 * After this, the current value of the inputs are recorded.
 * If the computation has dependents (inputs that are output of another page) the dependent
 * pages are updated before the computation is called.
 * The current computation context is maintained in a stack, so that calls to changedIO()
 * within the computation function will evaluate the input against the last change generation
 * recorded for the current computation.
 */
function computePage (page) {
	var i, j;
	var comp;		// current compute object in pageDesc compute array
	var id;			// current input ID
	var value, ovalue;
	var doit;
	var lid;		// link target ID
	var io;
	var elt, lelt;

	assert(page in gIO.pageDesc.pages, "computePage: bad page descriptor: "+page);
	if (!gIO.pageDesc.pages[page].compute) {
		return;
	}
	for (i = 0; i < gIO.pageDesc.pages[page].compute.length; i++) {
		comp = gIO.pageDesc.pages[page].compute[i];		// computation context
		gIO.pageDesc.curCompute.push(comp);				// push on context stack
		// evaluate any precedents
		if (comp.precedents) {
			for (j = 0; j < comp.precedents.length; j++) {
				computePage(comp.precedents[j]);
			}
		}
		clearTableError();		// clear old table lookup errors
		// call computation function if any inputs have changed (or no inputs listed)
		if (comp.inputs) {
			if (!comp.changedList) {
				comp.changedList = uList(comp.inputs);
				for (id in comp.inputs) {
					comp.inputValues[id] = NaN;
				}
				doit = true;	// always calculate the first time thru
			} else {
				doit = false;
				comp.changedList.clear();
				for (id in comp.inputs) {
					value = getIO(id);
					ovalue = comp.inputValues[id];
					if (ovalue != value
						&& (typeof ovalue != "number"
							|| typeof value != "number"
							|| !(isNaN(ovalue) && isNaN(value))
						)
					) {
						//if (!isNaN(ovalue)) {
							//logMsg("computePage("+page+") fn "+i+" id: "+id+" ("+ovalue+"->"+value+")");
						//}
						comp.changedList.add(id);
						comp.inputValues[id] = value;
						doit = true;
					}
				}
			}
		} else {
			doit = true;
		}
		if (doit) {
			// logEventTime("computePage("+page+") fn "+i+" start");
			// Setup validation errors for input fields on this page
			if (comp.inputs) {
				// A computation can have inputs on other pages that are inputs or outputs
				for (id in comp.inputs) {
					if (gIO.elts[id].page == page && gIO.elts[id].input && isCurrentUnits(id)) {
						setIOError(id);
					}
				}
			}
			// Setup output fields so that computation starts with a clean slate
			if (comp.outputs) {
				for (id in comp.outputs) {
					if (!gIO.elts[id].link) {
						// reset output field and errors
						setOutputNull(id);
						resetIOError(id);
					}
				}
			}
			comp.fn();
			// setup linked outputs
			// Done after computation in case they link to outputs of this computation
			if (comp.outputs) {
				for (id in comp.outputs) {
					lid = gIO.elts[id].link;
					if (lid) {
						// Copy linked outputs
						io = gIO.elts[lid];
						// copy exact output field and formatting.
						elt = getElt(id);
						lelt = getElt(lid);
						elt.innerHTML = lelt.innerHTML;
						elt.style.color = lelt.style.color;
						elt.style.backgroundColor = lelt.style.backgroundColor;
						elt.style.textDecoration = lelt.style.textDecoration;
						// reflect errors as well.
						setIOError(id);
					}
				}
			}
			// logEventTime("computePage("+page+") fn "+i+" complete");
		}
		gIO.pageDesc.curCompute.pop();					// pop context stack
	}
}

/*
 * Compute all the pages.
 */
function computeAll () {
	var page;
	// var delta = logEventTime("computeAll start");

	for (page in gIO.pageDesc.pages) {
		computePage(page);
	}
	// logEventTime("computeAll complete", delta);
}

/*
 * Evaluate a computation string or function.
 * Args is an object that contains elements whose names are argument names and
 * whose values are argument values.
 */
function evalComp (comp, args) {
	var v;
	var re;

	if (typeof (comp) == "string") {
		// replace argument ids with argument values and evaluate the string
		if (args) {
			for (v in args) {
				re = new RegExp("(^|\\W)"+v+"(\\W|$)", "g");
				comp = comp.replace(re,"$1\""+args[v]+"\"$2");
			}
		}
		return (eval(comp));
	} else if (typeof (comp) == "function") {
		// build an arguments array and apply it to the function
		if (args) {
			var a = [];
			for (v in args) {
				a.push(args[v]);
			}
			return (comp.apply(null, a));
		}
		return (comp());
	}
	return (comp);
}

/****
 * set/get IO elements functions
 ****/

/*
 * Get the value of an input or output.
 */
function getIO (id) {
	var io;

	io = gIO.elts[gIO.elts[id].link || id];
	assert(io, "getIO: bad id: "+id);
	return (io.value);
}

/*
 * Get the previous value of an input or output.
 */
function getLastIO (id) {
	var io;

	io = gIO.elts[gIO.elts[id].link || id];
	assert(io, "getLastIO: bad id: "+id);
	return (io.lastValue);
}

/*
 * Returns true if the value has changed since the last computation.
 * The current computation is set by computePage().
 */
function changedIO (id) {
	var comp;

	// If there's no current computation, then return true
	if (gIO.pageDesc.curCompute.length == 0) {
		return (true);
	}
	// check whether this id is in the changed IO list.
	comp = gIO.pageDesc.curCompute[gIO.pageDesc.curCompute.length - 1];
	id = gIO.elts[id].link || id;
	return (id in comp.changedList);
}

/*
 * Get the units for this ID, if any.
 */
function getIOUnits (id) {
	var m = id.match(gIO.convIDPat);

	if (m) {
		return (m[2]);
	}
	return (null);
}

/*
 * Get the ID without units, if any.
 */
function getIOUnitsBase (id) {
	var m = id.match(gIO.convIDPat);

	if (m) {
		return (m[1]);
	}
	return (id);
}

/*
 * Get the currently selected units for this ID, if any.
 */
function getCurrentUnits (id) {
	var io = gIO.elts[gIO.elts[id].link || id];

	if ("conv" in io.desc) {
		return (getIO(io.desc.conv));	// conv contains the ID of the selector
	}
	return (null);
}

/*
 * Check whether the ID is the one in the current units.
 */
function isCurrentUnits (id) {
	var units = getIOUnits(id);

	return (!units || units == getCurrentUnits(id));
}

/*
 * Return true if an ID matches one of a set of units or has no units
 */
function isUnits (id /*varargs*/) {
	var i;
	var units = getIOUnits(id);

	if (!units) {
		return (true);
	}
	for (i = 1; i < arguments.length; i++) {
		if (arguments[i] == units) {
			return (true);
		}
	}
}

/*
 * Get the alternate I/O ID in the currently selected units
 */
function getCurrentUnitsID (id) {
	var io = gIO.elts[gIO.elts[id].link || id];
	var m = id.match(gIO.convIDPat);
	var curUnits;

	if ("conv" in io.desc && m) {
		curUnits = getIO(io.desc.conv);
		if (m[2] != curUnits) {
			return (m[1]+"_"+curUnits);	// the ID is <baseid>_<units>
		}
	}
	return (id);
}

/*
 * Convert an IO value from oldUnits to newUnits.
 */
function convertIO (value, oldUnits, newUnits) {
	if (!isValid(value) || newUnits == oldUnits) {
		return (value);
	}
	// the convFn object contains conversion functions indexed by <from units><to units strings.
	return (gIO.convFn[oldUnits+"-"+newUnits](value));
}

/*
 * Convert the units for a set of ID prefixes (IDs without the units suffix).
 * Also only show the IDs in the current units.
 * prefixes is an array of ID prefixes.
 * units is an object with element names of all the possible units for the prefixes and
 * their associated CSS class names.
 */
function convertIDunits (prefixes, units, oldUnits, newUnits) {
	var u;

	for (u in units) {
		showClass(units[u], u == newUnits);
	}
}

/*
 * Return true if ID is an input.
 */
function isInput (id) {
	return (gIO.elts[id].input);
}

/*
 * Set up input as if the user had entered it.
 * Recomputes related pages.
 */
function setInput (id, value) {
	setInputField(id, value);
	handleChange(id);				// same as onchange handlers
}

/*
 * Setup an input value and validate it.
 * Does some simple validation of the value, but anything more than type and
 * fixed range checking etc. is left to the output computation function.
 * Pages will need to be recomputed after this.
 * This sets the value of the specified id, the id's liked to it and sets converted values
 * in other versions in alternate units. It also sets/resets validation errors.
 */
function setupInput (id, fieldValue) {
	var value;
	var io;
	var lid, sid;
	var iMax = inputMax(id);
	var iMin = inputMin(id);
	var u;

	id = gIO.elts[id].link || id;
	io = gIO.elts[id];
	assert(io && io.input, "setupInput: bad id: "+id);
	// Setup the id in alternate units. Doing this once when the value is set prevents errors
	// that can happen with conversions back and forth
	if (io.desc.conv) {
		u = getIOUnits(id);
		assert(io.desc.type[0] == "n", "setupInput: bad type conversion: "+id);
		for (sid in io.convSiblings) {
			io = gIO.elts[sid];
			assert(!io.link, "setupInput: alternate units id linked :"+id);
			if (sid != id) {
				// convert alternate units. Retain max and min
				if (fieldValue == iMax) {
					value = inputMax(sid);		// at max, retain max in new units
				} else if (fieldValue == iMin) {
					value = inputMin(sid);		// at min, retain min in new units
				} else if (!isNaN(fieldValue)) {
					value = convertIO(fieldValue, u, getIOUnits(sid));
				}
			} else {
				value = fieldValue;
			}
			io.lastValue = io.value;				// record last value
			io.fieldValue = value;
			io.value = validateInput(sid, value);	// record current value
			// mirror the field value to linked input elements
			for (lid in io.linked) {
				setInputField(lid, value);
			}
			setIOError(id);	// set error on linked ids of current units
		}
	} else {
		value = validateInput(id, fieldValue);
		io.fieldValue = fieldValue;
		io.lastValue = io.value;				// record last value
		io.value = value;						// record current value
		// mirror the field value to linked input elements
		for (lid in io.linked) {
			setInputField(lid, fieldValue);
		}
	}
	setIOError(id);			// set error on linked ids of current units
}

/*
 * Set an output value according to it's descriptor.
 * Invalid value are indicated specially for types n (number), p (POH number) and t (time).
 * The fmt object can contain color and backgroundColor elements.
 */
function setOutput (id, value, fmt) {
	var io;
	var u;
	var sid;
	var setOutputField = function (id, value, fmt) {
		var DEFAULT_OUTPUT_COLOR = "darkblue";
		var m, x, s;
		var elt;
		var html;
		var style = {};
		var io = gIO.elts[gIO.elts[id].link || id];
		var type, width, rnd, mult;
		var digits = 0;

		assert(io && !io.input, "setOutput(): bad id: " + id);
		// if the id is not in current units, convert value and use proper id
		// Parse the type in the descriptor
		m = io.desc.type.match(/([nst])(\d*\.?\d*)?(?:m(\d+\.?\d*))?([udz])?/);
		assert(m != null, "setOutput(): bad type for id: " + id);
		type = m[1];		// value type, "n":number, "p":POH number, "t":time, "s":string
		width= m[2];		// field width: left.right
		mult = m[3];		// rounding multiple
		rnd = m[4];			// rounding, "u":up, "d":down
		if (width) {
			x = width.toString().split(".");
			if (x.length == 2) {
				digits = x[1];
			}
		}
		if (mult == undefined) {
			if (digits) {
				mult = Math.pow(10, -digits);
			} else {
				mult = 1;
			}
		}
		// Setup color and background color and adjust according to fmt object
		style.backgroundColor = (io.desc.backgroundColor !== undefined? io.desc.backgroundColor: "transparent");
		style.color = (io.desc.color !== undefined? io.desc.color: DEFAULT_OUTPUT_COLOR);
		style.textDecoration = "none";
		if (fmt) {
			assert(typeof (fmt) == "object", "setOutput(): bad fmt: " + fmt);
			if (fmt.color && fmt.color.length > 0) {
				style.color = fmt.color;
			}
			if (fmt.backgroundColor && fmt.backgroundColor.length > 0) {
				style.backgroundColor = fmt.backgroundColor;
			}
		}
		// Convert the value to a string
		if (type == "t" || type == "n") {
			if (isNaN(value)) {
				switch (io.desc.invalid) {
				case "-":
				case " ":
					value = INVALID_NULL;
					break;
				case "poh":
					value = INVALID_RANGE;
					break;
				default:		// io.desc.invalid undefined
					value = INVALID_INPUT;
				}
			}
			if (value == INVALID_NULL) {			// INVALID_NULL displays dashes
				html = (type == "t"? "-:-": "-");
			} else if (value == INVALID_RANGE || value == INVALID_INPUT) {
				// If the value is invalid, display a strikethru "Input".
				// If the value is INVALID_RANGE, display a strikethrou "POH" (for type "p" only).
				style.backgroundColor = "transparent";
				style.color = "red";
				style.textDecoration = "line-through";
				html = (value == INVALID_RANGE? "POH": "Input");
			} else {
				switch (rnd) {
				case "u":
					value = roundUpMult(value, mult);
					break;
				case "d":
					value = roundDownMult(value, mult);
					break;
				case "z":
					value = roundZTime(value);
					break;
				default:		// rnd undefined
					value = roundMult(value, mult);
					break;
				}
				if (type == "t") {
					html = fmtTime(value);				// format the time for type "t"
				} else {
					html = fmtNum(value, digits);		// format valid numbers ("n")
				}
			}
		} else {
			assert(type == "s", "setOutput: bad type");
			if (typeof(value) != "string") {
				html = value = (io.desc.invalid? io.desc.invalid: "");
			} else {
				html = value;							// type = "s"
			}
		}
		// only record last output value if it's changed
		if (value != io.value || isNaN(value) != isNaN(value)) {
			io.lastValue = io.value;
		}
		io.value = value;
		io.fmt = fmt;
		// Put the output in all linked elements
		for (id in io.linked) {
			elt = getElt(id);
			// copy the style
			for (s in style) {
				elt.style[s] = style[s];
			}
			// setup the field
			elt.innerHTML = html;
		}
	};

	id = gIO.elts[id].link || id;		// find main linked id.
	io = gIO.elts[id];
	// setup the id in alternate units
	if (io.desc.conv) {
		u = getIOUnits(id);
		for (sid in io.convSiblings) {
			assert(!io.link, "setupInput: alternate units id linked :"+id);
			if (sid != id && !isNaN(value)) {
				// convert alternate units.
				setOutputField(sid, convertIO(value, u, getIOUnits(sid)), fmt);
			} else {
				setOutputField(sid, value, fmt);
			}
		}
	} else {
		setOutputField(id, value, fmt);
	}
}

/*
 * Set output(s) to INVALID_NULL.
 * Takes IDs and/or arrays of IDs.
 */
function setOutputNull (/* varargs */) {
	var i;
	var arg, id;

	for (i = 0; i < arguments.length; i++) {
		arg = arguments[i];
		if (typeOf(arg) == "object") {
			for (id in arg) {
				setOutput(id, INVALID_NULL);
			}
		} else {
			setOutput(arg, INVALID_NULL);
		}
	}

}

/*
 * Set an error string for a POH table value.
 * If the value is not an error object, it will look up the last table lookup error,
 * or the last error for a given tableID.
 */
function POHError (id, error, tableID) {
	var msg;
	var i;

	if (isValid(error)) {
		resetIOError(id);
		return (false);
	}
	if (typeof (error) != "object") {
		error = lastTableError(tableID);
	}
	assert(error, "POHError: invalid error code for: " + id);
	if (gIO.elts[id].desc.tableErrors && error.parmName) {
		msg = gIO.elts[id].desc.tableErrors[error.parmName];
	} else {
		msg = "";
	}
	switch (error.msg) {
	case "too low":
		msg += " < POH minimum";
		break;
	case "too high":
		msg += " > POH maximum";
		break;
	case "invalid":
	default:
		// assert(false, "POHError: bad error message: " + msg);
		break;
	}
	assert(id in gIO.elts && !gIO.elts[id].input && gIO.elts[id].desc.invalid == "poh", "POHError: not POH output: " + id);
	setOutput(id, (msg? INVALID_RANGE: INVALID));
	setIOError(id, msg);
	return (true);
}

/*
 * Set an output that was a result of a POH table lookup.
 * Sets up the error string, if the value is not valid.
 */
function setPOHOutput (id, value, fmt, tableID) {
	if (!isValid(value)) {
		POHError(id, value, tableID);
	} else {
		resetIOError(id);
		setOutput(id, value, fmt);
	}
}

/*
 * Set an element's error string.
 */
function setIOError (id, msg, fmt) {
	var io;
	var err;

	// set the error on the main version
	id = gIO.elts[id].link || id;
	io = gIO.elts[id];
	if (io.input && io.desc.type[0].match(/[croO]/)) {
		return;			// no errors on checkboxes, radio, and options
	}
	if (io.conv) {
		id = getCurrentUnitsID(id);
		io = gIO.elts[id];
	}
	// setup error message and format object
	if (msg == undefined && io.input) {
		msg = inputValidationError(id);
	}
	if (msg) {
		// if message is an object use it, otherwise build message and format object
		if (typeOf(msg) == "object") {
			err = msg;
		} else {
			err = {msg: msg, fmt: fmt};
		}
	} else {
		err = null;
	}
	io.error = err;
	// set the error on all the linked siblings
	for (id in io.linked) {
		setIOErrorField(id, err);
	}
}

/*
 * Set an elements error string field.
 * If an error string field does not exist, add a new error row below the element.
 * Note: the new row has only one entry. Use a pre-defined error row if the ID row contains
 * more than one element.
 */
function setIOErrorField (id, err) {
	var io = gIO.elts[id];
	var elt;
	var html;
	var sid, ids;
	var row, cols, i;

	//logMsg('setIOError('+id+',"'+msg+'")');
	// If there's a shared error field and the error is being reset, then check the other ids
	// that share the error field (errSiblings) to see if there are other errors.
	if (io.errSiblings && !err) {
		for (sid in io.errSiblings) {
			sid = gIO.elts[sid].link || sid;
			if (!gIO.elts[sid].hideErr && gIO.elts[sid].error) {
				err = gIO.elts[sid].error;
				break;
			}
		}
	}
	// Create an error row underneath the id's row if there's no error row already created.
	assert(io.desc.errID, "setIOErrorField: no error id set for: "+id);
	// if the row doesn't already exist, create it
	if (!document.getElementById(io.desc.errID)) {
		if (!err) {
			return;		// don't create an error row if it's not being set
		}
		// compute the number of columns in the row, including spanned columns
		row = getParentTag(id, "tr");
		cols = 0;
		for (i = 0; i < row.cells.length; i++) {
			cols += row.cells[i].colSpan;
		}
		// create the row. The first column is skipped. The next column spans
		//  the remaining columns and will contain the error string.
		html = "<td></td><td colspan=\""
			+(cols > 2? (cols - 1): 1)
			+"\"><span id=\""+io.desc.errID+"\"></span></td>";
		row = getParentTag(id, "table").insertRow(row.rowIndex + 1);
		row.className = "errRow";
		row.innerHTML = html;
		io.autoHideErr = true;		// created error rows are automatic show/hide
	} else if (io.autoHideErr == undefined) {
		// An error ID can be automatically shown and hidden when empty
		// if its parent row is an "errRow"
		io.autoHideErr = !!getParentTag(io.desc.errID, "tr").className.match(/errRow/);
	}
	elt = getElt(io.desc.errID);
	if (err) {
		elt.style.color = (err.fmt && "color" in err.fmt? err.fmt.color: "red");
		elt.style.backgroundColor =
			(err.fmt && "backgroundColor" in err.fmt
				? err.fmt.backgroundColor
				: "transparent")
		;
		elt.innerHTML = err.msg;
	} else {
		elt.innerHTML = "";
	}
	showRow(io.desc.errID, !io.hideErr && (io.autoHideErr? !!err: true));
}

/*
 * Show/hide and IO and any error rows.
 */
function showIOErr (id, show) {
	var io = gIO.elts[id];
	var errID = io.desc.errID;
	var err = gIO.elts[gIO.elts[id].link || id].error;

	io.hideErr = !show;
	setIOErrorField(id, gIO.elts[gIO.elts[id].link || id].error);
}

/*
 * Get I/O error object
 */
function getIOError (id) {
	return (gIO.elts[gIO.elts[id].link || id].error);
}

/*
 * Copy an option list.
 */
function copyOptions (dstID, srcID) {
	var src = getElt(srcID);
	var i;

	clearOptions(dstID);
	for (i = 0; i < src.options.length; i++) {
		addOption(dstID, src.options[i].value, src.options[i].text);
	}
	selectOption(dstID, src.value);
}

/*
 * Reset IO errors for IDs. Can take an unordered list as an arguent.
 */
function resetIOError (/*varargs*/) {
	var i;
	var arg;

	for (i = 0; i < arguments.length; i++) {
		arg = arguments[i];
		if (typeOf(arg) =="object") {
			for (id in arg) {
				setIOError(id, "");
			}
		} else {
			setIOError(arg, "");
		}
	}
}

/*
 * Reset input validation errors for IDs. Can take an unordered list as an arguent.
 */
function setIOValidationError (/*varargs*/) {
	var id, arg;
	var i, j;

	for (i = 0; i < arguments.length; i++) {
		arg = arguments[i];
		if (typeOf(arg) == "object") {
			for (id in arg) {
				setIOError(id, inputValidationError(id));
			}
		} else {
			setIOError(arg, inputValidationError(arg));
		}
	}
}

/*
 * Return the validation error string for an input ID.
 */
function inputValidationError (id) {
	var io = gIO.elts[gIO.elts[id].link || id];
	var value;

	assert(io && io.input, "inputValidationError: not an input: "+id);
	// if the id is not in current units, use proper id
	if (io.desc.conv && getIOUnits(id) != getIO(io.desc.conv)) {
		id = getCurrentUnitsID(id);
		io = gIO.elts[gIO.elts[id].link || id];
	}
	value = getInputField(id);
	// Compose a type dependent error message
	switch (io.desc.type[0]) {
	case "n":							// Integers and floats
		var min = inputMin(id);
		var max = inputMax(id);
		if (io.desc.type.indexOf(".") >= 0) {	// Float
			value = validateFloat(value);
		} else {								// Integer
			value = validateInt(value);
		}
		// Display basic errors, if the error field exists.
		if (!isValid(value)) {
			return ("Invalid input");
		}
		if (value < min) {
			return ("Too small");
		}
		if (value > max) {
			return ("Too large");
		}
		break;
	case "w":							// wind speed spec string
		if (!Wind.isValidSpeed(value)) {
			return ("Invalid input");
		}
		break;
	case "d":							// wind direction spec string
		if (!Wind.isValidDir(value)) {
			return ("Invalid input");
		}
		break;
	case "e":
		if (!isValid(value)) {
			return ("Invalid email address");
		}
		break;
	case "i":
		if (!isValid(value)) {
			return ("Invalid characters");
		}
		break;
	default:
		break;
	}
	return ("");
}

/****
 * Select IDs functions
 ****/

/*
 * Get an array that contains IDs that match a RegEx pattern.
 * If "input" is true, then only input IDs are checked.
 */
function getIOIds (pat, type) {
	var id;
	var io;
	var elts = uList();

	if (typeOf(pat) != "regexp") {
		pat = new RegExp(pat);
	}
	for (id in gIO.elts) {
		io = gIO.elts[id];
		if ((type == "input" && !io.input) || (type == "output" && io.input)) {
			continue;
		}
		if (pat.test(id)) {
			elts.add(id);
		}
	}
	return (elts);
}

/*
 * Get an array that contains IDs that belong to a page.
 * type can be "input" or "output" to restrict IDs to inputs or outputs.
 * Anything else gets both. Arguments after type are units. Including
 * those will restrict to those units (e.g. "ft", "inhg").
 */
function getPageIds (page, type /* units varargs */) {
	var id;
	var io;
	var elts = uList();
	var units;
	var u;
	var i;

	if (arguments.length > 2) {
		units = {};
		for (i = 2; i < arguments.length; i++) {
			u = arguments[i];
			if (u) {
				units[u] = true;
			}
		}
	}
	for (id in gIO.elts) {
		io = gIO.elts[id];
		if ((type == "input" && !io.input) || (type == "output" && io.input)) {
			continue;
		}
		if (io.page == page) {
			if (units) {
				u = getIOUnits(id);
				if (u && !(u in units)) {
					continue;
				}
			} else if (!isCurrentUnits(id)) {
				continue;
			}
			elts.add(id);
		}
	}
	return (elts);
}

/*
 * Return an unordered list of IDs that meet a given criteria.
 * Take a list of criteria and/or arrays of criteria.
 * The criteria can be an ID or of the form "<page:plist;io:xxx;unit:ulist>".
 * plist is a comma separated list of pages. xxx is either "input" or "output",
 * ulist is comma separated list of units. Any of the "page:", "io:" or "unit:" terms may be omitted.
 * If present all IO elements that match the criteria are added to the list. If unit: is given,
 * than IDs that have no units but match the other criteria are added.
 * "<page:WB;io:input;unit:gal,lbs>" will return all input IDs on the WB page that either have
 * no units or are in gallons or pounds.
 */
function getIdList (/* varargs */) {
	var ids = uList();
	var id, io, u, arg;
	var pageFilter, ioFilter, unitFilter;
	var i, m;

	for (i = 0; i < arguments.length; i++) {
		arg = arguments[i];
		if (typeOf(arg) == "array") {
			ids.add(getIdList.apply(null, arg));
		} else if (arg.match(/<[\w,:;]+>/)) {
			pageFilter = ioFilter = unitFilter = null;
			if (m = arg.match(/page:([\w,]*)/)) {
				pageFilter = uList.apply(null, m[1].split(","));
			}
			if (m = arg.match(/io:(input|output)/)) {
				ioFilter = m[1];
			}
			if (m = arg.match(/unit:([\w,]*)/)) {
				unitFilter = uList.apply(null, m[1].split(","));
			}
			for (id in gIO.elts) {
				io = gIO.elts[id];
				u = getIOUnits(id);
				if ((!pageFilter || io.page in pageFilter)
					&& (!ioFilter || ioFilter == (io.input? "input": "output"))
					&& (!unitFilter || !u || u in unitFilter)
				) {
					ids.add(id);
				}
			}
		} else if (arg in gIO.elts) {
			ids.add(arg);
		}
	}
	return (ids);
}

/****
 * Initial setup functions
 ****/

/*
 * Initialize gIO and set up input and output fields
 */
function setupIO (iDesc, oDesc) {
	var id, sid;
	var elt;
	var io;
	var i;
	var u;
	var o;
	var m, n;

	// Initialize the gIO input element object from the descriptor.
	for (id in iDesc) {
		assert(gIO.elts[id] == undefined, "setupIO: I/O defined more than once: "+id);
		io = {};
		io.input = true;
		io.desc = iDesc[id];
		gIO.elts[id] = io;
	}
	// Initialize the output object from the descriptor
	for (id in oDesc) {
		io = {};
		io.input = false;
		io.fmt = "";
		io.desc = oDesc[id];
		gIO.elts[id] = io;
	}
	// setup error siblings and "same" descriptors
	// Do "same" first in case a "link" points to a "same"
	for (id in gIO.elts) {
		io = gIO.elts[id];
		sid = io.desc.same;
		if (sid) {
			assert(sid in gIO.elts, "setupIO: invalid link or same: "+sid);
			o = objectCopy(gIO.elts[sid].desc);	// copy same descriptor
			delete o.page;						// don't let same id page setting show thru
			delete o.errID;						// don't let same id errID setting show thru
			io.desc = objectMerge(io.desc, o);
		}
		// set the IDs that share this error field in errSiblings
		if (io.desc.errID) {
			io.errSiblings = uList();
			for (sid in gIO.elts) {
				if (sid != id && gIO.elts[sid].desc.errID == io.desc.errID
					&& getIOUnits(sid) == getIOUnits(id)
				) {
					io.errSiblings.add(sid);
				}
			}
		} else {
			io.errSiblings = null;
		}
	}
	// build a list of alternates for each unit
	for (u in gIO.convFn) {
		m = u.split("-");
		if (m[0] in gIO.unitAlternate) {
			gIO.unitAlternate[m[0]].add(m[1]);
		} else {
			gIO.unitAlternate[m[0]] = uList(m[1]);
		}
	}
	// setup links, initial values, errors, conversions
	for (id in gIO.elts) {
		io = gIO.elts[id];
		sid = io.desc.link;
		if (sid) {
			assert(sid in gIO.elts, "setupIO: invalid link or same: "+sid);
			o = objectCopy(gIO.elts[sid].desc);	// copy link descriptor
			delete o.page;						// don't let link id page setting show thru
			delete o.errID;						// don't let link id errID setting show thru
			io.desc = objectMerge(io.desc, o);
		}
		io.link = io.desc.link;
		u = getIOUnits(id);
		if (io.link) {
			assert(io.link in gIO.elts, "setupIO: invalid link: " + io.link);
			assert(io.input == gIO.elts[io.link].input, "setupIO: link mismatch: "+id);
			// add it to the "linked" list on the target
			gIO.elts[io.link].linked = gIO.elts[io.link].linked || uList(io.link);	// include target
			gIO.elts[io.link].linked.add(id);
		} else {
			io.linked = io.linked || uList(id);		// always link to yourself
			// initialize values for non-linked elements
			io.value = inputDefault(id);
			io.lastValue = NaN;
			io.error = null;
			// make sure a conversion function is set
			if (u) {
				assert(u in gIO.unitController, "setupIO: units not in unitController: "+u);
				if (!io.desc.conv) {
					io.desc.conv = gIO.unitController[u];		// use default conversion
				}
				io.convSiblings = getIOIds("^"+getIOUnitsBase(id)+"_");
			}
		}
		if (!io.desc.errID) {
			io.desc.errID = getIOUnitsBase(id)+"Error";
		}
	}
	// Set up all the input and output fields
	for (id in gIO.elts) {
		io = gIO.elts[id];

		// setup outputs
		if (!io.input) {
			// can't use getElt() since some outputs don't exist yet
			elt = document.getElementById(id);
			if (elt) {
				addCSSClass(elt, "Output");
			}
			elt.fmt = "";
			continue;
		}
		io.value = inputDefault(id);
		// Setup the input fields event handlers.
		switch (io.desc.type[0]) {
		case "n":
		case "s":
		case "S":
		case "e":
		case "i":
		case "w":
		case "d":
			elt = getElt(id);
			// Setup handlers for user inputs.
			if (io.desc.type.indexOf("*") < 0) {
				elt.onchange = handleChange;
				elt.onkeyup = handleEnter;
				elt.onclick = handleFocus;
			}
			break;
		case "c":
			elt = getElt(id);
			elt.onclick = handleChange;
			break;
		case "o":
		case "O":
			elt = getElt(id);
			if (gDev.platform == "iPhone") {
				// fix the unfortunate iPhone native picker by using spinning wheels
				convertOptionToInput(id);
				elt = getElt(id);			// re-get element as it's changed
				elt.onclick = handleFocus;
			}
			elt.onchange = handleChange;
			break;
		case "r":
			var options = document.getElementsByName(id);
			for (i = 0; i < options.length; i++) {
				options[i].onchange = handleChange;
			}
			break;
		case "T":
		default:
			break;
		}
		// Setup the input attributes to match the "type" description
		switch (io.desc.type[0]) {
		case "n":
		case "s":
		case "S":
			m = io.desc.type.match(/.(\d+)(\.)?(\d+)?/);
			if (m) {
				assert(m != null, "setupInputFields: bad descriptor: " + io.desc.type);
				n = (m[2] == "."? parseInt(m[1], 10) + parseInt(m[3], 10) + 1: parseInt(m[1], 10));
				// if a numeric type and it can be negative, add one more unit for the minus sign
				if (io.desc.type[0] == "n" && inputMin(id) < 0) {
					n++;
				}
				elt = getElt(id);
				if (elt.nodeName.toLowerCase() != "select") {
					elt.maxLength = n;
					elt.size = n;
					addCSSClass(elt, io.desc.type[0]+String(n));
				}
			}
			break;
		case "w":
		case "d":
			elt = getElt(id);
			n = (io.desc.type[0] == "w"? 5: 7);
			elt.maxLength = n;
			elt.size = n;
			addCSSClass(elt,"S"+String(n));
			break;
		case "e":
		case "i":
			elt = getElt(id);
			n = 20;
			elt.maxLength = 50;
			elt.size = n;
			addCSSClass(elt, "s"+String(n));
			break;
		case "T":
		default:
			break;
		}
	}
	setInputStyle();		// setup the current input mechanism
}

/*
 * Setup the input method.
 * If an internal input mechanism is used (picker, slider, or keypad) set the input fields that use
 * these  mechanisms to "readonly", as this prevents the device from displaying a it's own keypad.
 */
function setInputStyle () {
	var id;
	var io;
	var elt;
	var numInputStyle = getIO("SetNumInputStyle");

	// Setup the input fields to use the right input mechanism.
	// When using pickers or sliders, set the input fields that use
	// these input mechanisms to "readonly", as this prevents the device from displaying a keypad.
	for (id in gIO.elts) {
		io = gIO.elts[id];
		if (!io.input || io.desc.type[0] == 'r') {
			continue;		// skip outputs and radio buttons
		}
		elt = getElt(id);
		switch (io.desc.type[0]) {
		case "n":
			elt.readOnly =
				(numInputStyle == "keypad")
				|| (numInputStyle == "tPicker" && io.desc.sw)
				|| (numInputStyle == "vSlider" && io.desc.vtick);
			break;
		case "d":
		case "w":
			elt.readOnly =
				(numInputStyle == "keypad") || (numInputStyle == "tPicker");
			break;
		case "o":
		case "O":
			elt.readOnly = (gDev.platform == "iPhone");	// replace the unfortunate IOS7 picker
			break;
		default:
			break;
		}
		// setup event handlers
		switch (io.desc.type[0]) {
		case "n":
		case "d":
		case "w":
		case "o":
		case "O":
			if (elt.readOnly) {
				elt.onclick = handleFocus;
				elt.onfocus = null;
			} else {
				elt.onclick = null;
				elt.onfocus = handleFocus;
			}
			break;
		default:
			break;
		}
	}
}

/*
 * Setup the gIO page descriptor.
 */
function setupPages (pageDesc) {
	var page;			// current page
	var comp;			// current compute object
	var id, ids;
	var m, i, j;
	var io;
	var pages, pageRE;

	gIO.pageDesc = pageDesc;
	// record the enclosing page for each IO element.
	pages = ["Help"];
	for (page in gIO.pageDesc.pages) {
		pages.push(page);
	}
	pageRE = new RegExp("^("+pages.join("|")+")\\w*");
	// first pass through I/O elements
	gIO.tripIDs = uList();
	for (id in gIO.elts) {
		io = gIO.elts[id];
		// setup element's page
		io.page = io.desc.page || id.replace(pageRE, "$1");
		assert(io.page == "Help" || io.page in gIO.pageDesc.pages, "setupIO: no page found for: "+id);
		// add linked ids to the list of elements that make up a trip
		if (io.input && io.page == "Trip" && io.link) {
			gIO.tripIDs.add(id);
		}
	}
	// Initialize compute objects
	for (page in gIO.pageDesc.pages) {
		if (typeOf(gIO.pageDesc.pages[page].activate) == "string") {
			gIO.pageDesc.pages[page].activate = makeFunc(gIO.pageDesc.pages[page].activate);
		}
		if (typeOf(gIO.pageDesc.pages[page].deactivate) == "string") {
			gIO.pageDesc.pages[page].deactivate = makeFunc(gIO.pageDesc.pages[page].deactivate);
		}
		if (!gIO.pageDesc.pages[page].compute) {
			continue;
		}
		gIO.pageDesc.pages[page].inputIds = getIdList("<page:"+page+";io:input>");
		gIO.pageDesc.pages[page].outputIds = getIdList("<page:"+page+";io:output>");
		for (i = 0; i < gIO.pageDesc.pages[page].compute.length; i++) {
			comp = gIO.pageDesc.pages[page].compute[i];
			// initialize object to record previous input values for this computation
			comp.inputValues = {};
			if (comp.inputs) {
				comp.inputs = getIdList(comp.inputs);
				// make sure the unit controllers for the inputs are in the dependency list
				for (id in comp.inputs) {
					if (gIO.elts[id].conv) {
						comp.inputs.add(gIO.elts[id].conv);
					}
				}
			}
			if (comp.outputs) {
				comp.outputs = getIdList(comp.outputs);
				// make sure the unit controllers for the outputs are in the dependency list
				for (id in comp.outputs) {
					if (gIO.elts[id].conv) {
						comp.inputs.add(gIO.elts[id].conv);
					}
				}
			}
			if (typeOf(comp.fn) == "string") {
				comp.fn = makeFunc(comp.fn);
			}
		}
	}
	gIO.pageDesc.curCompute = [];		// current computation stack
	// setup tabs and/or index tables
	for (page in gIO.pageDesc.pages) {
		if (gIO.pageDesc.pages[page].childPages) {
			setupIndex(page);
		}
	}
}

/*
 * Setup the index lists for pages with children.
 * On non-small devices, the home index is a horizontal tab.
 * Otherwise, we use a vertical list.
 */
function setupIndex (page) {
	var id = page + 'Index';
	var elt = getElt(id);
	var pages = gIO.pageDesc.pages;
	var i;
	var child;
	var html;

	assert(pages[page].childPages, "setupIndex: page has no chidren: "+page);
	if (gUI.style == "small" || page != "Home") {
		// Vertical index. Build a table with two data items for each row:
		// One for the name of the child page and one for the right chevron.
		elt.className = 'Index';
		html = '<table><tbody>';
		for (i = 0; i < pages[page].childPages.length; i++) {
			child = pages[page].childPages[i];
			html += '<tr id="'+child+'-list" onclick="selectPage(\''+child+'\')" class="unselected-list">'
				+'<td>'+gIO.pageDesc.pages[child].name+'</td>'
				+'<td></td>'			// right chevron gets inserted here
				+'</tr>'
			;
		}
		html += '</tbody></table>';
	} else {
		// Horizontal tabbed index. Build a set of tables, one for each containing one element.
		// This lets you easily center vertically and horizontally. Sometimes CSS sucks.
		elt.className = 'Tab';
		html = '';
		for (i = 0; i < pages[page].childPages.length; i++) {
			child = pages[page].childPages[i];
			html += '<table id="'+child+'-tab" onclick="selectPage(\''+child+'\')" class="unselected-tab"><tbody><tr>'
				+'<td>'+gIO.pageDesc.pages[child].name+'</td>'
				+'</tr></tbody></table>'
			;
		}
	}
	elt.innerHTML = html;
}

/*
 * Turn a computation string into a function
 */
function makeFunc (fn, args) {
	if (typeOf(fn) == "function") {
		return (fn);
	}
	assert(typeOf(fn) == "string", "makeFunc: bad fn: "+fn);
	if (args) {
		return (eval("(function ("+args.join(",")+") {"+fn+"})"));
	}
	return (eval("(function () {"+fn+"})"));
}

/****
 * Input validation functions. Returns NaN if invalid.
 * This allows further computation with the value, since the result will also be NaN.
 ****/

/*
 * Check if a value(s) is invalid.
 * We use NaN for numbers or INVALID for other types because things like strings are not numbers.
 */
function isValid () {
	var v;
	var i;

	for (i = 0; i < arguments.length; i++) {
		v = arguments[i];
		if (typeof (v) == "object" || v === undefined || v === null) {
			return (false);
		}
		if (typeof (v) == "number"
			&& (isNaN(v) || v== INVALID_INPUT || v == INVALID_NULL || v == INVALID_RANGE)	// INVALID* is a number
		) {
			return (false);
		}
	}
	return (true);							// Any other types will be valid
}

/*
 * Check whether a list of input or output fields contain valid values (i.e. not NaN or null).
 */
function isValidIO (/*varargs*/) {
	var i, v, a;

	for (i = 0; i < arguments.length; i++) {
		a = arguments[i];
		if (typeof (a) == "string") {
			if (a in gIO.elts) {
				v = getIO(a);
			} else {
				v = NaN;
			}
		} else if (typeOf(a) == "array") {
			if (!isValidIO.apply(null, a)) {
				return (false);
			}
			continue;
		} else {
			v = a;
		}
		if (!isValid(v) || v == null) {
			return (false);
		}
	}
	return (true);
}

/*
 * Validate the input. Return NaN (for numbers) or INVALID (for other types) if invalid.
 * Gets value from input field if no value is supplied.
 */
function validateInput (id, value) {
	var min, max;
	var options;
	var io = gIO.elts[gIO.elts[id].link || id];
	var type;

	assert(io && io.input, "validateInput: bad element id=" + id);
	if (value === undefined) {
		value = getInputField(id);
	}
	if (!isValid(value)) {
		return (INVALID);
	}
	type = io.desc.type;
	switch (type[0]) {
	case "n":							// Integers and floats
		min = inputMin(id);
		max = inputMax(id);
		if (type.indexOf(".") >= 0) {	// Float
			value = validateFloat(value);
		} else {						// Integer
			value = validateInt(value);
		}
		if (!isValid(value) || value < min || value > max) {
			value = NaN;
		}
		break;
	case "c":							// Checkbox
		value = validateBool(value);
		break;
	case "o":							// Fixed options menu
	case "O":							// Variable options menu
		value = validateOption(id, value);
		break;
	case "s":							// String
		if (type.length > 1) {
			value = String(value).slice(0, type.slice(1));
		} else {
			value = String(value);
		}
		break;
	case "S":							// String (all-caps)
		if (type.length > 1) {
			value = String(value).toUpperCase().slice(0, Number(type.slice(1)));
		} else {
			value = String(value).toUpperCase();
		}
		break;
	case "r":							// Radio buttons
		assert(isValid(value), "validateInput: bad radio button id=" + id);
		break;
	case "w":							// wind speed spec string
		if (!Wind.isValidSpeed(value)) {
			value = INVALID;
		}
		break;
	case "d":							// wind direction spec string
		if (!Wind.isValidDir(value)) {
			value = INVALID;
		}
		break;
	case "e":							// email address
		value = String(value);
		if (!/.@.+\..+/.test(value) || value.length < 3) {
			value = INVALID;
		}
		break;
	case "i":							// saveID
		value = String(value);
		if (value.length > 0 && (gIO.saveIdPat.test(value) || value.length < 3)) {
			value = INVALID;
		}
		break;
	case "T":
		break;
	case "Z":
		break;
	default:
		assert(false, "validateInput: bad input descriptor id=" + id + " type=" + type);
		value = INVALID;
		break;
	}
	return (value);
}

/*
 * Validate that input is an integer.
 */
function validateInt (input) {
	var v;

	if (typeof input == "number") {
		// Check that it's an integer
		if (input == round(input)) {
			return (input);
		} else {
			return (NaN);
		}
	}
	if (typeof input == "string") {
		input = input.replace(/,/g, "");		// remove commas
		input = input.replace(/^0*(.)/, "$1");	// remove leading zeros
		v = parseInt(input, 10);
		if(v != input) {
			return (NaN);
		}
		return (v);
	}
	return (NaN);
}

/*
 * Validate that input is an floating point number.
 */
function validateFloat (input) {
	var v;

	if (typeof input == "number") {
		return (input);
	}
	if (typeof input == "string") {
		input = input.replace(/,/g, "");		// remove commas
		input = input.replace(/^0*(.)/, "$1");	// remove leading zeros
		v = parseFloat(input, 10);
		if (v != input) {
			return (NaN);
		}
		return (v);
	}
	return (NaN);
}

/*
 * Validate that input is a Boolean.
 */
function validateBool (input) {
	if (typeof input == "boolean") {
		return (input);
	} else if (typeof input == "string") {
		if (input == "true") {
			return (true);
		}
		if (input == "false") {
			return (false);
		}
	} else if (typeof input == "number") {
		return (input != 0);
	}
	return (INVALID);
}

/*
 * Validate that input is in an option menu.
 */
function validateOption (id, input) {
	if (findOptionIndex(id, input) < 0) {
		return (INVALID);
	}
	return (input);
}

/*
 * Return default value for this input field.
 */
function inputDefault (id) {
	var io = gIO.elts[gIO.elts[id].link || id];
	var desc = io.desc;

	if (typeof (desc.def) == "string" && desc.type[0] == "n") {
		return (eval(desc.def));
	} else if (typeof (desc.def) == "function") {
		return (desc.def());
	}
	return (desc.def);
}

/*
 * Return minimum value for this input field.
 */
function inputMin (id) {
	var io = gIO.elts[gIO.elts[id].link || id];
	var desc = io.desc;

	if (typeof (desc.min) == "string") {
		return (eval(desc.min));
	} else if (typeof (desc.min) == "function") {
		return (desc.min());
	}
	return (desc.min);
}

/*
 * Return maximum value for this input field.
 */
function inputMax (id) {
	var io = gIO.elts[gIO.elts[id].link || id];
	var desc = io.desc;

	if (typeof (desc.max) == "string") {
		return (eval(desc.max));
	} else if (typeof (desc.max) == "function") {
		return (desc.max());
	}
	return (desc.max);
}

/*
 * Return initial setting for slider or spinning wheel for this input field.
 */
function inputOld (id) {
	var io = gIO.elts[gIO.elts[id].link || id];
	var desc = io.desc;

	if (desc.old == undefined) {
		return (io.value);
	}
	if (typeof (desc.old) == "string" && desc.type[0] == "n") {
		return (evalComp(desc.old, {old: io.value}));
	}
	if (typeof (desc.old) == "function") {
		return (desc.old(io.value));
	}
	return (desc.old);
}

/****
 * I/O state storage functions
 ****/

/*
 * Build a cloud ID.
 */
function cloudSaveID (email, saveID) {
	if (email == undefined) {
		email = getIO("SetEmail");
		saveID = getIO("SetSaveID");
	} else {
		email = validateInput("SetEmail", email);
		saveID = validateInput("SetSaveID", saveID);
	}
	if (!isValid(email) || !isValid(saveID) || !email || !saveID) {
		return (null);
	}
	saveID = email + "+" + saveID;
	saveID = saveID.replace(gIO.saveIdPat, "");
	if (saveID.length < 4) {
		return (null);
	}
	return (saveID);
}

/*
 * Save the current input values.
 */
function saveInput (localOnly) {
	var s;
	var inputState;
	var now = new Date();
	var saveID = cloudSaveID();
	var CHECK_CLOUD_INTERVAL = 10 * 60;			// interval to check for remote updates in seconds
	var cloudInputState;

	// If cloud backup isn't on, just save locally.
	localOnly = localOnly || !gIO.cloudEnabled || !saveID;

	// If this device is left running the app without updating for a long time (> CHECK_CLOUD_INTERVAL seconds)
	// then check to see if the server data is more recent.
	if (!localOnly && gIO.cloudSaveTime && (now.getTime() - gIO.cloudSaveTime.getTime()) / 1000 > CHECK_CLOUD_INTERVAL) {
		// The local data may be old. This can happen if you simply leave the WebApp window open.
		// Get the remote data and see if another device has updated it since we last saved.
		s = getCloudStorage(saveID);
		if (s) {
			cloudInputState = JSON.parse(s);
			if ("SaveTime" in cloudInputState) {
				cloudInputState["SaveTime"] = new Date(cloudInputState["SaveTime"]);	// JSON does not parse dates
				// If the remote's cloudSaveTime is greater than the last time we saved,
				// then some other device overwrote our values.vAsk which ones to use.
				// Even if there is no other device writing, the local cloudSaveTime may not
				// be equal to the remote cloudSaveTime if a save request got dropped.
				if (!isNaN(cloudInputState["SaveTime"].getTime())
					&& cloudInputState["SaveTime"].getTime() > gIO.cloudSaveTime.getTime()
				) {
					dialog.confirm(
						"Cloud values have been updated by another device. "
							+ "Would you like to use cloud values and discard current ones?",
						function (yes) {
							if (yes) {
								location.reload();	// setInputState() isn't working here, just reload to re-get cloud values.
							} else {
								gIO.cloudSaveTime = new Date();
								saveInput();		// try again with more recent cloudSaveTime
							}
						}
					);
					return;
				}
			}
		}
	}
	inputState = getInputState();
	s = JSON.stringify(inputState);		// get the JSON version of the input state
	setStorage(gAppID + "Input", s);	// save locally
	gIO.saveTime = inputState["SaveTime"];
	if (!localOnly) {
		gIO.cloudSaveTime = gIO.saveTime;
		// don't save local inputs
		for (id in gIO.elts) {
			if (gIO.elts[id].desc.local) {
				delete inputState[id];
			}
		}
		setCloudStorage(saveID, JSON.stringify(inputState), true);
	}
}

/*
 * Print the application state into the AppState area.
 */
function writeAppState () {
	var id;
	var io;
	var i = [];
	var o = [];

	for (id in gIO.elts) {
		io = gIO.elts[id];
		if (!io.link) {
			(io.input? i: o).push(id + ":" + io.value);
		}
	}

	document.getElementById("AppState").innerHTML
		= "<p>VERSION: " + VERSION + "</p>"
		+ "<p>TERMS OF USE: " + TOU_VERSION + "</p>"
		+ "<p>INPUT:<br />" + i.sort().join(", ") + "</p>"
		+ "<p>OUTPUT:<br />" + o.sort().join(", ") + "</p>";
}

/*
 * Get an object that contain the complete the input state
 */
function getInputState () {
	var id;
	var io;
	var inputState = {};

	// Mark the input values with AppID, version, and date.
	inputState["AppID"] = gAppID;
	inputState["Version"] = VERSION;
	inputState["SaveTime"] = new Date();
	inputState["AgentString"] = navigator.userAgent;
	inputState["AgentPlatform"] = gDev.platform;
	inputState["AgentProps"] = "UI style="+gUI.style+",PhoneGap="+gDev.phoneGap+",Mobile="+gDev.mobile+",Touch="+gDev.touch;
	// Add the values for each input ID.
	for (id in gIO.elts) {
		io = gIO.elts[id];
		if (!io.link && io.input && isCurrentUnits(id)) {
			inputState[id] = io.value;
		}
	}
	// Add aircraft and trips.
	inputState["Aircraft"] = gIO.aircraft;
	inputState["Trips"] = gIO.trips;
        inputState["Checks"] = gIO.checks;
	return (inputState);
}

/*
 * Get an object that contain the complete the output state
 */
function getOutputState () {
	var id;
	var io;
	var outputState = {};

	// Add the values for each input ID.
	for (id in gIO.elts) {
		io = gIO.elts[id];
		if (!io.link && !io.input) {
			outputState[id] = io.value;
		}
	}
	return (outputState);
}

/*
 * Initialize user input from an inputState object.
 */
function setInputState (inputState) {
	var id, tid;
	var value;
	var ac, inputAC;
	var trip, inputTrip,check,inputCheck;
	var name;
	var io;
	var unitIDs = uList("SetAltimeterUnits", "SetRunwayUnits", "SetFuelUnits", "SetWeightUnits");
	var value;
	var ids;
	var i;

	if (inputState == null) {
		inputState = {};		// set up default inputs
	} else if ("AppID" in inputState && inputState["AppID"] != gAppID) {
		assert(false, "setInputState: bad AppID: " + inputState["AppID"]);
		return;
	}
	assert(typeOf(inputState) == "object", "setInputState: bad inputState type: "+typeOf(inputState));
	// setup current units
	for (id in unitIDs) {
		if (id in inputState && isValid(validateInput(id, inputState[id]))) {
			setupInput(id, inputState[id]);
		} else {
			setupInput(id, inputDefault(id));
		}
	}
	// initialize trips and aircraft
	delete (gIO.aircraft);
	gIO.aircraft = [];
	delete (gIO.trips);
	gIO.trips = [];
	setTripOptions("[Current]");
	selectTrip();
        delete (gIO.checks);
	gIO.checks = [];
        setCheckOptions("[Current]");
        selectCheck();
	// initialize airports, runway selector and airport data
	setupInput("DepArpt", inputDefault("DepArpt"));
	setAirportIO("Dep", true);
	setupInput("DestArpt", inputDefault("DestArpt"));
	setAirportIO("Dest", true);
	// set up the non-linked input elements in current units to default values.
	// Do this first in case the inputState is in different units
	for (id in gIO.elts) {
		io = gIO.elts[id];
		if (!io.link && io.input && isCurrentUnits(id) && !(id in unitIDs)) {
			setupInput(id, inputDefault(id));
		}
	}
	// now set up the inputState values
	for (id in inputState) {
		switch (id) {
		case "AppID":
		case "Version":
		case "SaveTime":
		case "AgentString":
		case "AgentPlatform":
		case "AgentProps":
		case "Aircraft":
                case "Checks":
		case "Trips":
			continue;		// skip
		default:
			break;
		}
		if (id in gIO.elts) {				// skip invalid IDs
			io = gIO.elts[id];
			// Set up valid, non-link, non-local input fields in current units.
			// Trip and AC fields are handled later.
			if (!io.link && io.input && isCurrentUnits(id)
				&& io.page != "Trip" && io.page != "AC"
				&& isValid(validateInput(id, inputState[id]))
				&& io.desc.type[0] != "T"
				&& !(io.desc.type[0].toLowerCase() == "s" && inputState[id] == "")
			) {
				setupInput(id, inputState[id]);
			}
		} else {
			logMsg("setInputState: discarded id in inputState: "+id);
		}
	}
	// Set up the saved aircraft, making sure that the saved ids in the aircraft are still valid.
	if (typeOf(inputState["Aircraft"]) == "array") {
		ids = getIdList("<page:AC;io:input>");
		ids.remove("SelectedAC");
		ids.add("SetWeightUnits");
		for (i = 0; i < inputState["Aircraft"].length; i++) {
			inputAC = inputState["Aircraft"][i];
			// Skip if not a valid object.
			if (!inputAC || typeOf(inputAC) != "object") {
				logMsg("setInputState: invalid aircraft object in inputState");
				continue;
			}
			// Skip if the aircraft doesn't have a valid name or it already exists.
			if (!("ACReg" in inputAC)) {
				logMsg("setInputState: aircraft object in inputState does not contain ACReg");
				continue;
			}
			name = inputAC["ACReg"];
			if (typeof (name) != "string" || name.length == 0 || name == "[NONE]" || findAircraftIndex(name) >= 0) {
				logMsg("setInputState: invalid aircraft name in inputState:"+name);
				continue;
			}
			if (!checkAircraft(inputAC)) {
				logMsg("setInputState: invalid aircraft");
				// tell user about corrupt aircraft, unless there's a salvage attempt, see below
				if (name != inputState["ACReg"]
					|| versionCompare(inputState["Version"], "2.3.4", 2) > 0
					|| inputState["Aircraft"].length > 1
				) {
					notice("corrupt aircraft data, discarding: "+name);
				}
				continue;
			}
			// setup the elements in a new aircraft in the units it was originally defined
			ac = {};
			for (id in ids) {
				if (isUnits(id, inputAC["SetWeightUnits"])) {
					ac[id] = (id in inputAC? inputAC[id]: inputDefault(id));
				}
			}
			gIO.aircraft.push(ac);		// add the new aircraft
		}
		/*
		 * Due to a bug that corrupted stored aircraft, we attempt to salvage a correct
		 * aircraft from the AC* inputs when there's only one stored aircraft.
		 */
		if (versionCompare(inputState["Version"], "2.3.4", 2) <= 0) {
			if (gIO.aircraft.length === 0 && inputState["Aircraft"].length === 1) {
				// get list of AC ids in correct units
				ac = {};
				for (id in ids) {
					if (id in inputState && isUnits(id, inputState["SetWeightUnits"])) {
						ac[id] = inputState[id];
					}
				}
				if (checkAircraft(ac)) {
					// set any new ids to default
					for (id in ids) {
						if (!(id in ac) && isUnits(id, ac["SetWeightUnits"])) {
							ac[id] = inputDefault(id);
						}
					}
					gIO.aircraft.push(ac);		// add the new aircraft
				} else {
					notice("corrupt aircraft data, discarding: "+inputState["ACReg"]);
				}
			}
			if (gIO.aircraft.length > 0) {
				notice("Due to an issue with saved aircraft data in previous versions, "
					+"please verify that all stored aircraft data is correct."
				);
			}
		}
	}
	// Set the selected aircraft if the one in inputState is OK. Otherwise use the first one or default.
	if (gIO.aircraft.length == 0) {
		value = "[NONE]";
	} else if ("SelectedAC" in inputState && findAircraftIndex(inputState["SelectedAC"]) >= 0) {
		value = inputState["SelectedAC"];
	} else {
		value = gIO.aircraft[0]["ACReg"];
	}
	// Set up the option lists and select the aircraft.
	setAircraftOptions(value);

	// Set up the saved trips, making sure that the saved ids in the trips are still valid.
	if (typeOf(inputState["Trips"]) == "array") {
		for (i = 0; i < inputState["Trips"].length; i++) {
			inputTrip = inputState["Trips"][i];
			// skip malformed structures
			if (!inputTrip || typeOf(inputTrip) != "object") {
				logMsg("setInputState: invalid trip object in inputState");
				continue;
			}
			// If the trip doesn't have a valid trip name or it already exists, skip it.
			if (!("TripName" in inputTrip)) {
				logMsg("setInputState: aircraft object in inputState does not contain TripName");
				continue;
			}
			name = inputTrip["TripName"];
			if (typeof (name) != "string" || name.length == 0 || name == "[Current]" || findTripIndex(name) >= 0) {
				logMsg("setInputState: invalid trip name in inputState:"+name);
				continue;
			}
			// If the trip doesn't have a recognized aircraft, reset it to [Any].
			if (inputTrip["TripSelectedAC"] != "[Any]"
				&& findAircraftIndex(inputTrip["TripSelectedAC"]) < 0
			) {
				inputTrip["TripSelectedAC"] = "[Any]";
				notice("Invalid aircraft in trip \""+name+"\"."
					+" Resetting trip aircraft to \"[Any]\"."
					+" Edit trip if a specific aircraft is required."
				);
			}
			// setup the elements in a new trip in the units it was originally defined
			trip = {};
			ids = getIdList("<page:Trip;io:input;unit:"+inputTrip["SetWeightUnits"]+","+inputTrip["SetFuelUnits"]+">");
			ids.remove("SelectedTrip");
			for (id in ids) {
				if (id in inputTrip && isValid(validateInput(id, inputTrip[id]))) {
					trip[id] = inputTrip[id];
				} else {
					trip[id] = inputDefault(id);		// use default for new values
				}
			}
			trip["SetWeightUnits"] = inputTrip["SetWeightUnits"];
			trip["SetFuelUnits"] = inputTrip["SetFuelUnits"];
			gIO.trips.push(trip);			// add the new trip
		}
	}
        
        // Set up the saved checks, making sure that the saved ids in the checks are still valid.
	if (typeOf(inputState["Checks"]) == "array") {
		for (i = 0; i < inputState["Checks"].length; i++) {
			inputCheck = inputState["Checks"][i];
			// skip malformed structures
			if (!inputCheck || typeOf(inputCheck) != "object") {
				logMsg("setInputState: invalid check object in inputState");
				continue;
			}
			// If the check doesn't have a valid check name or it already exists, skip it.
			if (!("CheckName" in inputCheck)) {
				logMsg("setInputState: aircraft object in inputState does not contain CheckName");
				continue;
			}
			name = inputCheck["CheckName"];
			if (typeof (name) != "string" || name.length == 0 || name == "[Current]" || findCheckIndex(name) >= 0) {
				logMsg("setInputState: invalid check name in inputState:"+name);
				continue;
			}
			// setup the elements in a new check in the units it was originally defined
			check = {};
			ids = getIdList("<page:Check;io:input>");
			ids.remove("SelectedCheck");
			for (id in ids) {
				if (id in inputCheck && isValid(validateInput(id, inputCheck[id]))) {
					check[id] = inputCheck[id];
				}
			}
			gIO.checks.push(check);			// add the new Check
		}
	}
        // Set the selected check if the one in inputState is OK
        setCheckOptions(i >= 0? inputState["SelectedCheck"]: "[Current]");
	selectCheck();
        
	// Set the selected trip if the one in inputState is OK. Otherwise use the default.
	i = ("SelectedTrip" in inputState? findTripIndex(inputState["SelectedTrip"]): -1);
	setTripOptions(i >= 0? inputState["SelectedTrip"]: "[Current]");
	selectTrip();					// select the trip and setup the page
	computePage("AC");				// setup the selected aircraft in the app
	computePage("Trip");			// setup the selected trip in the app
	computeAll();					// make sure everything is current
	saveInput();					// save the input in the latest version
}

/*
 * Reset the input to defaults. It deletes the local storage as well.
 */
function resetSavedInput (reload) {
	deleteStorage(gAppID + "Input");
	deleteStorage(gAppID + "Version");
	deleteStorage(gAppID + "TOU");
	// clearStorage(); don't do this as it affects other aircraft WebApps

	// Reload the application
	if (reload) {
		location.reload();
	}
}

/*
 * Turn a JSON string into a storage state object.
 * Returns null if the parse was not successful
 */
function parseStorage (s) {
	var state;

	if (s) {
		try {							// JSON can throw an error
			state = JSON.parse(s);		// parse the input into an object
			if (typeOf(state) == "object") {
				// parse the save time, since JSON won't parse date objects
				if (state["SaveTime"]) {
					state["SaveTime"] = new Date(state["SaveTime"]);
					if (isNaN(state["SaveTime"].getTime())) {	// check for valid date
						state["SaveTime"] = new Date(0);	// a long time ago
					}
				} else {
					state["SaveTime"] = new Date(0);		// a long time ago
				}
				fixSavedInput(state);		// convert to current version
				return (state);
			}
		} catch (e) {
			logMsg("corrupted storage string: "+s);
		}
	}
	return (null);
}


/*
 * Restore the saved input values.
 * Set up all the input fields and then recompute everything.
 */
function restoreInput () {
	var savedInput, cloudInput;
	var ls, rs;
	var saveID;
	var depArpt, destArpt;
	var trip;

	ls = getStorage(gAppID + "Input");
	savedInput = parseStorage(ls);
	if (!ls || !savedInput) {
		if (ls) {
			notice("Corrupted local storage. "
				+ "Please set up previous cloud sync IDs to recover settings from cloud."
			);
		}
		setInputState(null);		// setup default values
		return;
	}
	if (savedInput && "SetEmail" in savedInput && "SetSaveID" in savedInput) {
		saveID = cloudSaveID(savedInput["SetEmail"], savedInput["SetSaveID"]);
	}
	// Check cloud values if the local saveID values indicate cloud is enabled.
	if (saveID) {
		rs = getCloudStorage(saveID);
		if (rs) {
			cloudInput = parseStorage(rs);
			// If the version of this program is equal to or greater than the version that saved the cloud data
			// then the remote data is usable.
			if (cloudInput
				&&"AppID" in cloudInput && cloudInput["AppID"] == gAppID
				&& "Version" in cloudInput && versionCompare(VERSION, cloudInput["Version"], 1) >= 0
			) {
				// Use the cloud values if it's SaveTime is greater than the last locally recorded SaveTime (i.e. another device overwrote
				// the values since we last saved). This allows the local WebApp to work offline and make the local values more up to date.
				// Note the local version of "SingleUser" overrides the remote, since it is set per device.
				if (cloudInput["SaveTime"] > savedInput["SaveTime"]) {
					// use the local version of local inputs
					for (id in gIO.elts) {
						if (gIO.elts[id].desc.local) {
							if (id in savedInput) {
								cloudInput[id] = savedInput[id];
							} else {
								delete cloudInput[id];
							}
						}
					}
					savedInput = cloudInput;
					logMsg("restoreInput: Using cloud data");
				} else {
					logMsg("restoreInput: Using local data");
				}
			} else {
				// This application is older than the cloud saved version.
				// WebApps will be upgraded automatically when the application cache updates.
				// Native apps need to be upgraded by hand, so we give notice.
				if (gDev.phoneGap) {
					notice("This application version is older than the version that saved cloud data.<br>"
						+ "Disabling cloud sync until you update this application"
					);
				}
				setOutput("SetCloudStatus", "Disabled, version mis-match");
				logMsg("restoreInput: Old version. Disabling cloud backup");
				gIO.cloudEnabled = false;		// disable incompatible backup
			}
		}
	}
	// If there are airports in the saved input, we temporarily remove them and any trip
	// so that the UI can initialize without waiting for internet Metar queries. Afterwards
	// we reset the airports (or the selected trip that may contain airports) using a timeout.
	if ("DepArpt" in savedInput || "DestArpt" in savedInput) {
		depArpt = savedInput["DepArpt"];
		destArpt = savedInput["DestArpt"];
	}
	if (depArpt || destArpt) {
		// delete airports and selected trip
		if ("SelectedTrip" in savedInput) {
			trip = savedInput["SelectedTrip"];
		}
		delete savedInput["DepArpt"];
		delete savedInput["DestArpt"];
		delete savedInput["SelectedTrip"];
		setInputState(savedInput);			// setup input
		// restore airports and trip
		setTimeout(
			function () {
				if (trip && trip != "[Current]" && findTripIndex(trip) >= 0) {
					setInput("SelectedTrip", trip);		// real trip,  just select it
				} else {
					// [Current] trip. Set both trip and non-trip inputs
					if (depArpt) {
						setupInput("DepArpt", depArpt);
						computePage("Dep");
					}
					if (destArpt) {
						setupInput("DestArpt", destArpt);
						computePage("Dest");
					}
					computePage("Trip");
				}
			},
			10
		);
	} else {
		setInputState(savedInput);			// no airports, just setup the input
	}
}

/*
 * Get the Input JSON string saved in the cloud.
 * It's saved by the tuple (email, saveID).
 */
function getCloudStorage (saveID, updateStatus) {
	var url = gAjaxURL;
	var parms;
	var req = new XMLHttpRequest();
	var e;

	assert(saveID.length > 3, "getCloudStorage: bad saveID: " + saveID);
	if (!navigator.onLine) {
		setOutput("SetCloudStatus", "Offline");
		logMsg("getCloudStorage: offline");
		return ("");
	}
	// Setup the query parameters on getSavedInput.php.
	parms = "id=" + encodeURIComponent(saveID);
	url += "getSavedInput.php";
	try {
		// Send the query.
		req.open('POST', url, false);
		req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

		req.send(parms);
		if (req.status != 200) {
			if (reg.status != 410) {		// 410 indicates there is no previously saved input for that email & ID.
				setOutput("SetCloudStatus", "Server error", {color:"red"});
			}
			return ("");
		}
	} catch (e) {
		logMsg("getCloudStorage: URL:" + url + " Exception:" + JSON.stringify(e));
		setOutput("SetCloudStatus", "Exception", {color:"red"});
		return ("");
	}
	return (decodeURIComponent(req.responseText));
}

/*
 * Set the Input JSON string in the cloud.
 */
function setCloudStorage (saveID, s, updateStatus) {
	var url = gAjaxURL;;
	var parms;
	var req = new XMLHttpRequest();
	var e;

	if (!gIO.cloudEnabled) {
		setOutput("SetCloudStatus", "Disabled");
		return;
	}
	assert(saveID.length > 3, "setCloudStorage: Bad saveID: " + saveID);
	if (!navigator.onLine) {
		setOutput("SetCloudStatus", "Offline");
		return;
	}
	parms = "id=" + encodeURIComponent(saveID) + "&input=" + encodeURIComponent(s);
	url += "setSavedInput.php";
	try {
		req.open('POST', url, true);
		req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		req.onreadystatechange = function () {
			if (req.readyState != 4) {
				return;
			}
			if (req.status != 200) {
				logMsg("setCloudStorage: bad status=" + req.status + " msg=" + req.responseText);
				if (gIO.cloudStorageNotify) {
					gIO.cloudStorageNotify = false;
					notice("Cannot connect to cloud");
				}
				setOutput("SetCloudStatus", "Connection failure", {color:"red"});
				return;
			}
			setOutput("SetCloudStatus", "Active");
			gIO.cloudStorageNotify = true;
		};
		req.send(parms);
	} catch (e) {
		setOutput("SetCloudStatus", "Exception", {color:"red"});
		alert("Exception setting cloud storage: " + JSON.stringify(e));
	}
}

/*
 * Called when SetEmail or SetSaveID changes.
 * Check whether SetEmail and SetSaveID inputs form a valid save ID. If so, get the values saved in the cloud.
 * if the saved version is acceptable confirm that the user wants to override the local values.
 * If so, initialize the input with the new values.
 */
function checkCloud (enable) {
	var saveID = cloudSaveID();
	var rs, cloudInput;
	var id;

	if (enable) {
		gIO.cloudEnabled = true;
	}
	if (!saveID || !gIO.cloudEnabled) {
		setOutput("SetCloudStatus", "Disabled");
		return;
	}
	rs = getCloudStorage(saveID, true);
	if (!rs) {
		return;
	}
	cloudInput = parseStorage(rs);
	if (!cloudInput) {
		notice("Cloud storage invalid. Notify info@pohperformance.com if you would like to restore an earlier backup");
		return;
	}
	// If the version of this program is equal to or greater than the version that saved the cloud data
	// then the remote data is usable.
	if ("Version" in cloudInput && versionCompare(VERSION, cloudInput["Version"], 1) >= 0) {
		dialog.confirm("Override current values with cloud values?",
			function (yes) {
				if (yes) {
					for (id in gIO.elts) {
						if (gIO.elts[id].desc.local) {
							// Note the local version of local ids overrides the remote, since these are set per device.
							cloudInput[id] = getIO(id);
						}
					}
					setInputState(cloudInput);
				} else {
					setOutput("SetCloudStatus", "Disabled");
					gIO.cloudEnabled = false;		// disable incompatible backup
				}
			}
		);
	} else {
		// The App or WebApp is older than the remote saved version.
		// In the WebApp we'll probably get upgraded by the application cache in a few seconds, since we're online.
		if (gDev.phoneGap) {
			notice("Disabling cloud sync due to newer application versions on other devices. Please update this app to use cloud sync.");
		}
		setOutput("SetCloudStatus", "Disabled (version)");
		gIO.cloudEnabled = false;		// disable incompatible cloud sync
	}
}

/*
 * Email a trouble report to the address in SetEmail.
 */
function mailTR () {
	var email = getIO("SetEmail");
	var to = "info@pohperformance.com";
	var subject = "Trouble report";
	var content;
	var d = new Date();

	if (!/.@.+\..+/.test(email)) {
		notice("Valid email address required");
		return;
	}
	if (!navigator.onLine) {
		notice("Cannot send trouble report: not online");
		return;
	}

	saveID = "TR+" + email + "+" + d.toJSON().replace(/:/g,";");
	setCloudStorage(saveID + "+input", JSON.stringify(getInputState()));
	setCloudStorage(saveID + "+output", JSON.stringify(getOutputState()));
	subject += ": " + saveID;

	content = "AppID: " + gAppID + "\n"
		+ "Version: " + VERSION + "\n"
		+ "Terms of use: " + TOU_VERSION + "\n"
		+ "Email: " + email + "\n"
		+ "Browser: " + navigator.userAgent + "\n"
		+ "TR ID: " + saveID + "\n"
		+ "Please add a problem description here:\n";

	location.href = "mailto:" + to + "?"
		+ "Subject=" + encodeURIComponent(subject)
		+ "&body=" + encodeURIComponent(content);
}

/****
 * Option functions
 ****/

/*
 * Clear all options in all linked elements
 */
function clearOptions (id) {
	var io = gIO.elts[gIO.elts[id].link || id];
	var e;

	for (id in io.linked) {
		e = getElt(id);
		while (e.options.length > 0) {
			e.remove(0);
		}
	}
}

/*
 * Select an option in all linked elements
 */
function selectOption (id, value) {
	var io = gIO.elts[gIO.elts[id].link || id];

	for (id in io.linked) {
		getElt(id).value = value;
	}
}

/*
 * Add an option to all linked elements.
 */
function addOption (id, value, text) {
	var io = gIO.elts[gIO.elts[id].link || id];
	var o;

	text = text || value;
	for (id in io.linked) {
		o = document.createElement('option');
		o.text = text;
		o.value = value;
		try {
			getElt(id).add(o, null);	// standards compliant
		} catch(ex)	{
			getElt(id).add(o);		// IE only
		}
	}
}

/*
 * Remove an option
 */
function removeOption (id, value) {
	var io = gIO.elts[gIO.elts[id].link || id];
	var i;

	for (id in io.linked) {
		i = findOptionIndex(id, value);
		assert(i >= 0, "removeOption: option (" + value + ") not found for id: "+id);
		getElt(id).remove(i);
	}
}

/*
 * Find the index of an option.
 */
function findOptionIndex (id, value) {
	var e = getElt(gIO.elts[id].link || id);
	var i;

	for (i = 0; i < e.options.length; i++) {
		if (e.options[i].value == value) {
			return (i);
		}
	}
	return (-1);
}

/*
 * Get the text associated with a value
 */
function getOptionText (id, value) {
	var e = getElt(gIO.elts[id].link || id);
	var i;

	if (value == undefined) {
		value = e.value;
	}
	i = findOptionIndex(id, value);
	assert(i >= 0, "getOptionText: value not found for: "+id);
	return (e.options[i].text);
}

/*
 * Get the option value at an index.
 */
function getOptionValue (id, index) {
	return (getElt(gIO.elts[id].link || id).options[index].value);
}

/*
 * Convert an option to an input tag so that we can override it's behavior.
 * The new element has enough of the same attributes so that the other option
 * functions think they're still dealing with a normal <select> tag.
 */
function convertOptionToInput (id) {
	var e = document.createElement('input');
	var old = getElt(id);
	var font = getComputedStyle(old, "").font;
	var i;
	var setWidth = function (e) {
		var i;
		var width = 0;

		for (i = 0; i < e.options.length; i++) {
			width = Math.max(textWidth(e.options[i].text, font), width);
		}
		e.style.width = (width+8)+"px";		// needs a little more room
	};

	// Create options array on input tag and copy the individual options
	e.options = [];
	for (i = 0; i < old.options.length; i++) {
		e.options[i] = {};
		e.options[i].text = old.options[i].text;
		e.options[i].value = old.options[i].value;
		// set value to selected text, and preserve selected value
		if (e.options[i].value == e.value) {
			e.value = e.options[i].text;
			e.selValue = e.options[i].value;
		}
	}
	// Simulate the remove function.
	e.remove = function (i) {
		this.options.splice(i, 1);
		setWidth(this);
	};
	// Simulate the add function.
	e.add = function (o, i) {
		if (i === null) {
			this.options.push(o);
		} else {
			this.options.splice(i, 0, o);
		}
		setWidth(this);
	};
	// style
	setWidth(e);
	e.id = old.id;
	e.className = "dropdown";
	old.parentNode.replaceChild(e, old);
}

/*
 * Set default numeric input type
 */
function defaultNumInputStyle () {
	if (gUI.style == "small") {
		return ("tPicker");		// thumbwheel picker
	} else if (gDev.touch && !gDev.mobile && gDev.portWidth >= 580) {
		return ("vSlider");		// vernier slider
	} else {
		return ("standard");	// standard keyboard
	}
}

/****
 * Spinning wheel functions.
 ****/

/*
 * Show a series of spinning wheels to represent a numbers from a specified minimum to a
 * maximum using an increment. The arguments are:
 *  fmt: a string specifying the layout of the wheels.
 *    Each "?" in fmt represents a digit to be filled in
 *    Each "|" indicates a new wheel.
 *    If fmt starts with "+-" a separate wheel with "+" and "-" is placed on the left.
 *    If the leftmost wheel starts with "+", positive values on the leftmost wheel have a "+" prepended.
 *    A wheel can have non-numeric characters (i.e. not 0-9, or any of "+-,.").
 *    These are displayed in the corresponding wheelvbut they are ignored in the returned result.
 *  min, max: the minimum and maximum values. Each set of digits in the min and max should represent
 *    the lowest/highest values in the the corresponding wheel.
 *  incr: The increment for each returnable value
 *  dlft: The default wheel position. Each set of digits in dflt should represent the position
 *    of the corresponding wheel.
 * The results are entered into the HTML numeric input field, id.
 *
 * Example: snNumber("+-|?|?|&deg;C", 0, 59, 1, 15) returns integer values from -59 to +59.
 *    It will display 4 wheels:
 *    - A wheel with + and -
 *    - A wheel with a single digit from 0 to 5.
 *    - A wheel with a single digit from 0 to 9.
 *    - A wheel with a single fixed value: the HTML string "&deg;C"
 *    The last wheel contents are ignored in the returned value. In this case specifying -59 as the min would be wrong
 *    as only the first wheel handles positive and negative values; it would result in the second wheel only containing "5".
 */
function twNumber (id, min, max, incr, dflt) {
	var elt = getElt(id);
	var w;
	var t;
	var s;
	var d;
	var fmt = gIO.elts[id].desc.sw;	// picker format string
	var ndigits;			// the number of digits in the number to be set
	var point;				// the position of the decimal point counting from the right
	var wdigits;			// the nummber of digits in this wheel
	var wdflt, dfltIndex;
	var wfmt;				// an array with the format for each wheel
	var firstDigits = true;
	var nmin, nmax, nincr;
	var n, count;
	var wheels = [];
	var done = function (selections) {
		var s = "";
		var value;
		var w;

		if (selections) {
			for (w = 0; w < wheels.length; w++) {
				if (wheels[w].texts.length > 1) {
					s += String(wheels[w].texts[selections[w]]);
				}
			}
			s = s.replace(/[^0-9+-\.]/g, "");	// remove non-numeric characters
			s = s.replace(/[+-\.]*$/, "");		// remove any ".,+-" at end
			// parse the string it and set the element value
			value = validateFloat(s);
			if (!isNaN(value)) {
				elt.value = value;
			}
			gIO.inputPopup = false;			// enable popups
			handleChange(id);
			elt.blur();						// Lets you focus on this twice in row
		} else {
			// thumbwheel has been cancelled
			gIO.inputPopup = false;			// enable popups
			elt.blur();						// Lets you focus on this twice in row
		}
	}

	ndigits = fmt.replace(/[^\?]/g, "").length;			// total number of digits
	point = fmt.replace(/[^\?\.]/g, "").indexOf(".");	// location of decimal point
	if (point < 0) {
		point = ndigits;
	}
	point = ndigits - point;
	wfmt = fmt.split("|");
	// go through each wheel in the fmt string
	for (w = 0; w < wfmt.length; w++) {
		o = {};
		if (w == 0) {
			o.style = "right";
		} else if (w == wfmt.length - 1) {
			o.style = "left";
		} else {
			o.style = "center shrink";
		}
		// "+-" in the left wheel of the fmt indicates a separate wheel on the left with "+" and "-"
		if (w == 0 && wfmt[0] == "+-") {
			o.texts = ["+", "-&thinsp;"];
			o.selection = (dflt < 0? 1: 0);
			wheels.push(o);
			if (min < 0) {
				min = 0;
			}
			dflt = Math.abs(dflt);
			continue;
		}
		wdigits = wfmt[w].replace(/[^\?]/g, "").length;	// number of digits in wheel
		if (wdigits == 0) {
			// If there are no digits in the wheel's format
			// just add a wheel with a single entry set to this wheel's format string.
			o.texts = [wfmt[w]];
			o.selection = 0;
			wheels.push(o);
			continue;
		}
		// Enumerate all the values for this set of digits and build the wheel.
		o.texts = [];
		o.selection = 0;
		// Get the min and max for this set of digits.
		if (firstDigits) {
			nmin = getDigits(min, ndigits - point - 1, wdigits);
			if (min < 0) {
				nmin = -nmin;
			}
		} else {
			nmin = 0;
		}
		if (firstDigits) {
			nmax = getDigits(max, ndigits - point - 1, wdigits);
			if (max < 0) {
				nmax = -nmax;
			}
		} else {
			nmax = Math.pow(10, wdigits) - 1;
		}
		nincr = getDigits(incr, ndigits - point - 1, wdigits);
		if (nincr == 0) {
			nincr = 1;
		}
		if (incr < 0) {
			nincr = -nincr;
		}
		wdflt = getDigits(dflt, ndigits - point - 1, wdigits);
		if (firstDigits && dflt < 0) {
			wdflt = -wdflt;
		}
		for (n = nmin; n <= nmax; n += nincr) {
			d = wdigits - 1;

			s = wfmt[w];
			while (s.indexOf("?") >= 0) {
				s = s.replace(/\?/, String(getDigit(n, d)));
				d--;
			}
			if (firstDigits) {
				s = s.replace(/^[+-]*0*/, "");	// remove leading zeros and signs on first (leftmost) digits wheel
				s = s.replace(/^,0*/, "");		// remove leading "," followed by zeros
				s = s.replace(/^\./, "0.");		// put a zero back if there's a leading "."
				s = s.replace(/^,/, "");		// remove leading ","
				if (n < 0) {					// add a "-" to negative values on the leftmost wheel
					s = "-" + s;
				} else if (n > 0 && wfmt[w].charAt(0) == "+") {
					s = "+" + s;				// add a "+" to positive values on the leftmost wheel, if asked.
				}
				if (s.length == 0) {
					s = "0";
				}
			}
			o.texts.push(s);						// add this value to the wheel
			if (n == wdflt) {						// if these digits match the default...
				o.selection = o.texts.length - 1;	// set the selection
			}
		}
		ndigits -= wdigits;
		firstDigits = false;
		// Add this wheel
		wheels.push(o);
	}
	thumbWheel.open(wheels, done);		// display the thumbwheel
	gIO.inputPopup = true;				// disable more popups
}

/*
 * Compose a set of spinning wheel slots to enter wind speed.
 */
function twWind (id) {
	var elt = getElt(id);
	var t;
	var i;
	var wheels = [];
	var done = function (selections) {
		var wind, gust;

		if (selections) {
			wind = selections[0];
			gust = selections[1];
			if (gust == 0) {
				elt.value = wind;
			} else if (wind >= gust) {
				elt.value = inputDefault(id);	// wind >= gust is illegal
			} else {
				elt.value = String(wind)+"G"+String(gust);
			}
			handleChange(id);				// compute as required
		}
		gIO.inputPopup = false;			// enable popups
		elt.blur();						// Lets you focus on this twice in row
	};

	// wind speed wheel
	t = [];
	for (i = 0; i <= 49; i++) {
		t[i] = String(i);
	}
	wheels[0] = {texts: t};
	// wind gust slot
	t = ["--"];
	for (i = 1; i <= 49; i++) {
		t[i] = "G"+String(i);
	}
	wheels[1] = {texts: t};
	// units slot
	wheels[2] = {texts: ["kt."]};
	thumbWheel.open(wheels, done);		// display the thumbwheel
	gIO.inputPopup = true;				// disable more popups
}

/*
 * Compose a set of spinning wheel slots to enter wind direction.
 */
function twWindDir (id) {
	var elt = getElt(id);
	var t;
	var i;
	var wheels = [];
	var done = function (selections) {
		var dir1, dir2;

		if (selections) {
			dir1 = selections[0];
			dir2 = selections[1];
			if (dir1 == 0) {			// VRB
				elt.value = "VRB";
			} else if (dir2 == 0) {
				elt.value = wheels[0].texts[dir1];
			} else if (dir1 == dir2) {	// same heading is illegal
				elt.value = inputDefault(id);
			} else {
				elt.value = wheels[0].texts[dir1]+wheels[1].texts[dir2];
			}
			handleChange(id);			// compute as required
		}
		gIO.inputPopup = false;			// enable popups
		elt.blur();						// Lets you focus on this twice in row
	};

	// wind direction 1 wheel
	t = ["VRB"];
	for (i = 1; i <= 36; i++) {
		t[i] = fmtHeading(i * 10);
	}
	wheels[0] = {texts: t};
	// wind direction 2 wheel
	t = ["--"];
	for (i = 1; i <= 36; i++) {
		t[i] = "V"+fmtHeading(i * 10);
	}
	wheels[1] = {texts: t};
	thumbWheel.open(wheels, done);		// display the thumbwheel
	gIO.inputPopup = true;				// disable more popups
}

/*
 * Thumbwheel for option selector.
 * Replaces the foul IOS7 selector.
 */
function twSelect (id) {
	var elt = getElt(id);
	var wheels;
	var i;
	var done = function (selections) {
		var o;

		if (selections) {
			o = elt.options[selections[0]];
			elt.value = o.text;
			elt.selValue = o.value;
			handleChange(id);			// compute as required
		}
		gIO.inputPopup = false;			// enable popups
		elt.blur();						// Lets you focus on this twice in row
	};

	wheels = [{texts: [], style: "center", selection:  findOptionIndex(id, elt.selValue)}];
	// record all the options
	for (i = 0; i < elt.options.length; i++) {
		wheels[0].texts.push(elt.options[i].text);
	}
	thumbWheel.open(wheels, done);
	gIO.inputPopup = true;				// disable more popups
}