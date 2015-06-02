/*
 * This code should be common across most aircraft.
 * It provides some common utilities and page-specific functions.
 * Unlike util.js, it can provide UI elements and depends on the aircraft HTML.
 */

/*
 * Initial setup on page load.
 */
function setup (pageDesc, inputDesc, outputDesc) {
	if (gUI.style != "small") {
		setupScale(768);		// make sure the non-small devices are scaled to >=768px in all orientations
	}
	setupIO(inputDesc, outputDesc);		// setup internal IO element structures
	setupPages(pageDesc);				// setup internal page structures
	setupACData();

	setOutput("Version", VERSION);

	//Only browsers that support canvas and overflow:scroll
	if (getElt("WBCanvas").getContext == undefined || navigator.userAgent.match(/Android\s[1-3]\./)) {
		alert("This WebApp will not function properly with this browser. Please use Android 4+, Internet Explorer 9+, Firefox 3.6+, Safari 5+, or Chrome 10+");
	}
	showClass("WebApp", !gDev.phoneGap);
	showElt("ConsoleDiv", gConsole, "block");	// Make the console visible in debug mode
	// Setup visibility and some attributes for small vs other devices
	if (gUI.style == "small") {
		showElt("Header", true);			// show the header bar
		// change the text of these buttons to fit better on small devices
		getElt("addACButton").innerHTML = "+";
		getElt("delACButton").innerHTML = "-";
		getElt("addTripButton").innerHTML = "+";
		getElt("delTripButton").innerHTML = "-";
		// vernier slider doesn't work on small devices
		if (gDev.portWidth < 580) {
			removeOption("SetNumInputStyle", "vSlider");
		}
	} else {
		showElt("Header", false);			// hide the header bar
		// Mobile Safari sometimes makes the tabs disappear
		getElt("HomeIndex").style.display = "block";
		getElt("HomeIndex").style.visibility = "visible";
	}
	// Setup default ACData
	gIO.elts["ACModel"].value = inputDefault("ACModel");
	setACModel();
	// Restore any saved input.
	// This will also initialize the output fields by computing corresponding results.
	restoreInput();
	// The iPhone buttons are difficult to render in IE, so we use an alternate style.
	// Check for new version. Only compare major.minor as the remainder introduces no new features.
	// Display any new version intro text.
	if (versionCompare(VERSION, getStorage(gAppID + "Version"), 1) != 0) {
		if (gversionText != "") {
			notice(gversionText);	// display new version information
		}
		setStorage(gAppID + "Version", VERSION);
	}
	// If the user has previously accepted the current version of the TOU and has
	// certified that this is an single user machine then accept the TOU.
	// This will go to the correct initialy page. Otherwise go the the terms of use.
	if (checkTOU()) {
		acceptTOU();
	} else {
		selectPage("TOU");
	}
	/* not working
	// hide the splash screen once the rest of phoneGap loads.
	if (gDev.phoneGap) {
		document.addEventListener(
			"deviceready",
			function () {
				assert(navigator.splashscreen, "setup: no splashscreen function");
				setTimeout(navigator.splashscreen.hide, 100);
			},
			false
		);
	}
	*/
}

/*
 * Make sure that the device is scaled so that it is at least minWidth px in width
 * in any orientation. This is done by setting the zoom appropriately.
 * Right now, we only need this on Android, which supports zoom.
 * Plan B is to use transforms with scale and transform-origin.
 */
function setupScale (minWidth) {
	var fixScale = function () {
		var vpWidth = Math.max(document.documentElement.clientWidth, window.innerWidth);

		if (vpWidth < minWidth) {
			document.body.style.zoom = vpWidth / minWidth;
		} else {
			document.body.style.zoom = 1;
		}
	};

	if (gUI.style == "small" || gDev.platform == "iPad" || gDev.platform == "iPhone" || gDev.platform == "desktop") {
		return;		// these platforms don't need this.
	}
	if (gDev.portWidth >= minWidth) {
		return;		// device is greater than minWidth even in portrait.
	}
	assert("zoom" in document.body.style,
		"Device does not support zoom. Please send report to info@pohperformance.com");
	fixScale();								// fix the current scale.
	window.addEventListener("orientationchange", fixscale, false);
}

/****
 * User notice/confirm functions
 ****/

/*
 * notice() is similar to alert() except it styled by the app.
 * It can't block like alert(), so an optional function can be called when done.
 * It can also embed HTML in the text for formatting.
 * Since notice doesn't block, another notice can be sent while the first one is pending
 * acknowledgment. We keep this on a FIFO list
 */

var dialog = {
	/*
	 * A notice message dialog with an "OK" button.
	 * Message text may contain html.
	 * func() is optional and is called when user acknowledges the dialog.
	 */
	notice: function (text, func) {
		this.choose(
			text,
			["OK"],
			function (sel) {
				if (func) {
					func();
				}
			}
		);
	},
	/*
	 * A confirmation message dialog with an "OK" and "Cancel" button.
	 * Message text may contain html.
	 * func() is required and is called when user presses one of the buttons.
	 * The argument to func() is true if OK is pressed, false otherwise.
	 */
	confirm: function (text, func) {
		this.choose(
			text,
			["OK", "Cancel"],
			function (sel) {
				if (func) {
					func(sel == 0);
				}
			}
		);
	},
	/*
	 * A choice message dialog with several buttons.
	 * The button labels are in the "choices" array.
	 * Message text may contain html.
	 * func() is required and is called when user presses one of the buttons.
	 * The argument to func() is the index of the choice.
	 */
	choose: function (text, choices, func) {
		if (this._stack.length > 0 && this._stack[this._stack.length - 1].text == text) {
			return;
		}
		this._stack.push({text: text, choices: choices, func: func});
		if (this._stack.length == 1) {
			this._createDialog(text, choices, func);
		}
	},
	/*
	 * private variables and methods.
	 */
	_stack: [],			// stack of dialogs
	_dialog: null,		// current dialog element

	/*
	 * Create the current dialog.
	 */
	_createDialog: function (text, choices, func) {
		var html, i;
		var dlog;

		assert(this._dialog == null, "dialog._createDialog: _dialog not null");
		dlog = this._dialog = document.createElement('div');
		dlog.id = 'dialog-wrapper';
		// set up the slide in/out transition
		html = '<div id="dialog-text">'+text+'</div><table><tr>';
		for (i = 0; i < choices.length; i++) {
			html += '\
				<td style="width:'+round(100/choices.length)+'%">\
					<button type="button" class="dialog-button" onclick="dialog._done('+i+')">'+String(choices[i])+'</button>\
				</td>'
			;
		}
		html += '</tr></table>';
		dlog.innerHTML = html;
		dlog.style.visibility = 'hidden';
		document.body.appendChild(dlog);	// add the key pad to the document
		window.addEventListener("resize", this, false);
		window.addEventListener("orientationchange", this, false);

		dlog.style.top = '0px';
		dlog.style.left = '0px';
		this._setPosition();
		// the dialog grows from a small size or larger as it appears
		// this helps differentiate messages. First, start with a small size
		dlog.className = "smallDialog";
		dlog.style.visibility = 'visible';
		// grow to a larger size. Need to do this after first transform has rendered
		setTimeout(function () {dlog.className = "largeDialog";}, 0);
	},
	/*
	 * Destroy the current dialog.
	 */
	_destroyDialog: function () {
		window.removeEventListener("resize", this, false);
		window.removeEventListener("orientationchange", this, false);
		document.body.removeChild(this._dialog);
		this._dialog = null;
	},
	/*
	 * Event handler for resize and orientation change.
	 */
	handleEvent: function (e) {
		var transitionEnd = getPrefixEvent("transtionend");

		assert(e.type == 'resize' || e.type == 'orientationchange',
			"dialog.handleEvent: bad event type: "+e.type);
		this._setPosition();
		return (false);
	},
	/*
	 * Set the current dialog's position.
	 */
	_setPosition: function () {
		assert(this._dialog, "dialog._setPosition: no dialog");
		this._dialog.style.top = '0px';
		this._dialog.style.left = '0px';
		getElt("dialog-text").style.maxHeight = String(window.innerHeight * .6)+"px";
		centerElt('dialog-wrapper');
	},
	/*
	 * Called by dialog buttons.
	 */
	_done: function (choice) {
		var cur, next;

		this._destroyDialog();
		cur = this._stack.shift();
		if (this._stack.length > 0) {
			next = this._stack[0];	// display text of oldest dialog on list
			this._createDialog(next.text, next.choices, next.func);
		}
		if (cur.func) {
			cur.func(choice);
		}
	}
};

/*
 * Helper to shorten call.
 */
function notice (text, func) {
	dialog.notice(text, func);
}

/*
 * Set the innerHTML of all the pageInputHeading elements to str.
 */
function setInputHeading (str, color) {
	var elts, i;

	elts = document.getElementsByClassName("pageInputHeading");
	for (i = 0; i < elts.length; i++) {
		elts[i].innerHTML = str;
		if (color) {
			elts[i].style.color = color;
		} else {
			elts[i].style.color = "darkblue";
		}
	}
}

/****
 * Airport and runway data functions.
 ****/

/*
 * Get runway data.
 * gRunwayData is an object indexed by airport ID  of runway decription strings.
 * Each string is a set of comma separated values as follows:
 *   Arpt ID, Elevation, Magnetic variance, Length, Base ID,
 *   Base displacement, Reciprocal displacement, Base slope %
 */
function getRunwayData (arptID) {
	var rdata = [];
	var rwy, rwys;
	var i;

	arptID = arptID.toUpperCase();
	arptID = arptID.replace(/ /g, "");		// Remove blanks
	if (arptID.length == 0) {
		return (null);
	}
	// Check that the airport is in the database.
	rwys = gRunwayData[arptID];
	if (rwys == undefined) {
		// It's not good if arpt not in rwy DB but *is* in arpt DB
		assert(gAirportData[arptID] == undefined, "Airport not in runway DB: "+arptID);
		return (null);
	}
	assert(rwys.length >= 1, "Bad runway DB entry: "+arptID);
	// Extract the data from each runway.
	// Convert each runway into separate bace and reciprocal runways.
	for (i = 0; i < rwys.length; i++) {
		var base = {};
		var recip = {};

		rwy = rwys[i];
		// Get data common to both base and reciprocal runways.
		base.rwyLength = recip.rwyLength = rwy[RWY_LEN];
		// Push the base runway data into rdata.
		base.rwyID = rwy[RWY_BASE_ID];
		base.dispThresh = rwy[RWY_BASE_DISP_THRESH];
		base.slope = rwy[RWY_SLOPE];
		rdata.push(base);
		// Push the reciprocal runway data into rdata.
		recip.rwyID = runwayRecip(base.rwyID);
		recip.dispThresh = rwy[RWY_RECIP_DISP_THRESH];
		recip.slope = -base.slope;
		rdata.push(recip);
	}
	return (rdata);				// return the array of runways.
}

/*
 * Set up the dropdown lists for runways from a given array of runway identifiers.
 * If the the array is null, use the default list. Also, setup the selected runway.
 */
function setRunwayOptions (id, rwys) {
	var i;

	clearOptions(id);
	if (rwys) {
		addOption(id, "Best");
		for (i = 0; i < rwys.length; i++) {
			addOption(id, rwys[i]);
		}
		setupInput(id, "Best");
	} else {
		for (i = 1; i <= 36; i++) {
			addOption(id, i);
		}
		setupInput(id, 1);
	}
}

/*
 * Fix up airport names.
 * Remove white space, convert to upper case.
 * If the result has 3 letters and doesn't correspond to an airport in the database,
 * then add a "K" to the front if that's in the database.
 */
function checkAirportName (prefix) {
	var arptID = getIO(prefix+"Arpt");

	arptID = arptID.replace(/\s/g, "");		// Remove blanks
	arptID = arptID.toUpperCase();
	// add a "K" is the result is in the database.
	if (arptID.length == 3 && !gAirportData[arptID] && gAirportData["K"+arptID]) {
		arptID = "K"+arptID;
	}
	// change the input
	setupInput(prefix+"Arpt", arptID);
}

/*
 * Setup input fields from the airport data. The page is indicated by the prefix.
 * Also setup output fields
 */
function setAirportIO (prefix, init) {
	var arptID;
	var magVar
	var rdata;
	var i;
	var rwyIDs;
	var statVar = setAirportIO;		// use fn obj for static variables
	var sortRunwayByID = function (a, b) {
		// Sorts runway IDs. First sort the first two numeric digits.
		// If those are equal then compare the [LCR] letter at the end,
		// in that order. Assumes that the list won't contain values with
		// matching first two digits without an [LCR} at the end.
		var c = parseInt(a.substr(0, 2), 10) - parseInt(b.substr(0, 2), 10);
		if (c == 0) {
			assert(a.length == 3 && b.length == 3, "sortRunwayData");
			c = (a[3] == "L"? 0: (a[3] == "C"? 1: 2))
				- (b[3] == "L"? 0: (b[3] == "C"? 1: 2));
		}
		return (c);
	};

	arptID = getIO(prefix+"Arpt");
	// Setup input fields and save airport data if airport has changed.
	if (arptID !== statVar[prefix+"arptID"] || init) {
		statVar[prefix+"arptID"] = arptID;
		rdata = getRunwayData(arptID);
		if (rdata) {
			assert(rdata.length > 0, "setAirportIO: runway data error");
			// find runway IDs.
			rwyIDs = [];
			for (i = 0; i < rdata.length; i++) {
				rwyIDs.push(rdata[i].rwyID);
			}
			rwyIDs.sort(sortRunwayByID);
			// setup rwy selector and save runways text
			setRunwayOptions(prefix + "Rwy", rwyIDs);
			statVar[prefix+"rwys"] = rwyIDs.join(",&thinsp;");	// space to allow line break
			// save airport data
			assert(arptID in gAirportData, "setAirportIO: no airport data for: "+arptID);
			statVar[prefix+"arptData"] = gAirportData[arptID];
			// setup altitude
			setupInput(prefix+"Alt", statVar[prefix+"arptData"][ARPT_ELEV]);
		} else {
			if (arptID.length > 0) {
				notice("No airport data for: "+arptID);
			}
			statVar[prefix+"arptData"] = null;
			statVar[prefix+"rwys"] = "";
			// setup default inputs for runway data when airport changes
			setRunwayOptions(prefix + "Rwy", null);
			setupInput(prefix+"RwyLength_ft", inputDefault(prefix+"RwyLength_ft"));
			if (document.getElementById(prefix+"Slope")) {	// Slope doesn't always exist
				setupInput(prefix+"Slope", inputDefault(prefix+"Slope"));
			}
			// setup default inputs for airport elevation when airport changes
			setupInput(prefix+"Alt", inputDefault(prefix+"Alt"));
		}
	}
	// Setup airport output elements
	if (statVar[prefix+"arptData"]) {
		magVar = String(Math.abs(statVar[prefix+"arptData"][ARPT_VAR]));
		if (statVar[prefix+"arptData"][ARPT_VAR] > 0) {
			magVar += "W";
		} else if (statVar[prefix+"arptData"][ARPT_VAR] < 0) {
			magVar += "E";
		}
	} else {
		magVar = "";
	}
	setOutput(prefix+"MagVar", magVar);
	showRow(prefix+"MagVar", !!arptID);
	setOutput(prefix+"RunwaysText", statVar.rwys);
	showRow(prefix+"RunwaysText", !!statVar.rwys);
}

/*
 * Get the distance between two airports.
 * Uses airport location database in gAirportLocation.
 */
function getDistance (airport1, airport2) {
	var arpt1, arpt2;
	var dist;

	// Find the airport data for each waypoint.
	arpt1 = gAirportData[airport1];
	arpt2 = gAirportData[airport2];
	if (arpt1 && arpt2) {
		dist = GCDistance(arpt1[ARPT_LAT], arpt1[ARPT_LONG], arpt2[ARPT_LAT], arpt2[ARPT_LONG]);
		return (roundUp(dist));	// round up to nearest nm
	} else {
		return (NaN);
	}
}

/*
 * Set the fields that contain the distance between the current airports
 */
function setAirportDistance (id, arptID1, arptID2) {
	var airport1 = getIO(arptID1);
	var airport2 = getIO(arptID2);
	var dist = 0;

	if (airport1 != "" && airport2 != "") {
		dist = round(getDistance(airport1, airport2));
	}
	setOutput(id, (dist > 0? dist: INVALID_NULL));
}

/*
 * Find of airports within maxDist (in nm) of a given airport ID.
 * Returns an array of airport IDs sorted in order of distance.
 */
function findNearbyAirports (arptID, maxDist) {
	var airports = [];
	var id;

	if (!arptID || !gAirportData[arptID]) {
		return (airports);
	}
	for (id in gAirportData) {
		if (!gAirportData.hasOwnProperty(id)) {continue;} // Skip inherited properties
		dist = getDistance(arptID, id);
		if (id != arptID && dist <= maxDist) {
			airports.push({id: id, dist: dist});	// add an airport descriptor with distance
		}
	}
	// sort by distance
	airports.sort(function (a, b) {return (a.dist - b.dist);});
	// convert elements to only IDs in distance order
	airports.forEach(function (e, i, a) { a[i] = e.id; });
	return (airports);
}


/*
 * Use this function to sort runways from "best" to "worst".
 * The "best" runway criteria, in order, are "safe", smallest roll, then longest length.
 * KPGA - test case
 */
function sortBestRunway (a, b) {
	var v = 0;
	// if one rwy is safe and the other isn't, sort the safe one first;
	if (a.safe && !b.safe) {
		return (-1)
	}
	if (b.safe && !a.safe) {
		return (1);
	}
	// if both rwys are safe, sort the shortest roll (includes slope) first
	if (a.safe && b.safe) {
		v = a.roll - b.roll;
	}
	// if both are not safe or they have equal rolls, sort the longest remaining runway first
	if (v == 0) {
		v = (b.rwyLength - b.roll) - (a.rwyLength - a.roll);
	}
	return (v);
}

/****
 * Metar functions
 ****/

function startMetarPoll (prefix) {
	startMetarPoll.interval =
		setInterval(
			function () {
				setMetarAge("Dep");
				setMetarAge("Dest");
			},
			60 * 1000
		)
	;
}

function stopMetarPoll (prefix) {
	clearInterval(startMetarPoll.interval);
}

/*
 * Get Metar text for a station.
 * We use the NOAA source that breaks up station metars into separate text files
 * accessed through a proxy due to security restrictions.
 */
function getMetar (prefix) {
	var url = gAjaxURL + "metar.php";
	var arpt = getIO(prefix+"Arpt");
	var airports = findNearbyAirports(arpt, 20);
	var handleResult = function (text, code, req) {
		if (code == "success" && text.indexOf(arpt) >= 0) {
			getElt(prefix+"Sync").style.webkitAnimation = "";
			logEventTime("setMetarText end: success");
			setInput(prefix+"MetarText", text.substr(text.indexOf(arpt)));
			if (arpt != getIO(prefix+"Arpt")) {
				setOutput(prefix+"MetarError",
					arpt+" is "+getDistance(getIO(prefix+"Arpt"), arpt)+" nm"
					+" from "+getIO(prefix+"Arpt")
				);
				showRow(prefix+"MetarError", true);
			}
			setMetarAge(prefix);
		} else {
			arpt = airports.shift();
			if (arpt) {
				logEventTime("setMetarText continue: "+arpt);
				ajax.call(
					gAjaxURL+"metar.php",
					"station="+arpt,	// HTTP GET args
					handleResult,
					20 * 1000			// timeout in msec
				);
			} else {
				getElt(prefix+"Sync").style.webkitAnimation = "";
				logEventTime("setMetarText end: failure");
				notice("Cannot retrieve METAR for "+arpt+"."
					+(prefix == "Dep"? " Departure": " Destination")+" is set to default conditions.");
			}
		}
	};

	setInput(prefix+"MetarText", "");
	showRow(prefix+"MetarText", !!arpt && gAirportData[arpt]);
	showRow(prefix+"MetarError", false);
	setMetarAge(prefix);
	if (!arpt || !gAirportData[arpt]) {
		return;
	}
	logEventTime("setMetarText start: "+arpt);
	getElt(prefix+"Sync").style.webkitAnimation = "spin 1s infinite linear";
	ajax.call(
		gAjaxURL+"metar.php",
		"station="+arpt,	// HTTP GET args
		handleResult,
		20 * 1000			// timeout in msec
	);
}


/*
 * Setup input fields from the metar. The page is indicated by the prefix.
 * Set force to true, to force a Metar fetch. Otherwise, use the last metar.
 */
function setMetarIO (prefix) {
	var now = new Date();
	var arpt = getIO(prefix+"Arpt");
	var metar = getIO(prefix+"MetarText");
	var wdir, wdir2;
	var wspeed, wgust;
	var magvar, OAT;
	var error = [];
	var m;

	if (!metar) {
		// set input to default
		setupInput(prefix+"Wind", inputDefault(prefix+"Wind"));
		setupInput(prefix+"WindDir", inputDefault(prefix+"WindDir"));
		setupInput(prefix+"Altimeter_inhg", inputDefault(prefix+"Altimeter_inhg"));
		setupInput(prefix+"OAT", inputDefault(prefix+"OAT"));
		computePage(prefix);
		return;
	}
	// Get the magnetic variation for the airport.
	if (arpt in gAirportData) {
		magvar = gAirportData[arpt][ARPT_VAR];
		// round to nearest 10 deg, away from zero
		magvar = roundMult(Math.abs(magvar), 10) * (magvar < 0? -1: 1);
	} else {
		magvar = NaN;
	}
	// Extract the wind speed & gust from the METAR text.
	m = metar.match(/\b(?:\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?KT/);
	if (m != null) {
		wspeed = parseInt(m[1], 10);
		if (m[2]) {
			wgust = parseInt(m[2], 10);
			if (wgust > wspeed) {
				setupInput(prefix+"Wind", m[1]+"G"+m[2]);
			} else {
				setupInput(prefix+"Wind", inputDefault(prefix+"Wind"));
				error.push("wind speed");
			}
		} else {
			wgust = wspeed;
			setupInput(prefix+"Wind", m[1]);
		}
	} else {
		wgust = wspeed = 0;
		setupInput(prefix+"Wind", inputDefault(prefix+"Wind"));
		error.push("wind speed");
	}
	// Extract the wind direction from the METAR text.
	m = metar.match(/\b(\d{3}|VRB)\d{2,3}(?:G\d{2,3})?KT(?:\s+(\d{3})V(\d{3}))?/);
	if (m != null) {
		if (wspeed == 0 && wgust == 0) {
			setupInput(prefix+"WindDir", "360");
		} else if (m[3] != undefined) {
			wdir = parseInt(m[2], 10);
			wdir2 = parseInt(m[3], 10);
			if (wdir > 0 && wdir <= 360 && wdir2 > 0 && wdir2 <= 360) {
				// adjust for magnetic north
				wdir = (isNaN(magvar)? wdir: adjust360(wdir + magvar));
				wdir2 = (isNaN(magvar)? wdir2: adjust360(wdir2 + magvar));
				setupInput(prefix+"WindDir", fmtHeading(wdir)+"V"+fmtHeading(wdir2));
			} else {
				setupInput(prefix+"WindDir", inputDefault(prefix+"WindDir"));
				error.push("wind direction");
			}
		} else {
			if (m[1] == "VRB") {
				setupInput(prefix+"WindDir", m[1]);
			} else {
				wdir = parseInt(m[1], 10);
				if (wdir > 0 && wdir <= 360) {
					wdir = (isNaN(magvar)? wdir: adjust360(wdir + magvar));		// adjust for magnetic north
					setupInput(prefix+"WindDir", fmtHeading(wdir));
				} else {
					setupInput(prefix+"WindDir", inputDefault(prefix+"WindDir"));
					error.push("wind direction");
				}
			}
		}
	}
	// Extract the altimeter setting from the METAR text.
	m = metar.match(/\bA([2-3]\d)(\d{2})/);			// try in. Hg
	if (m != null) {
		setupInput(prefix+"Altimeter_inhg", m[1]+"."+m[2]);
	} else {
		m = metar.match(/\bQ(\d{4})/);				// try hPa
		if (m != null) {
			setupInput(prefix+"Altimeter_hpa", m[1]);
		} else {
			setupInput(prefix+"Altimeter_inhg", inputDefault(prefix+"Altimeter_inhg"));
			error.push("altimeter");
		}
	}
	// Extract the temperature from the METAR text.
	m = metar.match(/\b(M)?(\d{2})\/(?:M?\d{2})?/);
	if (m != null) {
		OAT = parseInt((m[1] == "M"? "-": "+")+m[2], 10);
		if (!isNaN(OAT)) {
			setupInput(prefix+"OAT", OAT);
		} else {
			setupInput(prefix+"OAT", inputDefault(prefix+"OAT"));
			error.push("OAT");
		}
	}
	computePage(prefix);
	// If there were errors, send error notice
	if (isNaN(magvar)) {
		notice("Unknown magnetic variation for "+arpt+". Please adjust wind direction(s)");
	} else if (error.length > 0) {
		notice("Unable to set "+error.join(", ")+" from METAR");
	}
}

/*
 * Set the Metar age in the page.
 */
function setMetarAge (prefix) {
	var now = new Date();
	var metar = getIO(prefix+"MetarText");
	var age;
	var m, mtime, year, month, day;

	if (!metar) {
		setOutput(prefix+"MetarAge", INVALID_NULL);
		showRow(prefix+"MetarAge", false);
		return;
	}
	// Extract the UTC date, compute age, then set output field.
	m = metar.match(/\b(\d{2})(\d{2})(\d{2})Z/);
	if (m != null) {
		mtime = new Date();
		day = parseInt(m[1]);
		month = now.getUTCMonth();
		year = now.getUTCFullYear();
		// If the Metar day of month is greater than the current day of month, then
		// the metar is from last month (e.g. it's after midnight and the metar is from before midnight)
		if (day > now.getUTCDate()) {
			if (month == 0) {		// now is January
				year -= 1;			// Metar is in last December
				month = 11;
			} else {
				month -= 1;			// Metar is last month
			}
		}
		mtime.setUTCFullYear(year, month, day);
		mtime.setUTCHours(parseInt(m[2]), parseInt(m[3]));
		age = (now.getTime() - mtime.getTime()) / (60 * 1000);
		setOutput(prefix+"MetarAge", fmtTime(age), (age >= 60? {color:"red"}: {color:"black"}));
	} else {
		setOutput(prefix+"MetarAge", "Unknown age", {color:"red"});
	}
	showRow(prefix+"MetarAge", true);
}

/****
 * Wind functions
 ****/

/*
 * Wind object constructor.
 * Must call with "new" operator.
 */
function Wind (dirSpec, speedSpec) {
	// Private variables
	// Object initialization
	if (dirSpec != undefined) {
		this.setWindDir(dirSpec);
	}
	if (speedSpec != undefined) {
		this.setWindSpeed(speedSpec);
	}
}
// Static elements
Wind.speedRE = /^(\d{1,3})(?:G(\d{1,3}))?/i;
Wind.dirRE = /^(\d{1,3})(?:V(\d{1,3}))?|^(VRB)/i;
// Static methods
/*
 * Validate a wind speed spec. e.g. "10G15".
 */
Wind.isValidSpeed = function (spec) {
	var m = String(spec).match(Wind.speedRE);
	var min, max;

	if (!m) {
		return (false);
	}
	min = parseInt(m[1], 10);
	if (min > 99) {
		return (false);
	}
	if (m[2] != undefined) {
		max = parseInt(m[2], 10);
		if (max > 99 || min >= max) {
			return (false);
		}
	}
	return (true);
};
/*
 * Validate a wind direction spec. e.g. "240V270".
 */
Wind.isValidDir = function (spec) {
	var m = String(spec).match(Wind.dirRE);
	var w1, w2;

	if (!m) {
		return (false);
	}
	if (m[0] == "VRB") {
		return (true);
	}
	w1 = parseInt(m[1], 10);
	if (w1 == 0 || w1 > 360 || w1 % 10 != 0) {
		return (false);
	}
	if (m[2] != undefined) {
		w2 = parseInt(m[2], 10);
		if (w2 == 0 || w2 > 360 || w2 % 10 != 0 || w1 == w2) {
			return (false);
		}
	}
	return (true);
};
// Public object methods
/*
 * Set the wind speed from a wind speed spec string (e.g. 5G10).
 */
Wind.prototype.setWindSpeed = function (spec) {
	var m = String(spec).match(Wind.speedRE);

	if (m) {
		this.min = parseInt(m[1], 10);
		if (m[2] != undefined) {
			this.max = Math.max(this.min, parseInt(m[2], 10));
		} else {
			this.max = this.min;
		}
	} else {
		this.min = this.max = INVALID;
	}
};
/*
 * Get a wind speed spec string.
 */
Wind.prototype.getWindSpeed = function () {
	if (!isValid(this.min) || !isValid(this.max)) {
		return ("-");
	} else if (this.min == this.max) {
		return (String(this.min));
	} else {
		return (String(this.min)+"G"+String(this.max));
	}
};
/*
 * Set the wind direction from a wind spec string (e.g. 240V270).
 */
Wind.prototype.setWindDir = function (spec) {
	var m = String(spec).match(Wind.dirRE);

	if (m) {
		if (m[3] == "VRB") {
			this.dir = this.dir2 = "VRB";
		} else {
			this.dir = parseInt(m[1], 10);
			if (m[2] != undefined) {
				this.dir2 = parseInt(m[2], 10);
			} else {
				this.dir2 = this.dir;
			}
		}
	} else {
		this.dir1 = this.dir2 = INVALID;
	}
};
/*
 * Get a wind direction spec string.
 */
Wind.prototype.getWindDir = function () {
	if (!isValid(this.dir, this.dir2)) {
		return ("-");
	} else if (this.dir == this.dir2) {
		return (toHeadingString(this.dir));
	} else {
		return (toHeadingString(this.dir)+"V"+toHeadingString(this.dir2));
	}
};
/*
 * Compute the crosswind component for this runway.
 * Always uses the largest speed (wind or gust).
 */
Wind.prototype.rwyCrosswind = function (runwayID) {
	var rdir = runwayDir(runwayID);
	var w, w2;

	if (!isValid(this.dir, this.dir2, this.min, this.max)) {
		return (INVALID);
	}
	if (this.dir == "VRB") {
		return (this.max);
	}
	w = crosswind(angleDiff(rdir, this.dir), this.max);
	if (this.dir != this.dir2) {
		// if 90 degrees off the runway is within the wind variation, return the gust.
		if (isAngleIn(adjust360(rdir + 90), this.dir, this.dir2)) {
			return (this.max);
		}
		if (isAngleIn(adjust360(rdir - 90), this.dir, this.dir2)) {
			return (-this.max);
		}
		// if dir2 results in a bigger crosswind, return that.
		w2 = crosswind(angleDiff(rdir, this.dir2), this.max)
		if (Math.abs(w2) > Math.abs(w)) {
			return (round(w2));
		}
	}
	return (round(w));
};
/*
 * Compute the headwind component for this runway
 * If the wind is within 90 of the runway, use the minimum wind. Otherwise use the max (gust).
 */
Wind.prototype.rwyHeadwind = function (runwayID) {
	var rdir = runwayDir(runwayID);
	var a;
	var w;

	if (!isValid(this.dir, this.dir2, this.min, this.max)) {
		return (INVALID);
	}
	if (this.dir == "VRB") {
		return (-this.max);			// worst tailwind
	}
	a = angleDiff(rdir, this.dir);
	w = headwind(a, Math.abs(a) < 90? this.min: this.max);
	if (this.dir != this.dir2) {
		// if 180 degrees off the runway is within the wind variation, return the gust as a tailwind.
		if (isAngleIn(adjust360(rdir + 180), this.dir, this.dir2)) {
			return (-this.max);
		}
		// choose the angle limit with the least headwind
		a = angleDiff(rdir, this.dir2);
		w = Math.min(w, headwind(a, Math.abs(a) < 90? this.min: this.max));
	}
	return (round(w));
};
/*
 * Compute the gust difference of the headwind component for this runway
 */
Wind.prototype.rwyHeadwindGust = function (runwayID) {
	var rdir = runwayDir(runwayID);
	var w = this.max - this.min;
	var a;

	if (!isValid(this.dir, this.dir2, this.min, this.max)) {
		return (INVALID);
	}
	if (this.dir == "VRB" || w == 0) {
		return (w);		// return the gust difference
	}
	a = Math.abs(angleDiff(rdir, this.dir));
	w = headwind(a, this.max - this.min);
	if (this.dir != this.dir2) {
		// if the runway or reciprocal is within the wind variation, return the gust difference.
		if (isAngleIn(adjust360(rdir + 180), this.dir, this.dir2)
			|| isAngleIn(adjust360(rdir - 180), this.dir, this.dir2)
		) {
			return (this.max - this.min);
		}
		// choose the angle limit with the greatest gust difference
		a = Math.abs(angleDiff(rdir, this.dir2));
		w = Math.max(w, headwind(a, this.max - this.min));
	}
	return (w);
};
/*
 * Draw the takeoff/landing wind diagram.
 * Draw runway roll and safety zones if runway length is provided.
 */
function drawRunwayWind (canvasID, runwayID, wind, runwayLen, roll, safeRunway, info) {
	var canvas = getElt(canvasID);				// WB canvas
	var ctx;
	var rwyXWind = wind && runwayID && wind.rwyCrosswind(runwayID);
	var rwyHWind = wind && runwayID && wind.rwyHeadwind(runwayID);
	var labelPad = 2;
	var pad = 6;
	var dashSize = 18;
	var arrowLen = 25;
	var rwyWidth = 30;
	var rwyX = .65;
	var x, y, i, d;
	var a;
	var scale;
	var scaleRunway = function (y) {
		var start = pad;
		var len = canvas.height - (2 * pad);

		if (safeRunway >= runwayLen) {
			return (round(start + len * (1 - y / safeRunway)));
		} else {
			return (round(start + len * (1 - y / runwayLen)));
		}
	};
	var drawWindVector = function (dir, vTab) {
		var a = angleDiff(runwayDir(runwayID), dir);

		ctx.save();
		ctx.lineWidth = 3;
		ctx.strokeStyle = "deepskyblue";
		if (a >= 0 && a <= 90) {
			ctx.translate(13 + arrowLen/3 + labelPad, -scale * gAircraftIcon.height/2);
		} else if (a > 90 && a <= 180) {
			ctx.translate(13 + arrowLen/3 + labelPad, scale * gAircraftIcon.height/2);
		} else if (a < 0 && a >= -90) {
			ctx.translate(-13 - arrowLen/3 - labelPad, -scale * gAircraftIcon.height/2);
		} else {
			ctx.translate(-13 - arrowLen/3 - labelPad, scale * gAircraftIcon.height/2);
		}
		ctx.rotate(Math.PI * a / 180);	// rotate to make windDir at the top
		drawArrow(ctx, 0, -arrowLen, Math.PI/2, arrowLen, arrowLen/3 + 3);
		if (vTab) {
			ctx.moveTo(0, -arrowLen);
			ctx.lineTo((vTab == "left"? -1: 1) * arrowLen/4, -arrowLen);
			ctx.stroke();
		}
		ctx.restore();
	};

	// Get the drawing context, if supported and clear the canvas.
	if (canvas.getContext == undefined) {
		//canvas.innerHTML = "Please use a browser that supports HTML5 (IE9, Safari, Firefox, Chrome)";
		return;
	}
	ctx = canvas.getContext("2d");
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	// Fix for Android clearRect bug
	if (gDev.platform == "Android" && gDev.phoneGap) {
		var tmp = canvas.width;
		canvas.width = 1;
		canvas.width = tmp;
	}
	ctx.font = "bold 10pt sans-serif";

	ctx.save();
	// Draw the runway
	x = round(rwyX * canvas.width);
	if (runwayLen == 0) {	// if no runway info, don't draw the zones and set the runway length to something reasonable.
		safeRunway = 0;
		roll = 0;
		runwayLen = 1000;
	}
	ctx.fillStyle = "grey";
	ctx.lineWidth = 2;
	y = scaleRunway(runwayLen);
	ctx.fillRect(x - roundDown(rwyWidth/2), y, rwyWidth, scaleRunway(0) - y);
	// Draw the center line. Stop before the runway ID.
	ctx.beginPath();
	ctx.strokeStyle = "white";
	ctx.moveTo(x, y);
	for (i = (scaleRunway(0) - 22 - y) / dashSize; i >= 1; i--) {
		ctx.moveTo(x, y + dashSize/2);
		y += dashSize;
		ctx.lineTo(x, y);
	}
	ctx.stroke();
	// Highlight the takeoff roll in green (red if runway is too short).
	if (isValid(roll) && roll > 0) {
		y = scaleRunway(roll);
		ctx.fillStyle = (roll < runwayLen? "rgba(0, 255, 0, .3)": "rgba(255, 0, 0, .3)");
		ctx.fillRect(x - roundDown(rwyWidth/2), y, rwyWidth, scaleRunway(0) - y);
	}
	// Highlight the safety zone in yellow (red if runway is too short).
	if (isValid(safeRunway) && safeRunway > roll) {
		y = scaleRunway(safeRunway);
		ctx.fillStyle = (runwayLen >= safeRunway? "rgba(255, 255, 0, .3)": "rgba(255, 0, 0, .3)");
		ctx.fillRect(x - roundDown(rwyWidth/2), y, rwyWidth, scaleRunway(roll) - y);
	}
	// Place the runway ID.
	if (runwayID) {
		ctx.fillStyle = "white";
		y = scaleRunway(0) - labelPad;
		ctx.textBaseline = "bottom";
		ctx.textAlign = "center";
		ctx.font = "bold 15px sans-serif";
		ctx.fillText(runwayID, x, y);
	}
	ctx.restore();
	// Place the aircraft top view image.
	ctx.save();
	scale = .2 * canvas.height / gAircraftIcon.height;
	x = round(rwyX * canvas.width);
	y = scaleRunway(0) - Math.max(22, arrowLen) - scale * gAircraftIcon.height/2;
	ctx.translate(x, y);
	ctx.drawImage(gAircraftIcon, -scale * gAircraftIcon.width/2, -scale * gAircraftIcon.height/2,
		gAircraftIcon.width * scale, gAircraftIcon.height * scale
	);
	if (wind && isValid(rwyHWind, rwyHWind)) {
		// Draw the wind vector. Uses same context a aircraft image.
		if (wind.dir != "VRB" && (rwyHWind != 0 || rwyXWind != 0 )) {
			if (wind.dir == wind.dir2) {
				drawWindVector(wind.dir);
			} else {
				drawWindVector(wind.dir, "right");
				drawWindVector(wind.dir2, "left");
			}
		}
		ctx.restore();
		// Draw the headwind/crosswind diagram
		ctx.save();
		x += round(13 + 10 + 15 + arrowLen/2);
		y = round(10 + 15 + arrowLen/2);
		ctx.lineWidth = 2;
		ctx.textAlign = "center";
		if (rwyHWind < 0) {
			drawArrow(ctx, x, y + arrowLen/2, 1.5 * Math.PI, arrowLen, arrowLen/3);
			ctx.textBaseline = "bottom";
			ctx.fillText(String(Math.abs(rwyHWind)), x, y - arrowLen/2 - labelPad);
		} else {
			drawArrow(ctx, x, y - arrowLen/2, .5 * Math.PI, arrowLen, arrowLen/3);
			ctx.textBaseline = "top";
			ctx.fillText(String(Math.abs(rwyHWind)), x, y + arrowLen/2 + labelPad);
		}
		ctx.textBaseline = "middle";
		if (rwyXWind < 0) {
			drawArrow(ctx, x - arrowLen/2, y, 0, arrowLen, arrowLen/3);
			ctx.textAlign = "left";
			ctx.fillText(String(Math.abs(rwyXWind)), x + arrowLen/2 + labelPad, y);
		} else {
			drawArrow(ctx, x + arrowLen/2, y, Math.PI, arrowLen, arrowLen/3);
			ctx.textAlign = "right";
			ctx.fillText(String(Math.abs(rwyXWind)), x - arrowLen/2 - labelPad, y);
		}
		ctx.restore();
	} else {
		ctx.restore();
	}

	// Place any provided information in the upper left
	if (info) {
		ctx.save();
		x = pad;
		y = pad;
		a = info.split(";");
		ctx.textBaseline = "top";
		ctx.textAlign = "left";
		ctx.fillStyle = "black";
		for (i = 0; i < a.length; i++) {
			ctx.fillText(a[i], x, y);
			y += 16;
		}
		ctx.restore();
	}
}

/*
 * Draw and arrow from (startX, startY) at "angle" radians (from the right), "length" long, and "width" wide.
 * The current line width and color will be used.
 */
function drawArrow (ctx, startX, startY, angle, length, width) {
	ctx.save();
	ctx.beginPath();
	ctx.translate(startX, startY);
	ctx.rotate(angle);
	ctx.lineJoin = "round";
	ctx.moveTo(0, 0);
	ctx.lineTo(length, 0);
	ctx.lineTo(length - width/2, -width/2);
	ctx.moveTo(length, 0);
	ctx.lineTo(length - width/2, width/2);
	ctx.stroke();
	ctx.restore();
}

/*
 * Draw a dotted line from (startX, startY) to (endX, endY).
 * The dots are lineWidth long.
 */
function drawDottedLineTo (ctx, startX, startY, endX, endY) {
	var x = startX;
	var y = startY;
	var len = lineLength(endX - startX, endY - startY);
	var dot = ctx.lineWidth;
	var r = dot / len;
	var dx = (endX - startX) * r;		// delta for each dot or blank
	var dy = (endY - startY) * r;

	ctx.save();
	ctx.beginPath();
	ctx.moveTo(x, y);		// move to the start

	while (len >= dot) {
		x += dx;
		y += dy;
		ctx.lineTo(x, y);	// draw a dot
		x += dx;
		y += dy;
		ctx.moveTo(x, y);	// skip to the next dot
		len -= 2 * dot;
	}
	ctx.stroke();
	ctx.restore();
}

/****
 * Misc page functions
 ****/

/*
 * Compute cold weather altitude adjustment.
 */
function computeColdAltAdj (prefix, arptAlt, oat, n) {
	var isa = oat - 15;		// The adjustment comes into play if the airport reports below 15C regardless of altitude
	var alt;
	var i;

	if (!isValid(isa) || isa >= 0) {
		showElt(prefix + "Cold", false, "block");
		return;
	}
	// set the adjusted outputs
	for (i = 0; i < n; i++) {
		alt = getIO(prefix+"Cold"+(i + 1));
		setOutput(prefix+"ColdAdj"+(i + 1),
			isValid(alt) && isValid(arptAlt) && alt >= arptAlt
				? roundUp(alt + coldAltAdj(alt - arptAlt, isa))
				: INVALID_NULL
		);
	}
	showElt(prefix + "Cold", true, "block");
}

/*
 * The CG limits are represented by two sets of lines for the forward and aft CG limits
 * respectively (limit vs. weight). This function will find the limit for the line given
 * the weight. It assumes that the set of points are monotonically increasing with weight.
 */
function findCGLimit (limits, weight) {
	var i;

	if (weight <= limits[0].weight)
		return (limits[0].stn);

	for (i = 1; i < limits.length; i++) {
		if (weight <= limits[i].weight) {
			return (limits[i-1].stn
				+ (weight - limits[i-1].weight) * (limits[i].stn - limits[i-1].stn)
					/ (limits[i].weight - limits[i-1].weight)
			);
		}
	}
	return (INVALID);
}

/*
 * Compute the cruise pressure altitude.
 */
function cruisePA () {
	// Under the flight levels use the average of the departure and destination
	// altimeter settings to compute pressure altitude.
	return (pressureAlt(getIO("EnrtAltH") * 100, (getIO("DepAltimeter_inhg") + getIO("DestAltimeter_inhg"))/2));
}

/*
 * Compute the standard OAT for the cruise.
 */
function cruiseStdOAT () {
	return (round(stdTemp(cruisePA())));
}

/****
 * TOU page functions
 ****/

var gAcceptedTOU = false;

/*
 * Called when the Terms of Use are accepted.
 * Records TOU in local storage then goes to intial page
 */
function acceptTOU () {
	gAcceptedTOU = true;
	// If this is a single user machine then record the version of the TOU accepted.
	// This will prevent the TOU from being displayed on the next startup.
	if (getIO("SingleUser")) {
		setStorage(gAppID + "TOU", TOU_VERSION);
	} else {
		deleteStorage(gAppID + "TOU");
	}
	// Go to the correct initial page.
	if (getIO("SetEmerg")) {
		selectPage("Emerg");	// start at Emergency page, if user desires
	} else {
		selectPage("Home");
	}
}

/*
 * Checks whether the current version of the terms of use have been accepted.
 */
function checkTOU () {
	if (!gAcceptedTOU) {
		gAcceptedTOU = (getStorage(gAppID + "TOU") == TOU_VERSION);
	}
	return (gAcceptedTOU);
}

/****
 * Help page functions
 ****/

/*
 * Show page-specific help.
 * Arguments are a list of IDs for <h2> sections on the Help page.
 */
function showHelp (id) {
	// If there's nothing on the stack, then this is the initial call to the help system.
	// Turn off the underlying pages, if requi
	if (gIO.pageDesc.helpPageStack.length == 0) {
		if (gUI.style == "small") {
			// In the small UI the help page takes up the whole screen and does not always display the TOC.
			// Turn off all the regular pages, indexes, and header
			for (p in gIO.pageDesc.pages) {
				if (p != "Home") {
					showElt(p + "Page", false);
				}
				if ("childPages" in gIO.pageDesc.pages[p]) {
					showElt(p + "Index", false);
				}
			}
			showElt("Header", false);
			// Push the TOC on the stack so that the use can get at it by hitting the back button.
			gIO.pageDesc.helpPageStack.push("HelpTOC");
		} else {
			// The regular UI is a smaller ovelay window, so leave the underlying window alone.
			// Always display the TOC and the help text.
			showElt("HelpTOC", true);
		}
		// Show the help page.
		showElt("HelpPage", true);
	}
	help(id);
}

/*
 * Helper function to display a help page.
 * Called by showHelp(), helpBack(),and helpDone().
 */
function help (id) {
	var i;

	assert(id.match(/^Help/), "help: bad id");
	// Show the back button if there's something already on the stack.
	showElt("HelpBackButton", gIO.pageDesc.helpPageStack.length > 0);
	// If the first stack element is the TOC and the new element will be above it change the button label
	// to "Contents" instead of "Back". This happen only on the small UI.
	if (gIO.pageDesc.helpPageStack.length == 1 && gIO.pageDesc.helpPageStack[0] == "HelpTOC") {
		getElt("HelpBackButton").innerHTML = "Contents";
	} else {
		getElt("HelpBackButton").innerHTML = "Back";
	}
	// In the small UI turn the TOC and Text on separately.
	if (gUI.style == "small") {
		if (id == "HelpTOC") {
			showElt("HelpTOC", true);
			showElt("HelpText", false);
		} else {
			showElt("HelpTOC", false);
			showElt("HelpText", true);
		}
	}
	// Display the correct page in HelpText.
	for (i = 0; i < gIO.pageDesc.helpPages.length; i++) {
		showElt(gIO.pageDesc.helpPages[i], id == gIO.pageDesc.helpPages[i]);
	}
	// Push the element on the page stack.
	gIO.pageDesc.helpPageStack.push(id);
}

/*
 * Called to go back one page in the help stack.
 */
function helpBack () {
	var id;

	gIO.pageDesc.helpPageStack.pop();			// pop the top of stack
	help(gIO.pageDesc.helpPageStack.pop());	// pop the top element and redisplay it.
}

/*
 * Called to exit the help system.
 */
function helpDone () {
	if (gUI.style == "small") {
		// In the small UI we turned off the pages and header. Restore them now.
		selectPage(gIO.pageDesc.selectedPage);
		showElt("Header", true);
	}
	showElt("HelpPage", false);			// turn off the help page
	gIO.pageDesc.helpPageStack.splice(0);	// clear the help stack
}

/****
 * Hold page functions
 ****/

/*
 * Interactive hold computer.
 */
function computeHold () {
	var h;
	var entry = holdEntry(getIO("HoldHeading"), getIO("HoldRadial"), getIO("HoldLeftTurns"));
	var lr = function (oldHdg, newHdg) {
		var a = angleDiff(oldHdg, newHdg);
		if (a < 0) {
			return ("left to ");
		}
		if (a > 0) {
			return ("right to ");
		}
		return ("");
	};

	// setup default input error fields
	setOutput("HoldEntry", entry);
	drawHold(getIO("HoldHeading"), getIO("HoldRadial"), entry);
	switch (entry) {
	case "teardrop":
		h = adjust360(getIO("HoldRadial") + (getIO("HoldLeftTurns")? 1: -1) * 30);
		setOutput("HoldInitial",
			lr(getIO("HoldHeading"), h) + fmtHeading(h) + "&deg;"
			+ "<br>then turn " + (getIO("HoldLeftTurns")? "left": "right")
			+ "<br>to intercept inbound course"
		);
		break;
	case "parallel":
		setOutput("HoldInitial",
			lr(getIO("HoldHeading"), getIO("HoldRadial")) + fmtHeading(getIO("HoldRadial")) + "&deg;"
			+ "<br>then turn " + (getIO("HoldLeftTurns")? "right": "left")
			+ "<br>to intercept inbound course"
		);
		break;
	case "direct":
		setOutput("HoldInitial", (getIO("HoldLeftTurns")? "left to ": "right to ") + fmtHeading(getIO("HoldRadial")) + "&deg;");
		break;
	}
}

/*
 * Compute the hold entry type given the heading to the fix, the outbound radial, and left/right turns.
 */
function holdEntry (hdg, radial, left) {
	var adiff = angleDiff(hdg, radial);

	if (left) {
		adiff = -adiff;
	}
	if (adiff > 0 && adiff < 70) {
		return ("teardrop");
	}
	if (adiff <= 0 && adiff >= -110) {
		return ("parallel");
	}
	return ("direct");
}

/*
 * Draw a heading indicator with the hold superimposed on it.
 */
function drawHold(hdg, radial, entry) {
	var canvas = getElt("HoldCanvas");
	var r;							// radius of compass
	var pad = 10;
	var headingBoxWidth = 34;
	var headingBoxHeight = 24;
	var headingPoint = 4;
	var holdRadius;
	var holdLeg;
	var entryPad = 5;
	var adiff = angleDiff(hdg, radial);
	var ctx;
	var canvasSize = 300;
	var canvasFontSize = 16;
	var statVar = drawHold;		// use fn obj for static variables

	// Get the drawing context, if supported and clear the canvas.
	if (canvas.getContext == undefined) {
		//canvas.innerHTML = "Please use a browser that supports HTML5 (IE9, Safari, Firefox, Chrome)";
		return;
	}
	ctx = canvas.getContext("2d");
	if (!statVar.once) {
		canvas.width = canvas.height = canvasSize;
		canvas.computedStyle = getComputedStyle(canvas, "");
		canvas.actualWidth = canvas.computedStyle.width.replace("px", "");
		canvas.actualHeight = canvas.computedStyle.height.replace("px", "");
		statVar.once = true;
	}
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	// Fix for Android clearRect bug
	if (gDev.platform == "Android" && gDev.phoneGap) {
		canvas.width = 1;
		canvas.width = canvasSize;
	}
	r = (canvas.height / 2) - (2 * pad);
	holdLeg = round(.58 * r);
	holdRadius = holdLeg / Math.PI;
	// Draw a heading compass with the heading on top
	ctx.save();
	ctx.translate(round(canvas.width/2), canvas.height - r - pad);	// move origin to center of compass
	ctx.font = "normal normal "+(canvasFontSize-3)+"px sans-serif";		// compass font
	drawCompass(ctx, 0, 0, r, hdg);
	// Set up basic text font
	ctx.textBaseline = "middle";
	ctx.textAlign = "center";
	ctx.font = "normal bold "+canvasFontSize+"px sans-serif";
	// Draw the heading with a box around it.
	ctx.beginPath();
	ctx.lineWidth = 2;
	ctx.moveTo(0, -r);
	ctx.lineTo(headingPoint, -r - headingPoint);
	ctx.lineTo(headingBoxWidth/2, -r - headingPoint);
	ctx.lineTo(headingBoxWidth/2, -r - headingBoxHeight);
	ctx.lineTo(-headingBoxWidth/2, -r - headingBoxHeight);
	ctx.lineTo(-headingBoxWidth/2, -r - headingPoint);
	ctx.lineTo(-headingPoint, -r - headingPoint);
	ctx.lineTo(0, -r);
	ctx.stroke();
	ctx.beginPath();
	ctx.fillText(fmtHeading(hdg), 0, -r - headingPoint - headingBoxHeight/2 + 2);

	// Draw a path from the bottom to the fix at the center.
	ctx.strokeStyle = "#FF00FF";	// magenta
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(0, r);
	ctx.lineTo(0, 0);
	ctx.stroke();
	// Draw the hold
	ctx.beginPath();
	if (radial != hdg) {
		ctx.rotate(degToRad(adiff));	// rotate to radial pointing up
	}
	if (getIO("HoldLeftTurns")) {
		ctx.scale(-1, 1);			// flip horizontally for left turns
	}
	ctx.arc(-holdRadius, 0, holdRadius, 0, -Math.PI);
	ctx.lineTo(-2 * holdRadius, -holdLeg);
	ctx.arc(-holdRadius, -holdLeg, holdRadius, -Math.PI, 0);
	ctx.lineTo(0, 0);
	ctx.stroke();

	// Draw the entry
	ctx.beginPath();
	ctx.strokeStyle = "#FF80FF";	// light magenta
	switch (entry) {
	case "teardrop":
		ctx.arc(-holdRadius, -holdLeg, holdRadius - entryPad, 0, 2 * Math.atan(holdLeg / holdRadius), true);
		ctx.lineTo(0, 0);
		ctx.stroke();
		break;
	case "parallel":
		ctx.moveTo(-entryPad, 0);
		ctx.lineTo(-entryPad, -holdLeg);
		ctx.arc(-holdRadius, -holdLeg, holdRadius - entryPad, 0, (.5 + .13) * Math.PI, true);
		ctx.lineTo(
			-2 * entryPad,
			-holdLeg
				+ (holdRadius - entryPad) * Math.cos(.13 * Math.PI)
				+ ((holdRadius - entryPad) * (1 + Math.sin(.13 * Math.PI)) - 2 * entryPad) * Math.tan(.13 * Math.PI)
		);
		ctx.stroke();
		break;
	default:	// direct
		ctx.arc(-holdRadius, 0, holdRadius - entryPad, 0, Math.PI, false);
		ctx.stroke();
		break;
	}

	// Draw the fix at the center.
	ctx.beginPath();
	ctx.arc(0, 0, 3, 0, Math.PI*2, true);
	ctx.closePath();
	ctx.fill();

	// Draw the inbound course heading.
	ctx.strokeStyle = "black";
	ctx.textBaseline = "middle";
	ctx.textAlign = "center";
	ctx.save();
	ctx.translate(20, -holdLeg/2);
	drawArrow(ctx, 0, 17, Math.PI/2, 18, 7);
	// rotate the label so that it stays horizontal
	if (getIO("HoldLeftTurns")) {
		if (radial != hdg) {
			ctx.rotate(degToRad(adiff));
		}
		ctx.scale(-1, 1);		// flip horizontally for left turns
	} else {
		if (radial != hdg) {
			ctx.rotate(-degToRad(adiff));
		}
	}
	ctx.fillText(fmtHeading(adjust360(radial + 180)), 0, 0);
	ctx.restore();

	// Draw the outbound course heading.
	ctx.save();
	ctx.translate(-2 * holdRadius - 20, -holdLeg/2);
	drawArrow(ctx, 0, -17, -Math.PI/2, 18, 7);

	// rotate the label so that it stays horizontal
	if (getIO("HoldLeftTurns")) {
		if (radial != hdg) {
			ctx.rotate(degToRad(adiff));
		}
		ctx.scale(-1, 1);		// flip horizontally for left turns
	} else {
		if (radial != hdg) {
			ctx.rotate(-degToRad(adiff));
		}
	}
	ctx.fillText(fmtHeading(radial), 0, 0);
	ctx.restore();
	ctx.restore();
}

/*
 * Activate function for hold page.
 * Activates draggable/touchable areas.
 */
function drawHoldActivate () {
	var canvas = getElt("HoldCanvas");

	// Get the drawing context, if supported and clear the canvas.
	if (canvas.getContext == undefined) {
		//canvas.innerHTML = "Please use a browser that supports HTML5 (IE9, Safari, Firefox, Chrome)";
		return;
	}
	// Listen for events.
	canvas.addEventListener(getPointerEventName('pointerdown'), drawHoldEvent, false);
	canvas.addEventListener(getPointerEventName('pointerup'), drawHoldEvent, false);
}

/*
 * Deactivate function for hold page.
 * Deactivates draggable/touchable areas.
 */
function drawHoldDeactivate () {
	var canvas = getElt("HoldCanvas");

	// Get the drawing context, if supported and clear the canvas.
	if (canvas.getContext == undefined) {
		//canvas.innerHTML = "Please use a browser that supports HTML5 (IE9, Safari, Firefox, Chrome)";
		return;
	}
	// Listen for events.
	canvas.removeEventListener(getPointerEventName('pointerdown'), drawHoldEvent, false);
	canvas.removeEventListener(getPointerEventName('pointerup'), drawHoldEvent, false);
}

var gStartAngle;
var gStartHeading;
var gStartRadial;

/*
 * Redraw the hold based on the current touch event.
 * Called by the touch even handler.
 */
function drawHoldEvent (e) {
	var canvas = getElt("HoldCanvas");
	var pad = 10;
	var x, y;
	var a;
	var touchAngle = function (x, y) {
		var ox = x - round(canvas.width / 2);	// diff from center
		var oy = y - (canvas.height - ((canvas.height - 20) / 2 - pad) - pad);	// diff from center
		var r = Math.sqrt(ox * ox + oy * oy);	// distance from center

		// Compute the angle of the touch relative to straight up (the current heading).
		// Return NaN if it's outside the compass.
		if (r < (canvas.height - 20) / 2 - pad) {
			if (oy <= 0) {
				return (Math.asin(ox / r) * 180 / Math.PI);
			} else {
				return (180 - Math.asin(ox / r) * 180 / Math.PI);
			}
		}
		return (NaN);
	};
	// var delta = logEventTime("drawHoldEvent start");

	e.preventDefault();
	e.stopPropagation();
	// Get the x and y values from the right place for the event.
	switch (e.type) {
	case "touchstart":
	case "touchmove":
		x = e.targetTouches[0].clientX - canvas.getBoundingClientRect().left;
		y = e.targetTouches[0].clientY - canvas.getBoundingClientRect().top;
		x *= canvas.width / canvas.actualWidth;
		y *= canvas.height / canvas.actualHeight;
		break;

	case "touchend":
		x = y = undefined;
		break;
	case "mousedown":
	case "mouseup":
	case "mousemove":
		x = e.clientX - canvas.getBoundingClientRect().left;
		y = e.clientY - canvas.getBoundingClientRect().top;
		x *= canvas.width / canvas.actualWidth;
		y *= canvas.height / canvas.actualHeight;
		break;
	}
	// Handle each event type.
	switch (e.type) {
	case "touchstart":
	case "mousedown":
		gStartAngle = touchAngle(x, y); // get the angle of the touch relative to the fix
		if (isNaN(gStartAngle)) {
			return;						// outside the target area
		}
		e.preventDefault();
		e.stopPropagation();
		// if the touch is within the hold (we use within 30deg of the radial as a proxy) change the radial, otherwise change the heading.
		a = angleDiff(angleDiff(getIO("HoldHeading"), getIO("HoldRadial")), gStartAngle);
		if (getIO("HoldLeftTurns")) {
			a = -a;
		}
		if (a <= 0 && a >= -30) {
			gStartRadial = getIO("HoldRadial");
			gStartHeading = NaN;
		} else {
			gStartHeading = getIO("HoldHeading");
			gStartRadial = NaN;
		}
		// Listen for movement events.
		canvas.addEventListener(getPointerEventName('pointermove'), drawHoldEvent, false);
		break;
	case "mousemove":
	case "touchmove":
		a = touchAngle(x, y);
		// Stop tracking if out of bounds.
		if (isNaN(a)) {
			return;
		}
		e.preventDefault();
		e.stopPropagation();
		// Move the heading or radial based on the angle difference from where we started.
		if (!isNaN(gStartHeading)) {
			setupInput("HoldHeading", adjust360(gStartHeading - round(angleDiff(gStartAngle, a))));
		} else {
			setupInput("HoldRadial", adjust360(gStartRadial + round(angleDiff(gStartAngle, a))));
		}
		computeHold();
		break;
	case "mouseup":
	case "touchend":
		// The end of a mouse movement, drag, or button up.
		canvas.removeEventListener(getPointerEventName('pointermove'), drawHoldEvent, false);
		break;
	}
	// logEventTime("drawHoldEvent end", delta);
}

/*
 * Draw a heading compass with ticks and numbers every 10 deg.
 */
function drawCompass (ctx, centerX, centerY, radius, heading, color) {
	var tickHeight = .07;		// size of the tick mark as a fraction of radius
	var valuePad = 1;			// padding between tick and number in pixels
	var i, y;

	ctx.save();
	ctx.textBaseline = "top";					// for heading indications
	ctx.textAlign = "center";
	ctx.beginPath();
	ctx.fillStyle = ctx.strokeStyle = (color? color: "black");
	ctx.lineWidth = 2;
	ctx.translate(centerX, centerY);
	ctx.arc(0, 0, radius, 0, 2 * Math.PI);		// draw the compass circle
	ctx.stroke();

	if (heading != 360) {
		ctx.rotate((-2 * Math.PI) * (heading / 360));	// rotate CCW to the heading
	}
	for (i = 1; i <= 36; i++) {
		ctx.rotate(2 * Math.PI / 36);			// rotate 10deg CCW
		ctx.beginPath();
		y = -radius;
		ctx.moveTo(0, y);						// move to the top of the circle
		y += radius * tickHeight;
		ctx.lineTo(0, y);						// draw a tick mark
		ctx.stroke();
		if (i % 3 == 0) {						// draw heading indication every 3rd mark
			ctx.beginPath();
			y += valuePad;
			switch (i) {
			case 9:
				ctx.fillText("E", 0, y);
				break;
			case 18:
				ctx.fillText("S", 0, y);
				break;
			case 27:
				ctx.fillText("W", 0, y);
				break;
			case 36:
				ctx.fillText("N", 0, y);
				break;
			default:
				ctx.fillText(String(i), 0, y);	// draw the heading number
				break;
			}
		}
	}
	ctx.restore();
}

/****
 * Trips page functions.
 ****/

/*
 * Set the app values from the trip, if applicable
 */
function computeTrip () {
	var id;
	var selectedTrip = getIO("SelectedTrip");
	
	if (changedIO("TripSelectedAC") && getIO("TripSelectedAC") != "[Any]") {
		setupInput("SelectedAC", getIO("TripSelectedAC"));
	}
	if (gIO.tripOpen >= 0 && gIO.tripEditable) {
		// record trip inputs, if one is selected
		setTripFromPage(gIO.tripOpen);
		setTripOptions(getIO("TripName"));
	} else if (gIO.tripOpen >= 0 && getIO("TripName") == getIO("SelectedTrip") && !isSelectedTrip()) {
		// there's a non-editable open trip where the page no longer matches the trip.
		// set it back to "[Current]" to indicate that the app no longer reflects that trip
		setupInput("SelectedTrip", "[Current]");
		setupInput("TripSelectedAC", "[Any]");
		selectTrip();
	} else {
		selectTrip();
	}
	computePage("Enrt");			// recalculate fuel usage based on TO weight
}

function setTripACOptions () {
	var i;
	var isAny = (getIO("TripSelectedAC") == "[Any]");
	var selectedAC = getIO("SelectedAC");

	// setup current aircraft options, in case they've changed
	clearOptions("TripSelectedAC");
	addOption("TripSelectedAC", "[Any]");
	for (i = 0; i < gIO.aircraft.length; i++) {
		addOption("TripSelectedAC", gIO.aircraft[i]["ACReg"]);
	}
	selectedAC = (isAny || selectedAC == "[NONE]"? "[Any]": selectedAC);
	setupInput("TripSelectedAC", selectedAC);
}

/*
 *	Return true if app values correspond to the selected trip.
 */
function isSelectedTrip () {
	var selectedTrip = getIO("SelectedTrip");
	var id;
	var i;

	if (selectedTrip == "[Current]") {
		return (true);
	}
	i = findTripIndex(selectedTrip);
	assert(i >= 0, "isSelectedTrip: can't find trip: "+selectedTrip);
	for (id in gIO.tripIDs) {
		if (isValidIO(id) && id in gIO.trips[i] && getIO(id) != gIO.trips[i][id]) {
			return (false);
		}
	}
	if (getIO("TripSelectedAC") != gIO.trips[i]["TripSelectedAC"]) {
		return (false);
	}
	return (true);
}

/*
 * Check the trip name.
 * Make sure the new name is not null and is does not already exist.
 */
function checkTripName () {
	var tripName = getIO("TripName");
	var selectedTrip = getIO("SelectedTrip");

	if (tripName == selectedTrip) {
		return;
	}
	assert(gIO.tripEditable, "checkTripName: trip not editable");
	assert(selectedTrip != "[Current]", "checkTripName: trip can't be [CUrrent]");
	if (tripName.length == 0) {
		notice("Trip name cannot be null");
		setupInput("TripName", selectedTrip);	// set it back
		return;
	}
	if (findTripIndex(tripName) >= 0) {
		notice("Trip name already exists");
		setupInput("TripName", selectedTrip);	// set it back
		return;
	}
}

/*
 * Create a new trip. Called from new trip button.
 */
function newTrip () {
	var trip;
	var tripName;
	var i;

	// Make sure there are non-default aircraft
	if (gIO.aircraft.length == 0) {
		notice("Cannot create trip without any aircraft. Please create an aircraft on the Aircraft page.");
		return;
	}
	// Create a trip with a unique name
	trip = {};
	tripName = (getIO("DepArpt") == "" && getIO("DestArpt") == ""
				? "Trip"
				: getIO("DepArpt") + "->" + getIO("DestArpt"));
	// if the default trip name already exists, find a unique number to add to the end of the name
	if (findTripIndex(tripName) >= 0) {
		for (i = 0; i <= gIO.trips.length; i++) {
			if (findTripIndex(tripName+" "+(i+1)) < 0) {
				break;
			}
		}
		tripName = tripName + " " + (i+1);
	}
	trip["TripName"] = tripName;
	setupInput("TripName", tripName);	// setup new trip name
	gIO.trips.push(trip);
	setTripFromPage(gIO.trips.length - 1);
	gIO.trips.sort(function (a, b) {
		return (a["TripName"] < b["TripName"]? -1: (a["TripName"] > b["TripName"]? 1: 0));
	});
	setTripOptions(tripName);
	selectTrip();
	editTrip(true);
	computePage("Trip");
	saveInput();						// save it
}

/*
 * Delete the selected trip. Called from trip delete button
 */
function deleteTrip () {
	var selectedTrip = getIO("SelectedTrip");
	var i = findTripIndex(selectedTrip);

	if (selectedTrip == "[Current]") {
		notice("Cannot delete [Current] trip");
		return;
	}
	// Confirm the deletion, delete it then select the "[Current]" trip.
	dialog.confirm("Delete trip: " + gIO.trips[i]["TripName"] + "?",
		function (yes) {
			if (yes) {
				gIO.trips.splice(i, 1);
				setTripOptions("[Current]");
				selectTrip();
				computePage("Trip");
				saveInput();
			}
		}
	);
}

/*
 * Make the selected trip fields editable or not.
 */
function editTrip (editable) {
	var id;
	var selCurrent = (getIO("SelectedTrip") == "[Current]");

	if (selCurrent) {
		editable = true;	// [Current] is always editable
	} else if (editable == undefined) {
		// If editable is not given, then toggle it. This form is called from the "Edit/Done" button.
		editable = !gIO.tripEditable;
	}
	gIO.tripEditable = editable;
	// Set field disabled property based in editability.
	for (id in gIO.tripIDs) {
		getElt(id).disabled = !editable;
	}
	getElt("TripSelectedAC").disabled = !editable;
	getElt("TripName").disabled = !editable;
	getElt("SelectedTrip").disabled = (!selCurrent && editable);
	if (selCurrent) {
		// Don't show trip name field of edit button for "[Current]" trip.
		showElt("TripNameContainer", false);
		showElt("TripEditButton", false);
	} else {
		// Show trip name field if editable. Show edit button and change it to "Done" if editable.
		showElt("TripNameContainer", editable);
		getElt("TripEditButton").innerHTML = (editable? "Done": "Edit");
		showElt("TripEditButton", true);
	}
}

/*
 * Sort the trips by name, setup the trip options list and setup the selected trip.
 */
function setTripOptions (tripName) {
	var i;

	clearOptions("SelectedTrip");
	addOption("SelectedTrip", "[Current]");
	for (i = 0; i < gIO.trips.length; i++) {
		addOption("SelectedTrip", gIO.trips[i]["TripName"]);
	}
	setupInput("SelectedTrip", tripName);
}

/*
 * Select a trip.
 * For stored trips, the trip values are loaded into the equivalent app fields.
 * If the "[Current]" trip is selected, pull the app info io the trip fields.
 */
function selectTrip () {
	var selectedTrip = getIO("SelectedTrip");
	var i;

	if (selectedTrip == "[Current]") {
		editTrip(true);
		setupInput("TripName", "[Current]");		// just in case
		gIO.tripOpen = -1;
	} else {
		i = findTripIndex(selectedTrip);
		assert(i >= 0, "selectTrip: can't find trip: "+selectedTrip);
		if (gIO.tripOpen != i) {
			gIO.tripOpen = i;
			editTrip(false);
			setPageFromTrip(gIO.tripOpen);
			setupInput("EnrtTempType", "ISA");
			setupInput("EnrtOAT", inputDefault("EnrtOAT"));
			setupInput("EnrtWind", inputDefault("EnrtWind"));
			computePage("AC");		// setup any new aircraft
			computePage("Enrt");	// recompute fuel usage and route distance
		}
	}
	computeHeader();
}

/*
 * Load Trips page values into the selected trip.
 */
function setTripFromPage (index) {
	var id, ids;
	var trip = {};

	assert(index >= 0 && index < gIO.trips.length, "setTripFromPage: trip not open");
	// Create a new trip object that contains only inputs in current units
	ids = getIdList("<page:Trip;io:input>");
	for (id in ids) {
		if (id != "SelectedTrip" && isCurrentUnits(id)) {
			// Load the value into the trip
			trip[id] = (isValidIO(id)? getIO(id): inputDefault(id));
		}
	}
	// save trip units
	trip["SetWeightUnits"] = getIO("SetWeightUnits");
	trip["SetFuelUnits"] = getIO("SetFuelUnits");
	gIO.trips[index] = trip;
}

/*
 * Load the selected trip into the Trips page inputs.
 */
function setPageFromTrip (index) {
	var id;
	var trip;

	assert(index >= 0 && index < gIO.trips.length, "setPageFromTrip: trip not open");
	trip = gIO.trips[index];
	for (id in trip) {
		if (id == "SetWeightUnits" || id == "SetFuelUnits") {
			continue;
		}
		if (id == "TripSelectedAC" && trip[id] != "[Any]") {
			setupInput("SelectedAC", trip[id]);
			setupInput("TripSelectedAC", trip[id]);
		}
		setupInput(id, trip[id]);		// converts to current units, if required
		setIOValidationError(id);		// set any validation error on current units
	}
}

/*
 * Find the index in the gIO.trips array of the trip name.
 */
function findTripIndex (tripName) {
	var i;

	if (tripName != "[Current]") {
		for (i = 0; i < gIO.trips.length; i++) {
			if (gIO.trips[i]["TripName"] == tripName) {
				return (i);
			}
		}
	}
	return (-1);
}

/*
 * Set the appropriate header field.
 * Warn if default aircraft is in use. Otherwise, show selected trip.
 */
function computeHeader () {
	var selectedTrip = getIO("SelectedTrip");
	var selectedAC = getIO("SelectedAC");

	// setup the header
	if (selectedAC == "[NONE]") {
		setInputHeading("Warning: Using default aircraft", "red");
	} else {
		setInputHeading(
			selectedAC
			+(selectedTrip != "[Current]"
				? " Trip: " + gIO.trips[findTripIndex(selectedTrip)]["TripName"]
				: "")
		);
	}
}

/****
 * Aircraft page functions.
 ****/

/*
 * Create a new aircraft.
 * Called from new aircraft button.
 */
function newAircraft () {
	var aircraft;
	var ACReg;
	var i;

	// Create an aircraft with a unique name
	aircraft = {};
	ACReg = "N";
	if (findAircraftIndex(ACReg) >= 0) {
		for (i = 0; i <= gIO.aircraft.length; i++) {
			if (findAircraftIndex(ACReg + (i+1)) < 0) {
				break;
			}
		}
		ACReg = ACReg + (i+1);
	}
	aircraft["ACReg"] = ACReg;
	// Add the trip to the gIO.aircraft array and sort it by registration.
	gIO.aircraft.push(aircraft);
	gIO.aircraft.sort(function (a, b) {
		return (a["ACReg"] < b["ACReg"]? -1: (a["ACReg"] > b["ACReg"]? 1: 0));
	});
	setAircraftOptions(ACReg);		// setup option list
	setupInput("ACReg", ACReg);		// select the aircraft
	setAircraftFromPage(ACReg);		// set aircraft fields from page
	editAircraft(true);				// make page editable
	saveInput();					// save it
}

/*
 * Delete the selected aircraft.
 */
function deleteAircraft () {
	var i;
	var selectedAC = getIO("SelectedAC");

	if (selectedAC == "[NONE]") {
		notice("Cannot delete [NONE] aircraft");
		return;
	}
	for (i = 0; i < gIO.trips.length; i++) {
		if (gIO.trips[i]["TripSelectedAC"] == selectedAC) {
			notice("Aircraft in use by trip: " + gIO.trips[i]["TripName"] + "."
				+ " Change trip aircraft before deleting");
			return;
		}
	}
	i = findAircraftIndex(selectedAC);
	assert(i >= 0, "deleteAC: Invalid aircraft " + selectedAC);
	dialog.confirm("Delete aircraft: "+selectedAC+"?",
		function (yes) {
			if (yes) {
				gIO.aircraft.splice(i, 1);
				if (gIO.aircraft.length == 0) {
					selectedAC = inputDefault("SelectedAC");
				} else {
					selectedAC = gIO.aircraft[0]["ACReg"];
				}
				setAircraftOptions(selectedAC);
				editAircraft(false);
				computePage("AC");
				saveInput();
			}
		}
	);
}

/*
 * Make the selected aircraft fields editable or not.
 */
function editAircraft (editable) {
	var id, ids;

	// If editable is not given, then toggle it.
	// This form is called from the "Edit/Done" button.
	if (editable == undefined) {
		editable = !gIO.aircraftEditable;
	}
	gIO.aircraftEditable = editable;
	// Set field disabled property based on editability.
	ids = getIdList("<page:AC;io:input>");
	for (id in ids) {
		if (id == "SelectedAC") {
			getElt(id).disabled = editable;
		} else {
			getElt(id).disabled = !editable;
		}
	}
	showRow("ACReg", editable);		// show the registration field, if editable
	getElt("ACEditButton").innerHTML = (editable? "Done": "Edit");	// set button to "done" is editable
	showRow("editACButtons", !editable);	// show the "new" and "delete" buttons, if not editable
}

/*
 * Change the aircraft registration.
 * Ensures new name meets constraints.
 */
function changeACReg () {
	var selectedAC = getIO("SelectedAC");
	var ACReg = getIO("ACReg");
	var i = findAircraftIndex(selectedAC);
	var j;

	assert(gIO.aircraftEditable, "computeACReg: not editable");
	if (ACReg == selectedAC) {
		return;
	}
	if (ACReg.length == 0) {
		notice("Aircraft registration cannot be null");
		setInput("ACReg", selectedAC);	// set it back
		return;
	}
	if (ACReg == "[NONE]") {
		notice("Aircraft registration cannot be [NONE]");
		setInput("ACReg", selectedAC);	// set it back
		return;
	}
	for (j = 0; j < gIO.aircraft.length; j++) {
		if (j != i && gIO.aircraft[j]["ACReg"] == ACReg) {
			notice("Aircraft registration already exists");
			setInput("ACReg", selectedAC);	// set it back
			return;
		}
	}
	gIO.aircraft[i]["ACReg"] = ACReg;		// change the name in the aircraft list and sort it
	gIO.aircraft.sort(function (a, b) {
		return (a["ACReg"] < b["ACReg"]? -1: (a["ACReg"] > b["ACReg"]? 1: 0));
	});
	setAircraftOptions(ACReg);				// change the option list to reflect the new name
}

/*
 * Set the aircraft options list from the ones stored in gIO.
 */
function setAircraftOptions (selectedAC) {
	var i;

	selectedAC = selectedAC || getIO("SelectedAC");
	clearOptions("SelectedAC");
	if (gIO.aircraft.length == 0) {
		addOption("SelectedAC", "[NONE]");
		selectedAC = "[NONE]";
	} else {
		for (i = 0; i < gIO.aircraft.length; i++) {
			addOption("SelectedAC", gIO.aircraft[i]["ACReg"]);
		}
	}
	setupInput("SelectedAC", selectedAC);
	setTripACOptions();
	computeAC();
	computeTrip();
}

/*
 * Load app values into the selected aircraft.
 */
function setAircraftFromPage (selectedAC) {
	var id, ids;
	var aircraft = {};
	var i;

	if (selectedAC == undefined) {
		selectedAC = getIO("SelectedAC");
	}
	if (selectedAC == "[NONE]") {
		return;
	}
	i = findAircraftIndex(selectedAC);
	assert(i >= 0, "setAircraftFromPage: cannot find aircraft "+selectedAC);
	ids = getIdList("<page:AC;io:input>");
	for (id in ids) {
		// Store aircraft page value in saved aircraft
		if (id != "SelectedAC" && isCurrentUnits(id)) {
			aircraft[id] = getIO(id);
		}
	}
	// save aircraft units
	aircraft["SetWeightUnits"] = getIO("SetWeightUnits");	// save current units
	gIO.aircraft[i] = aircraft;
}

/*
 * Set app values from the selected aircraft.
 */
function setPageFromAircraft (ACReg) {
	var id;
	var aircraft;
	var i;

	if (ACReg == undefined) {
		ACReg = getIO("SelectedAC");
	}
	i = findAircraftIndex(ACReg)
	assert(ACReg == "[NONE]" || (gIO.aircraft.length > 0 && i >= 0), "setAircraft: unknown aircraft "+ACReg);
	aircraft = gIO.aircraft[i];
	for (id in aircraft) {
		if (id == "SetWeightUnits") {
			continue;
		}
		setupInput(id, aircraft[id]);		// converts to current units, if required
		setIOValidationError(id);			// set any validation error on current units
	}
	computeTrip();
}

/*
 * Find the index in the gIO.aircraft array of the aircraft registration.
 */
function findAircraftIndex (name) {
	var i;

	for (i = 0; i < gIO.aircraft.length; i++) {
		if (gIO.aircraft[i]["ACReg"] == name) {
			return (i);
		}
	}
	return (-1);
}

/****
 * Aircraft data functions
 ****/

/*
 * Set the current aircraft model.
 */
function setCurrentAC (model) {
	gACData.current = model;
}

/*
 * Get the current aircraft model.
 */
function getCurrentAC (model) {
	return (gACData.current);
}

/*
 * Get aircraft data from the current model.
 */
function getACData (id) {
	var modelData = gACData.model[gACData.current];

	// check for indirect reference to model data
	if ("ExtFields" in modelData && id in modelData["ExtFields"]) {
		modelData = gACData.model[modelData["ExtFields"][id]];
	}
	assert(id in modelData, "getAC: bad attribute id: "+id);
	return (modelData[id]);
}

/*
 * Test whether the current aircraft model is the one specified.
 * "exp" is a regular expression that can match several model IDs.
 */
function isACModel (exp) {
	var re = new RegExp(exp);

	return (re.test(gACData.current));
}

/*
 * Test whether the current aircraft model has an attribute.
 * attr is a field in gACModelData.
 */
function ACModelHasAttribute (id) {
	var modelData = gACData.model[gACData.current];

	return ((id in modelData)
		|| (("ExtFields" in modelData) && (id in modelData["ExtFields"]))
	);
}

/*
 * Get the max value of an attribute.
 */
function getACmax (id) {
	var data;

	if (!ACModelHasAttribute(id)) {
		return (INVALID);
	}
	data = getACData(id);
	assert(typeOf(data) == "object" && "max" in data, "getACmax: no max element: "+id);
	return (data.max);
}

/*
 * Get the min value of an attribute.
 */
function getACmin (id) {
	var data;

	if (!ACModelHasAttribute(id)) {
		return (INVALID);
	}
	data = getACData(id);
	assert(typeOf(data) == "object" && "min" in data, "getACmin: no min element: "+id);
	return (data.min);
}

/****
 * Risk page functions.
 ****/

/*
 * Risk assessment
 */
function computeRisk () {
	var id;
	var risk = 0;
	var highRisk = [];
	var ids;
	var i, r, s;

	// setup default input error fields
	setIOValidationError(getIdList("<page:Risk;io:input>"));
	// Evaluate combined risks. These are stored in gCombinedRisk as partial (? :) expressions that reference
	// the Risk* ID and don't include the ":" clause. Each Risk* ID is converted to isRisk('Risk* ID') and ": 0"
	// is added on to the end for the negative case. If the logical part is true the "?" value is returned.
	// If the combined risk is greater than 1 point the valid risks are added to the highRisk array.
	for (i = 0; i < gCombinedRisk.length; i++) {
		s = gCombinedRisk[i].replace(/(Risk\w+)/g, "isRisk('$1')") + ": 0";
		r = eval(s);				// evaluate the risk
		if (r > 0) {
			if (r > 1) {			// high risk. accumulate the valid IDs
				var a = gCombinedRisk[i].match(/(Risk\w+)/g);
				for (var j = 0; j < a.length; j++) {
					if (getIO(a[j])) {
						highRisk.push(a[j]);
					}
				}
			}
			risk += r;
		}
	}
	// Accumulate the risk for Risk input IDs that have true vaues.
	ids = getIdList("<page:Risk;io:input>");
	for (id in ids) {
		/* Don't show the element if it's not a risk in the current flight rules */
		showRow(id, !(getIO("RiskFlightRules") == "RiskVFR" && gInputDesc[id].riskCat == "IFR"));
		getElt(id).parentNode.parentNode.style.color = "black";		// set the font color to black by default
		r = getRisk(id);
		if (r > 1) {		// high risk. Accumulate the ID
			highRisk.push(id);
		}
		risk += r;
	}
	// Set the high risk items to red.
	for (i = 0; i < highRisk.length; i++) {
		getElt(highRisk[i]).parentNode.parentNode.style.color = "red";
	}
	// Draw the risk meter.
	drawRiskMeter(risk);
	// Show the appropriate recommendation.
	showElt("RiskLow", risk < 5, "block");
	showElt("RiskMed", risk >= 5 && risk < 10, "block");
	showElt("RiskHigh", risk >= 10 && risk < 30, "block");
	showElt("RiskNG", risk >= 30, "block");
}

/*
 * Clear all the risk values.
 */
function clearRisk () {
	var id;

	for (id in gInputDesc) {
		if (!id.match(/^Risk/)) {
			continue;
		}
		setupInput(id, inputDefault(id));
	}
	computeRisk();
}

/*
 * Get the numeric risk associated with the input ID.
 * The risk is an attribute of the element's object in the gInputDesc object. If missing, 1 is assumed.
 * if the risk is not checked, return 0.
 */
function getRisk (id) {
	assert(id.match(/^Risk/), "getRisk: bad id: " + id);
	if (id in gInputDesc) {
		switch (gInputDesc[id].type) {
			case "c":							// checkbox
				if (!getIO(id)) {				// return 0 if not checked
					return (0);
				}
				/* Return 0 if this risk is not associated with current flight rules */
				if (getIO("RiskFlightRules") == "RiskVFR" && gInputDesc[id].riskCat == "IFR") {
					return (0);
				}
				if (gRisk[id] == undefined) {	// assume 1 if not in gRisk
					return (1);
				}
				break;

			case "o":		// option list
				id = getIO(id);
				assert(id.match(/^Risk/), "getRisk: bad id: " + id);
				if (gRisk[id] == undefined) {	// assume 0 if not in gRisk
					return (0);
				}
				break;

			default:
				assert(false, "getRisk: bad type for id: " + id);
				break;
		}
	} else {
		assert(id in gRisk, "getRisk: no risk value for: " + id);
	}
	return (gRisk[id]);		// return the risk value
}

/*
 * Return true if the risk element is present.
 * Can't use getRisk() > 0 since some risk elements only have value in combination with others.
 * Only works for checkboxes and option values. It won;t work on elements that contain the options.
 */
function isRisk (id) {
	var oid;

	assert(id.match(/^Risk/), "isRisk: bad id: " + id);
	// If the id is in gInputDesc and it's a checkbox and it it's valid in the current flight rules,
	// return true if checked.
	if (id in gInputDesc && gInputDesc[id].type == "c") {
		if (getIO("RiskFlightRules") == "RiskVFR" && gInputDesc[id].riskCat == "IFR") {
			return (false);
		}
		return (getIO(id));
	}
	// Search all the "Risk" option list for one that contains this value.
	for (oid in gInputDesc) {
		if (!oid.match(/^Risk/) || gInputDesc[oid].type != "o") {
			continue;
		}
		if (getIO(oid) == id) {
			return (true);				// found an option list that has the value set to "id"
		}
	}
	return (false);
}

/*
 * Draw a "risk" meter. This is a dial type meter with colored bands to represent the risk levels and an arrow indictor
 */
function drawRiskMeter (risk) {
	var pad = 5;										// padding around all sides
	var bandHeight = 30;								// height for meter band
	var labelWidth = 45;
	var labelHeight = 25;
	var meterAngle = degToRad(90);						// radians from start to end
	var colors = ["green", "yellow", "red", "magenta"];	// meter colors in each section
	var riskRange = [0, 5, 10, 30, 32];					// values: low, 1st section, ..., high
	var canvas = getElt("RiskMeterCanvas");
	var meterRadius;
	var startAngle = -meterAngle/2 - Math.PI/2;
	var rMax = riskRange[riskRange.length - 1];
	var ctx;
	var i;
	var riskAngle = function (r) {
		return (startAngle + r/rMax * meterAngle)
	}
	var meterX = function (r, radius) {
		return (radius * Math.sin(riskAngle(r)));
	}
	var meterY = function (risk, radius) {
		return (-radius * Math.cos(riskAngle(r)));
	}

	risk = Math.min(risk, rMax);						// clip the risk at the high value
	assert(risk >= 0, "drawRiskMeter: bad risk: " + risk);
	// Get the drawing context, if supported and clear the canvas.
	if (canvas.getContext == undefined) {
		//canvas.innerHTML = "Please use a browser that supports HTML5 (IE9, Safari, Firefox, Chrome)";
		return;
	}
	ctx = canvas.getContext("2d");
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	// Fix for Android clearRect bug
	if (gDev.platform == "Android" && gDev.phoneGap) {
		var tmp = canvas.width;
		canvas.width = 1;
		canvas.width = tmp;
	}
	ctx.save();
	ctx.strokeStyle = "black";
	ctx.lineWidth = 2;
	// Fit the meter radius to size of available canvas
	meterRadius = (canvas.width/2 - pad) / Math.sin(meterAngle/2);
	if (meterRadius > canvas.height - (2 * pad)) {
		ctx.beginPath();
		ctx.rect(pad - ctx.lineWidth, pad - ctx.lineWidth, canvas.width - (2 * pad) + (2 * ctx.lineWidth), canvas.height - (2 * pad) + (2 * ctx.lineWidth));
		ctx.clip();
	}

	// Move the origin to the bottom of the meter at the needle hub.
	ctx.translate(round(canvas.width / 2), meterRadius + pad);
	// Draw the filled colors that represent the degree of risk
	for (var i = 0; i < colors.length; i++) {
		ctx.fillStyle = colors[i];
		ctx.beginPath();
		ctx.arc(0, 0, meterRadius, riskAngle(riskRange[i]), riskAngle(riskRange[i+1]), false);
		ctx.arc(0, 0, meterRadius - bandHeight, riskAngle(riskRange[i+1]), riskAngle(riskRange[i]), true);
		ctx.fill();
	}
	// Outline the color band
	ctx.beginPath();
	ctx.arc(0, 0, meterRadius, -meterAngle/2 - Math.PI/2, meterAngle/2 - Math.PI/2, false);
	ctx.arc(0, 0, meterRadius - bandHeight, meterAngle/2 - Math.PI/2, -meterAngle/2 - Math.PI/2, true);
	ctx.closePath();
	ctx.stroke();
	// Draw the meter arrow
	drawArrow(ctx, 0, 0, riskAngle(risk), meterRadius - bandHeight - 2, 15);
	// Draw the arrow hub
	if (meterRadius <= canvas.height - (2 * pad)) {
		ctx.beginPath();
		ctx.fillStyle = "black";
		ctx.arc(0, 0, 4, 0, Math.PI * 2, false);
		ctx.fill();
	}
	ctx.restore();

	ctx.save();
	ctx.strokeStyle = ctx.fillStyle = "black";
	ctx.textBaseline = "middle";
	ctx.textAlign = "center";
	ctx.font = "bold 13px sans-serif";
	ctx.lineWidth = 2;
	ctx.clearRect(canvas.width/2 - labelWidth/2, canvas.height - 2 * pad - labelHeight, labelWidth, labelHeight);
	ctx.beginPath();
	ctx.rect(canvas.width/2 - labelWidth/2, canvas.height - 2 * pad - labelHeight, labelWidth, labelHeight);
	ctx.stroke();
	if (risk < riskRange[riskRange.length - 2]) {
		ctx.fillText(String(round(risk)), canvas.width/2, canvas.height - 2 * pad - labelHeight/2);
	} else {
		ctx.fillText("No-go", canvas.width/2, canvas.height - 2 * pad - labelHeight/2);
	}

	ctx.restore();
}

/****
 * Regression test functions.
 ****/

/*
 * Check that the output matches the specified value.
 */
function checkOutput (id, value) {
	var err = (isValid(value)? getIO(id) != value: isValid(getIO(id)));

	if (err) {
		notice("Test failure: Output " + id + " != " + value + " (" + getIO(id) + ")");
	}
	return (err);
}

/*
 * Check that the Input matches the specified value.
 */
function checkInput (id, value) {
	var err = (isValid(value)? getIO(id) != value: isValid(getIO(id)));

	if (err) {
		notice("Test failure: Input " + id + " != " + value);
	}
	return (err);
}

/*
 * Check that a test element matches the specified test.
 */
function checkEltText (id, text) {
	var err = (getElt(id).textContent != text);

	if (err) {
		notice("Test failure: Element text " + id + " != " + text);
	}
	return (err);
}

/*
 * Verify the airport and runway databases.
 */
function checkDB () {
	var a, r, id, i;

	for (id in gAirportData) {
		assert(id in gRunwayData, "Airport not in runway DB: " + id);
		a = gAirportData[id];
		assert(a.length == 4 && Math.abs(a[ARPT_LAT]) <= 90 && Math.abs(a[ARPT_LONG]) <= 180 && a[ARPT_ELEV] < 15000 && Math.abs(a[ARPT_VAR]) < 180,
			"Airport DB entry invalid: " + id);
	}
	for (id in gRunwayData) {
		assert(id in gAirportData, "Airport not in airport DB: " + id);
		r = gRunwayData[id];
		assert(r.length >= 1, "Runway DB entry invalid: " + id);
		for (i = 0; i < r.length; i++) {
			assert(r[i].length == 5
				&& r[i][RWY_BASE_ID].match(/^[0-9]{1,2}[LCR]?/)
				&& Math.abs(r[i][RWY_SLOPE]) < 5
				&& r[i][RWY_LEN] < 20000
				&& r[i][RWY_BASE_DISP_THRESH] <= r[i][RWY_LEN]
				&& r[i][RWY_RECIP_DISP_THRESH] <= r[i][RWY_LEN],
				"Runway DB entry invalid: " + id
			);
		}
	}
}

/*
 * Check aircraft database.
 */
function checkACData () {
	var model;
	var ext;

	for (model in gACData.model) {
		if ("ExtFields" in gACData.model[model]) {
			for (ext in gACData.model[model]["ExtFields"]) {
				assert(
					!(ext in gACData.model[model])
						&& (ext in gACData.model[gACData.model[model]["ExtFields"][ext]]),
					"checkACData: bad field: "+ext+" in model: "+model
				);
			}
		}
	}
}

/*
 * Final setup of ACData.
 * Currently computes the min and max for all table parameters
 */
function setupACData () {
	var model;
	var ac;
	var table
	var o;
	var i;
	var setMinMax = function (tableObj, a, index) {		// adjust the min and max for this tableObj
		var i;

		index = index || 0;			// default table level
		a = a || tableObj.a;		// default parameter array
		// adjust the min and max for this set of table values.
		for (i = 0; i < a.length; i++) {
			tableObj.parmMin[index] = Math.min(tableObj.parmMin[index], a[i].p);
			tableObj.parmMax[index] = Math.max(tableObj.parmMax[index], a[i].p);
			// recurse down if there are any sub-tables.
			if (a[i].a) {
				setMinMax(tableObj, a[i].a, index + 1);
			}
		}
	};

	// go though each aircraft model
	for (model in gACData.model) {
		ac = gACData.model[model];
		// go through each entry in the model
		for (table in ac) {
			o = ac[table];
			// skip entries that are not parameter tables
			if (table == "ExtFields" || typeOf(o) != "object" || !o.parmNames) {
				continue;
			}
			// setup a min and max array for the parameters and initialize to +/- Infinity.
			o.parmMin = new Array(o.parmNames.length);
			o.parmMax = new Array(o.parmNames.length);
			for (i = 0; i < o.parmNames.length; i++) {
				o.parmMin[i] = Infinity;
				o.parmMax[i]= -Infinity;
			}
			setMinMax(o);
			// check for mistakes
			for (i = 0; i < o.parmNames.length; i++) {
				assert(isFinite(o.parmMin[i]) && isFinite(o.parmMax[i]), "setupACData: cannot setup: "+model+":"+table+"@"+i);
			}
		}
	}
}