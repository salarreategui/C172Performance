/*
 * Code for C172 calculations.
 */

/*
 * Globals
 */

/*
 * Descriptor for each input ID.
 * A descriptor object is stored for each input ID. The object contains elements relevant to the type of the input.
 * All objects contain a "type" and "def" field. The types are strings.
 * The first letter is the main type, but subsequent characters are modifiers:
 * - "n": Integer of float. "nx" is an integer with x digits. "nx.y" is a float with x integer digits and y fraction digits.
 * - "c": Checkbox
 * - "s": String. "sx" is a string with x characters max.
 * - "S": All-caps string. "Sx" is a string with x characters max.
 * - "T": Multi-line text
 * - "r": Radio button
 * - "o": Options menu that is pre-defined.
 * - "O": Options menu that is dynamically created.
 * - "w": Wind speed spec string. Same as in METAR. e.g. 10G17.
 * - "d": Wind direction spec string. Same as in METAR. e.g. 120V180.
 * - "e": Email address.
 * - "i": Save ID.
 * A "*" in the type indicates that the input come from a source other than the user.
 * The "def" element contains the default value.
 * The default value may need to be computed based on other input values so it can be a fixed value or a function.
 * The "n" type can contain several other elements:
 * - "min": Minumum value. Can be a fixed value or a function. Required element.
 * - "max": Maximum value. Can be a fixed value or a function. Required element.
 * - "incr": Increment between valid values. If missing, 1 is assumed.
 * - "old": Starting value for input selectors. Can be a fixed value or a function. If missing, "def" value is assumed.
 * - "vtick": Tick interval for vslider on tablets. If missing, keyboard input will be used.
 * - "sw": String descriptor for twNumber or a function. Used on small UI (e.g. phones). Can also be a function.
 * The min and max are gross limits. Many of these values are further restricted in the code.
 * When there are multiple inputs on a displayed row, they usually share a common error message row.
 * The "errID" field is the ID of the shared error message area.
 * If an ID's page is not the same as it's prefix, the associated page is identified by a "page" field.
 * If an ID uses the same type, min, max, and input methods as another ID, the format can referenced by a "same" field.
 * "errID" and "page" will not be copied from the referenced ID.
 * ID's can be linked to a base ID. In this case they will mirror the base ID in format, values and errors.
 * "errID" and "page" will not be linked to the base ID.
 * If "local" is true, then the element is only saved locally. It is not saved to the cloud.
 * Don't reference an output using "link" or "same".
 */
var gInputDesc = {
	// These inputs should be the same for different aircraft types
	SingleUser: {type:"c", def:false, page:"TOU", local:true},
	SelectedTrip: {type:"O", def:"[Current]", page:"Trip"},
	TripName: {type:"s25", def:"Trip", onchange:"checkTripName()"},
	TripWBFuel_gal: {link:"WBFuel_gal"},
	TripWBFuel_l: {link:"WBFuel_l"},
	TripWBFuelUsed_gal: {link:"WBFuelUsed_gal"},
	TripWBFuelUsed_l: {link:"WBFuelUsed_l"},
	TripEnrtAltH: {link:"EnrtAltH"},
	TripEnrtDist: {link:"EnrtDist"},
	TripDepArpt: {link:"DepArpt"},
	TripDestArpt: {link:"DestArpt"},
	TripSelectedAC: {type:"O", def:"[Any]", page:"Trip"},
	DepArpt: {type:"S4", def:"", onchange:"checkAirportName('Dep')"},
	DestArpt: {type:"S4", def:"", onchange:"checkAirportName('Dest')"},
	DepAlt: {type:"n5", min:-200, max:11000, def:0, incr:100,
		vtick:-1000, sw:"??,|???|ft."},
	DestAlt: {same:"DepAlt"},
	DepMetarText: {type:"T*", def:""},
	DestMetarText: {same:"DepMetarText"},
	EmergLdgAlt: {type:"o", def:0},
	EmergISA: {type:"o", def:0},
	APMDH: {type:"n4", min:0, max:8000, def:200, incr:10,
		vtick:1000, sw:"?,|?|??|ft."},
	APCold1: {type:"n5", min:0, max:17000, def:0, incr:100,
		vtick:1000, sw:"?,|?|??|ft."},
	APCold2: {same:"APCold1"},
	APCold3: {same:"APCold1"},
	APCold4: {same:"APCold1"},
	APCold5: {same:"APCold1"},
	APCold6: {same:"APCold1"},
	DPCold1: {same:"APCold1"},
	DPCold2: {same:"APCold1"},
	DPCold3: {same:"APCold1"},
	DPCold4: {same:"APCold1"},
	DepAltimeter_inhg: {type:"n2.2", min:28, max:30.99, def:29.92, incr:.01, vtick:1, sw:"??.|?|?|in."},
	DestAltimeter_inhg: {same:"DepAltimeter_inhg"},
	DepAltimeter_hpa: {type:"n4", min:900, max:1099, def:1013, incr:1, vtick:1, sw:"??|?|?|hPa."},
	DestAltimeter_hpa: {same:"DepAltimeter_hpa"},
	DepOAT: {type:"n2", min:-50, max:60, def:15,
		vtick:10, sw:"??|&deg;C"},
	DestOAT: {same:"DepOAT"},
	DepWindDir: {type:"d", def:"010", sw:true},
	DestWindDir: {same:"DepWindDir"},
	DepWind: {type:"w", def:"0", sw:true},
	DestWind: {same:"DepWind"},
	DepRwy: {type:"O", def:function () {return (getOptionValue("DepRwy", 0));}},
	DestRwy: {type:"O", def:function () {return (getOptionValue("DestRwy", 0));}},
	DepRwyLength_ft: {type:"n5", min:0, max:17000, def:0, incr:10, vtick:1000, sw:"??,|?|?|?|ft."},
	DestRwyLength_ft: {same:"DepRwyLength_ft"},
	DepRwyLength_m: {type:"n5", min:0, max:5000, def:0, incr:1, vtick:1000, sw:"?,|?|?|?|m."},
	DestRwyLength_m: {same:"DepRwyLength_m"},
	DepSlope: {type:"n1.1", min:-5, max:5, def:0, incr:.1,
		vtick:1, incr:.1, sw:"+-|?.?|%"},
	EnrtWindDir: {type:"o", def:"tailwind"},
	HoldHeading: {type:"n3", min: 1, max:360, def:360,
		vtick:-30, sw:"?|?|?|&deg;"},
	HoldRadial: {same:"HoldHeading"},
	SelectedAC: {type:"O", def:function () {return (getOptionValue("SelectedAC", 0));}, page:"AC"},
	ACReg: {type:"S9", def:"[NONE]"},
	SetEmail: {type:"e", def:"", onchange:"checkCloud(true)", local:true},
	SetSaveID: {type:"i", def:"", onchange:"regressionTest(getIO('SetSaveID'));checkCloud(true)", local:true},
	SetTOSafety: {type:"n2", min:0, max:200, def:40, incr:5, vtick:50, sw:"?|?|?|%"},
	SetLdgSafety: {same:"SetTOSafety"},
	SetEmerg: {type:"c", def:false},
	WBEnrtFuelToDest: {type:"c", def:true},
	SetAltimeterUnits: {type: "o", def:"inhg"},
	SetRunwayUnits: {type: "o", def:"ft"},
	SetFuelUnits: {type: "o", def:"gal"},
	SetWeightUnits: {type: "o", def:"lbs"},
	SetNumInputStyle: {type:"O", def:defaultNumInputStyle, local:true},
	HoldLeftTurns: {type:"c", def:false},
	RiskDepMTOW: {type:"c", def:false},
	RiskDepPrecip: {type:"c", def:false},
	RiskDepNight: {type:"c", def:false},
	RiskDepTerrain: {type:"c", def:false},
	RiskDepIcing: {type:"c", def:false},
	RiskDepWind: {type:"c", def:false},
	RiskDepXWind: {type:"c", def:false},
	RiskDestShrtRwy: {type:"c", def:false},
	RiskDestTerrain: {type:"c", def:false},
	RiskDestWind: {type:"c", def:false},
	RiskDestXWind: {type:"c", def:false},
	RiskDestLLWS: {type:"c", def:false},
	RiskDestVasi: {type:"c", def:false},
	RiskDestNight: {type:"c", def:false},
	RiskDestUnfam: {type:"c", def:false},
	RiskDestNoTwr: {type:"c", def:false},
	RiskDestNoRadar: {type:"c", def:false},
	RiskDestLowFuel: {type:"c", def:false},
	RiskDestNoFBO: {type:"c", def:false},
	RiskMaint: {type:"c", def:false},
	RiskCur: {type:"c", def:false},
	RiskRest: {type:"c", def:false},
	RiskAfterWork: {type:"c", def:false},
	Risk2ndFlight: {type:"c", def:false},
	Risk3Landings: {type:"c", def:false},
	RiskIllness: {type:"c", def:false},
	RiskPersonal: {type:"c", def:false},
	RiskBusiness: {type:"c", def:false},
	RiskSigmet: {type:"c", def:false},

	// These inputs may be dependent on aircraft types
	WBFuel_gal: {type:"n2", min:0, max:"maxUsableFuel()", def:40, vtick:10, sw:"?|?|gal."},
	WBFuelUsed_gal: {type:"n2", min:0, max:"maxUsableFuel()", def:26, vtick:10, sw:"?|?|gal."},
	WBFuel_l: {type:"n3", min:0, max:"galToL(maxUsableFuel())", def:151, vtick:10, sw:"?|?|?|gal."},
	WBFuelUsed_l: {type:"n3", min:0, max:"galToL(maxUsableFuel())", def:100, vtick:10, sw:"?|?|?|gal."},
	WBRow1L_lbs: {type:"n3", min:0, max:"getACmax('WBRow1')", def:170,
		vtick:100, sw:"?|?|?|lbs.", old:"(old > 0? old: 170)", errID:"WBRow1Error"},
	WBRow1R_lbs: {type:"n3", min:0, max:"getACmax('WBRow1')", def:0,
		vtick:100, sw:"?|?|?|lbs.", old:"(old > 0? old: 170)", errID:"WBRow1Error"},
	WBRow2L_lbs: {type:"n3", min:0, max:"getACmax('WBRow2')", def:0,
		vtick:100, sw:"?|?|?|lbs.", old:"(old > 0? old: 170)", errID:"WBRow2Error"},
	WBRow2R_lbs: {type:"n3", min:0, max:"getACmax('WBRow2')", def:0,
		vtick:100, sw:"?|?|?|lbs.", old:"(old > 0? old: 170)", errID:"WBRow2Error"},
	TripWBRow1L_lbs: {link:"WBRow1L_lbs", errID:"TripWBRow1Error"},
	TripWBRow1R_lbs: {link:"WBRow1R_lbs", errID:"TripWBRow1Error"},
	TripWBRow2L_lbs: {link:"WBRow2L_lbs", errID:"TripWBRow2Error"},
	TripWBRow2R_lbs: {link:"WBRow2R_lbs", errID:"TripWBRow2Error"},
	WBRow1L_kg: {type:"n3", min:0, max:"lbsToKg(getACmax('WBRow1'))", def:77,
		vtick:100, sw:"?|?|?|kg.", old:"(old > 0? old: 77)", errID:"WBRow1Error"},
	WBRow1R_kg: {type:"n3", min:0, max:"lbsToKg(getACmax('WBRow1'))", def:0,
		vtick:100, sw:"?|?|?|kg.", old:"(old > 0? old: 77)", errID:"WBRow1Error"},
	WBRow2L_kg: {type:"n3", min:0, max:"lbsToKg(getACmax('WBRow2'))", def:0,
		vtick:100, sw:"?|?|?|kg.", old:"(old > 0? old: 77)", errID:"WBRow2Error"},
	WBRow2R_kg: {type:"n3", min:0, max:"lbsToKg(getACmax('WBRow2'))", def:0,
		vtick:100, sw:"?|?|?|kg.", old:"(old > 0? old: 77)", errID:"WBRow2Error"},
	TripWBRow1L_kg: {link:"WBRow1L_kg", errID:"TripWBRow1Error"},
	TripWBRow1R_kg: {link:"WBRow1R_kg", errID:"TripWBRow1Error"},
	TripWBRow2L_kg: {link:"WBRow2L_kg", errID:"TripWBRow2Error"},
	TripWBRow2R_kg: {link:"WBRow2R_kg", errID:"TripWBRow2Error"},
	WBBaggage1_lbs: {type:"n3", min:0, max:"getACmax('WBBaggage1')", def:0,
		vtick:25, sw:"?|?|?|lbs."},
	WBBaggage1_kg: {type:"n2", min:0, max:"lbsToKg(getACmax('WBBaggage1'))", def:0,
		vtick:10, sw:"?|?|kg."},
	WBBaggage2_lbs: {type:"n2", min:0, max:"getACmax('WBBaggage2')", def:0,
		vtick:10, sw:"?|?|lbs."},
	WBBaggage2_kg: {type:"n2", min:0, max:"lbsToKg(getACmax('WBBaggage2'))", def:0,
		vtick:5, sw:"?|?|kg."},
	TripWBBaggage1_lbs: {link:"WBBaggage1_lbs"},
	TripWBBaggage1_kg: {link:"WBBaggage1_kg"},
	TripWBBaggage2_lbs: {link:"WBBaggage2_lbs"},
	TripWBBaggage2_kg: {link:"WBBaggage2_kg"},
	EnrtAltH: {type:"n3", min:0, max:"getACData('MaxAlt')/100", def:55, incr:5,
		vtick:50, sw:"??|?|00ft."},
	DPMEAH: {type:"n3", min:0, max:170, def:20, incr:5,
		vtick:20, sw:"??|?|00ft."},
	APMAHoldAltH: {type:"n3", min:0, max:170, def:20, incr:5,
		vtick:20, sw:"??|?|00ft."},
	EnrtTempType: {type:"o", def:"ISA"},
	EnrtOAT: {type:"n2", min:"cruiseStdOAT() - 30", max:"cruiseStdOAT() + 30", def:0,
		vtick:10, sw:"??|&deg;C", old:"cruiseStdOAT()"},
	EnrtISA: {type:"n2", min:-30, max:30, def:0,
		vtick:10, sw:"??|&deg;C", old:0},
	DepRwyCond: {type:"o", def:"hard"},
	DestRwyCond: {type:"o", def:"hard"},
	EnrtPower: {type:"o", def:"65"},
	EnrtDist: {type:"n4", min:10, max:700, def:300,
		vtick:-100, sw:"?|?|?|nm."},
	EnrtWind: {type:"n3", min:0, max:160, def:0,
		vtick:-20, sw:"?|?|?|kt."},
	EnrtReserve: {type:"o", def:"VFR"},
	DestFlaps: {type:"o", def:"30"},
	ACModel: {type:"o", def:"172S"},
	ACBEW_lbs: {type:"n4.1", min:1100, max:2000, def:1626, sw:"?,?|?|?.|?|lbs."},
	ACBEW_kg: {type:"n3.1", min:499, max:907, def:738, sw:"?|?|?.|?|kg."},
	ACArm: {type:"n2.2", min:31, max:47.3, def:38.1, sw:"??.|?|?|in."},
	ACLRTanks: {type:"c", def:true},
	RiskFlightRules: {type:"o", def:"RiskIFR"},
	RiskDepRwyCond: {type:"o", def:"RiskDepRwyDry"},
	RiskDepIMC: {type:"c", def:false, riskCat:"IFR"},
	RiskDepCeiling: {type:"c", def:false, riskCat:"IFR"},
	RiskDepClearance: {type:"c", def:false, riskCat:"IFR"},
	RiskCruiseIMC: {type:"c", def:false, riskCat:"IFR"},
	RiskEnrtLow: {type:"c", def:false},
	RiskEnrtMntn: {type:"c", def:false},
	RiskCruiseIce: {type:"c", def:false, riskCat:"IFR"},
	RiskEnrtWater: {type:"c", def:false},
	RiskEnrtNight: {type:"c", def:false},
	RiskDestRwyCond: {type:"o", def:"RiskDestRwyDry"},
	RiskDestApch: {type:"o", def:"RiskDestApchVis"},
	RiskDestTDSpread: {type:"c", def:false},
	RiskDestPrecip: {type:"c", def:false},
	RiskDestIMC: {type:"c", def:false},
	RiskDestCeilLtFAF: {type:"c", def:false, riskCat:"IFR"},
	RiskDestCeiling: {type:"c", def:false, riskCat:"IFR"},
	RiskDestVis: {type:"c", def:false, riskCat:"IFR"},
	RiskDestCTL: {type:"c", def:false},
	RiskDestFrz: {type:"c", def:false},
	RiskDestIce: {type:"c", def:false},
	RiskDestDeepIMC: {type:"c", def:false, riskCat:"IFR"},
	RiskDestWideIMC: {type:"c", def:false, riskCat:"IFR"},
	RiskDestWideLIFR: {type:"c", def:false, riskCat:"IFR"},
	RiskRedPrecip: {type:"c", def:false},
	RiskFcstIce: {type:"c", def:false},
	RiskMaint: {type:"c", def:false},
	RiskFzRain: {type:"c", def:false},
	RiskIcePirep: {type:"c", def:false},
	RiskTS: {type:"c", def:false},
	RiskAutoPilot: {type:"c", def:false},
	CheckTakeOff: {type:"Z", def:""},
	CheckBStart:{same:"CheckTakeOff"},
	CheckBEnd:{same:"CheckTakeOff"},
	CheckPoint1:{type:"S15",def:""},
	CheckCompHead1:{type:"n3h", def:"360",min:0, max:360,sw:"?|?|?| °"},
	CheckDist1:{type:"n3", def:"0",min:0, max:"getIO('EnrtMaxRange')",sw:"?|?|?|nm."},
	CheckKIAS1:{type:"n3", def:"0",min:0, max:125,sw:"?|?|?|kt."},
	CheckATA1: {type:"Z", def:""},
	CheckPoint2:{same:"CheckPoint1"},
	CheckCompHead2:{same:"CheckCompHead1"},
	CheckDist2:{same:"CheckDist1"},
	CheckKIAS2:{same:"CheckKIAS1"},
	CheckATA2: {same:"CheckATA1"},
	CheckPoint3:{same:"CheckPoint1"},
	CheckCompHead3:{same:"CheckCompHead1"},
	CheckDist3:{same:"CheckDist1"},
	CheckKIAS3:{same:"CheckKIAS1"},
	CheckATA3: {same:"CheckATA1"},
	CheckPoint4:{same:"CheckPoint1"},
	CheckCompHead4:{same:"CheckCompHead1"},
	CheckDist4:{same:"CheckDist1"},
	CheckKIAS4:{same:"CheckKIAS1"},
	CheckATA4: {same:"CheckATA1"},
        CheckPoint5:{same:"CheckPoint1"},
	CheckCompHead5:{same:"CheckCompHead1"},
	CheckDist5:{same:"CheckDist1"},
	CheckKIAS5:{same:"CheckKIAS1"},
	CheckATA5: {same:"CheckTakeOff"},
	CheckPoint6:{same:"CheckPoint1"},
	CheckCompHead6:{same:"CheckCompHead1"},
	CheckDist6:{same:"CheckDist1"},
	CheckKIAS6:{same:"CheckKIAS1"},
	CheckATA6: {same:"CheckATA1"},
	CheckPoint7:{same:"CheckPoint1"},
	CheckCompHead7:{same:"CheckCompHead1"},
	CheckDist7:{same:"CheckDist1"},
	CheckKIAS7:{same:"CheckKIAS1"},
	CheckATA7: {same:"CheckATA1"},
	CheckPoint8:{same:"CheckPoint1"},
	CheckCompHead8:{same:"CheckCompHead1"},
	CheckDist8:{same:"CheckDist1"},
	CheckKIAS8:{same:"CheckKIAS1"},
	CheckATA8: {same:"CheckATA1"},
        CheckPoint9:{same:"CheckPoint1"},
	CheckCompHead9:{same:"CheckCompHead1"},
	CheckDist9:{same:"CheckDist1"},
	CheckKIAS9:{same:"CheckKIAS1"},
	CheckATA9: {same:"CheckATA1"},
        CheckPoint10:{same:"CheckPoint1"},
	CheckCompHead10:{same:"CheckCompHead1"},
	CheckDist10:{same:"CheckDist1"},
	CheckKIAS10:{same:"CheckKIAS1"},
	CheckATA10: {same:"CheckATA1"},
        CheckIAF:{type:"c", def:false},
        CheckName: {type:"s25", def:"Check", onchange:"checkCheckName()"},
        SelectedCheck: {type:"O", def:"[Current]", page:"Check",onchange:"CheckResetTime()"},
        CheckIAFAlt:{type:"n3", def:"getIO('EnrtAltH')",min:0,max:"getIO('EnrtAltH')"},
        SetMinCheckATA:{type:"n2", def:1,min:0,max:5,local:true}
};

/*
 * Table error translations for page outputs.
 * SetPOHOutput uses this to qualify the error messages depending on the error returned
 * from interpolateTable().
 */
var gPOHErrors = {
	Dep: {
		weight: "Takeoff weight",
		temperature: "Departure Temperature",
		altitude: "Departure Altitude"
	},
	Dest: {
		weight: "Landing weight",
		temperature: "Destination Temperature",
		altitude: "Destination Altitude"
	},
	Enrt: {
		weight: "Cruise weight",
		temperature: "Cruise temperature",
		altitude: "Cruise altitude",
		RPM: "Cruise power",
		power: "Cruise power"
	},
	DP: {
		weight: "Takeoff weight",
		temperature: "Departure temperature",
		altitude: "MEA"
	},
	AP: {
		weight: "Landing weight",
		temperature: "Destination temperature",
		altitude: "MA altitude"
	}
};

/*
 * A descriptor object is stored for each output ID. The object contains elements relevant to the type of the output.
 * All objects contain a "type" element. The types are strings.
 * The first letter is the main type, but subsequent characters are modifiers:
 * - "n": Integer of float. "nx" is an integer with x digits.
 *		"nx.y" is a float with x integer digits and y fraction digits.
 *		The output will be rounded to this specification.
 *		This may optionally be followed "m" and n integer for float number.
 *		This means the output will be rounded to the nearest multiple of this number.
 *		The final character may optionally be "u" or "d" which means rounding up or down.
 * - "s": String. "sx" is a string with x characters max.
 * - "t": a time specification in minutes. The output will be of the form "hh:mm".
 * Invalid values are normally treated as being due to invalid input and will display a strike-thru "Input".
 * This can be changed using the "invalid" field:
 * -   "-": Display "-".
 * - "poh": The value is derived from an interpolated POH table. It will display a strike-thru "POH".
 *          If a "tableErrors" field is supplied it will be use to translate errors, either from an error
 *          object supplied as the value, or the last interpolateTable error.
 * When there are multiple outputs on a displayed row, they usually share a common error message row.
 * The "errID" field is the ID of the shared error message area.
 * If an ID's page is not the same as it's prefix, the associated page is identified by a "page" field.
 * If an ID uses the same type, min, max, and input methods as another ID, the format can referenced by a "same" field.
 * "errID" and "page" will not be copied from the referenced ID.
 * ID's can be linked to a base ID. In this case they will mirror the base ID in format, values and errors.
 * "errID" and "page" will not be linked to the base ID.
 * Don't reference an input using "link" or "same".
 */
var gOutputDesc = {
	// These outputs should be the same for different aircraft models
	Version: {type:"s", page:"TOU"},
	TripWBFuelMax_gal: {link:"WBFuelMax_gal"},
	TripWBFuelMax_l: {link:"WBFuelMax_l"},
	TripWBFuelUsedMax_gal: {link:"WBFuelMax_gal"},
	TripWBFuelUsedMax_l: {link:"WBFuelMax_l"},
	TripFuelToDest_gal: {link:"EnrtFuelToDest_gal"},
	TripFuelToDest_l: {link:"EnrtFuelToDest_l"},
	TripEnrtDestDist: {link:"EnrtDestDist"},
        TripWBBaggage2Max_lbs: {link:"WBBaggage2Max_lbs"},
        TripWBBaggage2Max_kg: {link:"WBBaggage2Max_kg"},
	WBFuelToDest_gal: {link:"EnrtFuelToDest_gal"},
	WBFuelToDest_l: {link:"EnrtFuelToDest_l"},
	DepRunwaysText: {type:"s"},
	DestRunwaysText: {same:"DepRunwaysText"},
	DepBestRwy: {type:"s"},
	DestBestRwy: {same:"DepBestRwy"},
	DepMagVar: {type:"s3"},
	DestMagVar: {same:"DepMagVar"},
	DepMetarAge: {type:"s"},
	DestMetarAge: {same:"DepMetarAge"},
	DepHeadwind: {type:"n2"},
	DestHeadwind: {same:"DepHeadwind"},
	DepCrosswind: {type:"n2"},
	DestCrosswind: {same:"DepCrosswind"},
	DepCrosswindDir: {type:"s"},
	DestCrosswindDir: {same:"DepCrosswindDir"},
	DepRunwayLeft_ft: {type:"n4m10d", invalid:"-"},
	DestRunwayLeft_ft: {same:"DepRunwayLeft_ft"},
	DepRunwayLeft_m: {type:"n4m5d", invalid:"-"},
	DestRunwayLeft_m: {same:"DepRunwayLeft_m"},
	DepTempF: {type:"n3", color:"black"},
	DestTempF: {same:"DepTempF"},
	DepTempISA: {type:"n2", color:"black"},
	DestTempISA: {same:"DepTempISA"},
	DepDA: {type:"n5m100u"},
	DestDA: {same:"DepDA"},
	DPAOCWind: {type:"n3"},
	DPColdAdj1: {type:"n4"},
	DPColdAdj2: {same:"DPColdAdj1"},
	DPColdAdj3: {same:"DPColdAdj1"},
	DPColdAdj4: {same:"DPColdAdj1"},
	APVDP: {type:"n2.1m.1"},
	APMinVDP: {same:"APVDP"},
	APMinVDPInfo: {type:"s"},
	APAOCWind: {type:"n4"},
	APColdAdj1: {same:"DPColdAdj1"},
	APColdAdj2: {same:"DPColdAdj1"},
	APColdAdj3: {same:"DPColdAdj1"},
	APColdAdj4: {same:"DPColdAdj1"},
	APColdAdj5: {same:"DPColdAdj1"},
	APColdAdj6: {same:"DPColdAdj1"},
	HoldEntry: {type:"s"},
	HoldInitial: {same:"HoldEntry"},
	SetCloudStatus: {type:"s"},

	// These outputs may be dependent on aircraft types
	WBFuelMax_gal: {type:"n2", color:"black"},
	WBFuelUsedMax_gal: {link:"WBFuelMax_gal"},
	WBMaxFuel_gal: {type:"n2d", invalid:"-"},
        WBBaggage2Max_lbs: {type:"n2", color:"black"},
        WBBaggage2Max_kg: {type:"n2", color:"black"},
	EnrtFuelToDest_gal: {type:"n2.1", invalid:"poh", tableErrors:gPOHErrors.Enrt},
	WBFuelToDest_gal: {link:"EnrtFuelToDest_gal"},
	EnrtFuelAtDest_gal: {type:"n2d", invalid:"poh", tableErrors:gPOHErrors.Enrt},
	EnrtFuelAtAlt_gal: {type:"n2d"},
	EnrtAltResv_gal: {same:"EnrtFuelToDest_gal"},
	EnrtClimbCruise_gal: {same:"EnrtFuelToDest_gal"},
	EnrtClimbCruise_l: {same:"EnrtFuelToDest_gal"},	
	WBFuelMax_l: {type:"n3", color:"black"},
	WBFuelUsedMax_l: {link:"WBFuelMax_l"},
	WBMaxFuel_l: {type:"n3d", invalid:"-"},
	EnrtFuelToDest_l: {type:"n3u", invalid:"poh", tableErrors:gPOHErrors.Enrt},
	EnrtFuelAtDest_l: {same:"EnrtFuelToDest_l"},
	EnrtFuelAtAlt_l: {type:"n3d"},
	EnrtAltResv_l: {type:"n3u", invalid:"poh", tableErrors:gPOHErrors.Enrt},
	WBTOWeight_lbs: {type:"n4u"},
	WBLdgWeight_lbs: {same:"WBTOWeight_lbs"},
	WBZFWeight_lbs: {same:"WBTOWeight_lbs"},
	WBRampWeight_lbs: {same:"WBTOWeight_lbs"},
	WBTOWeight_kg: {type:"n4u"},
	WBLdgWeight_kg: {same:"WBTOWeight_kg"},
	WBZFWeight_kg: {same:"WBTOWeight_kg"},
	WBRampWeight_kg: {same:"WBTOWeight_kg"},
	WBTOCG: {type:"n2.1m.1"},
	WBLdgCG: {same:"WBTOCG"},
	WBZFCG: {same:"WBTOCG"},
	WBTOCategory: {type:"s"},
	WBLdgCategory: {same:"WBTOCategory"},
	DepRoll_ft: {type:"n4u", invalid:"poh", errID:"DepRollVrError", tableErrors:gPOHErrors.Dep},
	DestRoll_ft: {type:"n4u", invalid:"poh", tableErrors:gPOHErrors.Dest},
	DepObstacle_ft: {type:"n4u", invalid:"poh", tableErrors:gPOHErrors.Dep},
	DestObstacle_ft: {type:"n4u", invalid:"poh", tableErrors:gPOHErrors.Dest},
	DepObstacleDist_ft: {type:"n4m50u"},
	DestObstacleDist_ft: {same:"DepObstacleDist_ft"},
	DepSafeRunway_ft: {type:"n4m10u", invalid:"-"},
	DestSafeRunway_ft: {same:"DepSafeRunway_ft"},
	DepSafeObstacle_ft: {same:"DepSafeRunway_ft"},
	DestSafeObstacle_ft: {same:"DepSafeRunway_ft"},
	DepAcStop_ft: {type:"n4m10u", invalid:"-"},
	DepRoll_m: {type:"n4u", invalid:"poh", errID:"DepRollVrError", tableErrors:gPOHErrors.Dep},
	DestRoll_m: {type:"n4u", invalid:"poh", tableErrors:gPOHErrors.Dest},
	DepObstacle_m: {type:"n4u", invalid:"poh", tableErrors:gPOHErrors.Dep},
	DestObstacle_m: {type:"nu4u", invalid:"poh", tableErrors:gPOHErrors.Dest},
	DepObstacleDist_m: {type:"n4m10u"},
	DestObstacleDist_m: {same:"DepObstacleDist_m"},
	DepSafeRunway_m: {type:"n4m5u", invalid:"-"},
	DestSafeRunway_m: {same:"DepSafeRunway_m"},
	DepSafeObstacle_m: {same:"DepSafeRunway_m"},
	DestSafeObstacle_m: {same:"DepSafeRunway_m"},
	DepAcStop_m: {type:"n4m5u", invalid:"-"},
	DepVr: {type:"n2u", invalid:"poh", errID:"DepRollVrError", tableErrors:gPOHErrors.Dep},
	DepVx: {type:"n2u", invalid:"poh", errID:"DepVxVyError", tableErrors:gPOHErrors.Dep},
	DepVy: {type:"n2u", invalid:"poh", errID:"DepVxVyError", tableErrors:gPOHErrors.Dep},
	DestVy: {type:"n2u", invalid:"poh", tableErrors:gPOHErrors.Dest},
	DPTOVy: {type:"n2u", invalid:"poh", tableErrors:gPOHErrors.Dep},
	DPVy: {type:"n2u", invalid:"poh", tableErrors:gPOHErrors.DP},
	APMAVy: {type:"n2u", invalid:"poh", tableErrors:gPOHErrors.AP},
	DepVs10: {type:"n2u", invalid:"poh", tableErrors:gPOHErrors.Dep},
	Dep13Vs10: {type:"n2u", invalid:"-"},
	DepVs: {type:"n2u", invalid:"poh", tableErrors:gPOHErrors.Dep},
	Dep13Vs: {type:"n2u", invalid:"-"},
	DepVa: {type:"n2d", invalid:"poh", tableErrors:gPOHErrors.Dep},
	DestVs30: {type:"n2u", invalid:"poh", tableErrors:gPOHErrors.Dest},
	Dest13Vs30: {type:"n2u", invalid:"-"},
	DestVs10: {type:"n2u", invalid:"poh", tableErrors:gPOHErrors.Dest},
	Dest13Vs10: {type:"n2u", invalid:"-"},
	DestVs: {type:"n2u", invalid:"poh", tableErrors:gPOHErrors.Dest},
	Dest13Vs: {type:"n2u", invalid:"-"},
	DestVa: {type:"n2d", invalid:"poh", tableErrors:gPOHErrors.Dest},
	DepBEWind:  {type:"n2"},
	EnrtISA2: {type:"n2", invalid:"-"},
	EnrtDestDist: {type: "n3u", color:"black"},
	EnrtMaxRange: {type:"n3d", invalid:"poh", tableErrors:gPOHErrors.Enrt},
	EnrtETE: {type:"tu", invalid:"poh", tableErrors:gPOHErrors.Enrt},
	EnrtEndurance: {type:"td", invalid:"poh", tableErrors:gPOHErrors.Enrt},
	EnrtTAS: {type:"n3", invalid:"poh", tableErrors:gPOHErrors.Enrt},
	EnrtRPM: {type:"n3", invalid:"poh", tableErrors:gPOHErrors.Enrt},
	EnrtFOB: {type:"td", invalid:"poh", tableErrors:gPOHErrors.Enrt},
	EnrtGPH: {type:"n2.1m.1", invalid:"poh", tableErrors:gPOHErrors.Enrt},
	EnrtPPH: {type:"n3", invalid:"-"},
	EnrtEff: {type:"n2.1m.1", invalid:"-"},
	EnrtClimbFuel_gal: {type:"n2.1", invalid:"poh", tableErrors:gPOHErrors.Enrt},
	EnrtClimbFuel_l: {type:"n2.1", invalid:"poh", tableErrors:gPOHErrors.Enrt},
	EnrtClimbDist: {type:"n2", invalid:"poh", errID:"EnrtClimbDTError", tableErrors:gPOHErrors.Enrt},
	EnrtClimbTime: {type:"t", invalid:"poh", errID:"EnrtClimbDTError", tableErrors:gPOHErrors.Enrt},
	DestROC: {type:"n4", invalid:"poh", tableErrors:gPOHErrors.Dest},
	DPTOROC: {type:"n4", invalid:"poh", tableErrors:gPOHErrors.DP},
	DPTOAOC: {type:"n4", invalid:"poh", tableErrors:gPOHErrors.DP},
	DPROC: {type:"n4", invalid:"poh", tableErrors:gPOHErrors.DP},
	DPAOC: {type:"n4", invalid:"poh", tableErrors:gPOHErrors.DP},
	DPAOCT: {type:"n4", invalid:"poh", tableErrors:gPOHErrors.DP},
	APMAROC: {type:"n4", invalid:"poh", tableErrors:gPOHErrors.AP},
	APMAAOC: {type:"nd4", invalid:"poh", tableErrors:gPOHErrors.AP},
	APMAAOCT: {type:"n4", invalid:"poh", tableErrors:gPOHErrors.AP},
	EmergGlideDist: {type:"n3d", color:"red"},
	CheckETE1: {type:"tz"},
	CheckETA1: {type:"tz", color:"green"},
	CheckFuel1: {type:"n2.1"},
	CheckFuelRem1:{type:"n2.1"},
	CheckETE2: {same:"CheckETE1"},
	CheckETA2: {same:"CheckETA1"},
	CheckFuel2: {same:"CheckFuel1"},
	CheckFuelRem2:{same:"CheckFuelRem1"},
	CheckETE3: {same:"CheckETE1"},
	CheckETA3: {same:"CheckETA1"},
	CheckFuel3: {same:"CheckFuel1"},
	CheckFuelRem3:{same:"CheckFuelRem1"},
	CheckETE4: {same:"CheckETE1"},
	CheckETA4: {same:"CheckETA1"},
	CheckFuel4: {same:"CheckFuel1"},
	CheckFuelRem4:{same:"CheckFuelRem1"},
        CheckETE5: {same:"CheckETE1"},
	CheckETA5: {same:"CheckETA1"},
	CheckFuel5: {same:"CheckFuel1"},
	CheckFuelRem5:{same:"CheckFuelRem1"},
	CheckETE6: {same:"CheckETE1"},
	CheckETA6: {same:"CheckETA1"},
	CheckFuel6: {same:"CheckFuel1"},
	CheckFuelRem6:{same:"CheckFuelRem1"},
	CheckETE7: {same:"CheckETE1"},
	CheckETA7: {same:"CheckETA1"},
	CheckFuel7: {same:"CheckFuel1"},
	CheckFuelRem7:{same:"CheckFuelRem1"},
	CheckETE8: {same:"CheckETE1"},
	CheckETA8: {same:"CheckETA1"},
	CheckFuel8: {same:"CheckFuel1"},
	CheckFuelRem8:{same:"CheckFuelRem1"},
        CheckETE9: {same:"CheckETE1"},
	CheckETA9: {same:"CheckETA1"},
	CheckFuel9: {same:"CheckFuel1"},
	CheckFuelRem9:{same:"CheckFuelRem1"},
        CheckETE10: {same:"CheckETE1"},
	CheckETA10: {same:"CheckETA1"},
	CheckFuel10: {same:"CheckFuel1"},
	CheckFuelRem10:{same:"CheckFuelRem1"},
        CheckTotalDist:{type:"n3",color:"black"},
        CheckTotalETE: {type:"t",color:"black"},
        CheckTotalATA: {type:"t",color:"black"},
        CheckTotalFuelUsd:{type:"n2.1",color:"black"},
        CheckTotalFuelRem:{same:"CheckTotalFuelUsd"},
        CheckTOCDist:{link:"EnrtClimbDist"},
        CheckTOCKias:{link:"DPVy"},
        CheckTOCETE:{link:"EnrtClimbTime"},
        CheckTOCFuelUsd:{link:"EnrtClimbFuel_gal"},
        CheckTODDist:{same:"EnrtClimbDist"},
        CheckTODKias:{same:"DPVy"},
        CheckTODETE:{same:"EnrtClimbTime"},
        CheckTODFuelUsd:{same:"CheckFuel1"},
        CheckVersion:{type:"s6",color:"black"}
};

/*
 * Help pages
 */
var gHelpPages = [
];

/*
 * Risk values. For checkboxes, 1 is assumed if checked and not here.
 * For options, zero is assumed if not here.
 */
var gRisk = {
	RiskDepRwyIce: 5,
	RiskDepRwyWater: 5,
	RiskDepRwyWet: 1,
	RiskDepCeiling: 10,
	RiskDepRwySoft: 5,
	RiskDestNight: 5,
	RiskDestCeiling: 5,
	RiskDestVis: 5,
	RiskDestIce: 5,
	RiskDestRwyWater: 5,
	RiskDestRwyWet: 1,
	RiskDestRwySoft: 5,
	RiskDestRwyIce: 5,
	RiskDestWind: 3,
	RiskDestXwind: 5,
	RiskDestLLWS: 5,
	RiskDestWideLIFR: 5,
	RiskEnrtMntn: 5,
	RiskCruiseIce: 5,
	RiskEnrtWater: 5,
	RiskEnrtNight: 5,
	RiskCur: 3,
	RiskIllness: 3,
	RiskPersonal: 3,
	RiskBusiness: 3,
	RiskSigmet: 5,
	RiskRedPrecip: 100,
	RiskFcstIce: 5,
	RiskFzRain: 100,
	RiskIcePirep: 100,
	RiskTS: 100,
	RiskAutoPilot: 5
};

/*
 * Combined risk expressions.
 * Each array element is a string containing a "?" clause that evaluates a combined risk.
 */
var gCombinedRisk = [
	"RiskEnrtWater && RiskEnrtNight? 100",
	"RiskAutoPilot && (RiskDepIMC || RiskEnrtIMC || RiskDestIMC)? 6",
	"RiskDestCTL && RiskDestNight && (RiskDestIMC || RiskDestTerrain)? 100",
	"RiskCur && (RiskDepIMC || RiskEnrtIMC || RiskDestIMC || RiskDepNight || RiskEnrtNight || RiskDestNight)? 2",
	"RiskDestNight && RiskDestVasi && (RiskDestApchVis || RiskDestApchNP)? 4",
	"RiskDestCTL && RiskDestIMC? 3"
];

/*
 * This describes the structure of the WebApp pages.
 * Yes this probably could be derived from the HTML, but this is easier.
 */
var gPageDesc = {
	deactivate: null,
	selectedPage: "Home",
	helpPageStack: [],
	startPage: "TOU",
	pages: {
		Home: {
			name: "Home",
			childPages: ["Trip", "WB", "Dep", "Enrt", "Dest", "Instr", "Emerg", "More"]
		},
		Check:{
			name: "Enroute Checkpoints",
			compute: [{
				inputs: ["<page:Check;io:input>","CheckTakeOff","CheckBStart","CheckBEnd",
                                "CheckPoint1","CheckCompHead1","CheckDist1","CheckKIAS1", "CheckATA1",
				"CheckPoint2","CheckCompHead2","CheckDist2","CheckKIAS2", "CheckATA2",
				"CheckPoint3","CheckCompHead3","CheckDist3","CheckKIAS3", "CheckATA3",
				"CheckPoint4","CheckCompHead4","CheckDist4","CheckKIAS4", "CheckATA4",
                                "CheckPoint5","CheckCompHead5","CheckDist5","CheckKIAS5", "CheckATA5",
				"CheckPoint6","CheckCompHead6","CheckDist6","CheckKIAS6", "CheckATA6",
				"CheckPoint7","CheckCompHead7","CheckDist7","CheckKIAS7", "CheckATA7",
				"CheckPoint8","CheckCompHead8","CheckDist8","CheckKIAS8", "CheckATA8",
                                "CheckPoint9","CheckCompHead9","CheckDist9","CheckKIAS9", "CheckATA9",
                                "CheckPoint10","CheckCompHead10","CheckDist10","CheckKIAS10", "CheckATA10",
                                "CheckName","SelectedCheck","CheckIAFAlt"],
					outputs: ["<page:Check;io:output>",
                                "CheckETE1","CheckETA1","CheckFuelRem1",
				"CheckETE2","CheckETA2","CheckFuelRem2",
				"CheckETE3","CheckETA3","CheckFuelRem3",
				"CheckETE4","CheckETA4","CheckFuelRem4",
                                "CheckETE5","CheckETA5","CheckFuelRem5",
				"CheckETE6","CheckETA6","CheckFuelRem6",
				"CheckETE7","CheckETA7","CheckFuelRem7",
				"CheckETE8","CheckETA8","CheckFuelRem8",
                                "CheckTOCDist","CheckTOCKias","CheckTOCETE","CheckTOCFuelUsd",
                                "CheckTODDist","CheckTODKias","CheckTODETE","CheckTODFuelUsd",
                                "CheckTotalDist","CheckTotalETE","CheckTotalATA","CheckTotalFuelUsd","CheckTotalFuelRem"],
					fn: computeCheckpoints
			}]
		},
		Trip: {
			name: "Trips",
			parentPage: "Home",
			activate: "editTrip(false)",
			deactivate: "editTrip(false)",
			compute: [
				{
					inputs: ["<page:Trip;io:input>", "WBFuelMax_gal"],
					outputs: ["<page:Trip;io:output>"],
					precedents: ["WB"],		// WBFuelMax_gal output
					fn: computeTrip
				}
			]
		},
		WB: {
			name: "Weight & Balance",
			parentPage: "Home",
			compute: [
				{
					inputs: ["<page:WB;io:input>",
						 "EnrtFuelToDest_gal", "ACModel", "ACBEW_lbs", "ACArm", "ACLRTanks"],
					outputs: ["<page:WB;io:output>"],
					fn: "computeWB(); computeHeader();"
				}
			]
		},
		Dep: {
			name: "Departure",
			parentPage: "Home",
			activate: "startMetarPoll('Dep');",
			deactivate: "stopMetarPoll('Dep');",
			compute: [
				{
					inputs: ["DepMetarText"],
					outputs: [],
					precedents: [],
					fn: "setMetarIO('Dep')"
				},
				{
					inputs: ["DepArpt"],
					outputs: ["DepMetarError"],
					precedents: [],
					fn: "getMetar('Dep')"
				},
				{
					inputs: ["<page:Dep;io:input>", "ACModel", "WBTOWeight_lbs", "SetTOSafety"],
					outputs: ["<page:Dep;io:output>"],
					precedents: ["WB"],		// WBTOWeight output
					fn: "computeDeparture(); computeHeader();"
				}
			]
		},
		Enrt: {
			name: "Enroute",
			parentPage: "Home",
			compute: [
				{
					inputs: ["<page:Enrt;io:input>", "ACModel",
						"WBFuel_gal", "WBTOWeight_lbs", "WBZFWeight_lbs", "DepArpt", "DestArpt",
						"DepAlt", "DepAltimeter_inhg", "DepOAT", "DestAlt", "DestAltimeter_inhg", "DestOAT"
					],
					outputs: ["<page:Enrt;io:output>"],
					precedents: ["WB"],		// WBZFWeight, WBTOWeight output
					fn: "computeEnroute(); computeHeader();"
				}
			]
		},
		Dest: {
			name: "Destination",
			parentPage: "Home",
			activate: "startMetarPoll('Dest');",
			deactivate: "stopMetarPoll('Dest');",
			compute: [
				{
					inputs: ["DestMetarText"],
					outputs: [],
					precedents: [],
					fn: "setMetarIO('Dest')"
				},
				{
					inputs: ["DestArpt"],
					outputs: [],
					precedents: [],
					fn: "getMetar('Dest')"
				},
				{
					inputs: ["<page:Dest;io:input>", "ACModel", "WBLdgWeight_lbs", "SetLdgSafety"],
					outputs: ["<page:Dest;io:output>"],
					precedents: ["WB"],		// WBLdgWeight output
					fn: "computeDestination(); computeHeader();"
				}
			]
		},
		Instr: {
			name: "Instrument Procedures",
			parentPage: "Home",
			childPages: ["DP", "AP", "Hold"]
		},
		DP: {
			name: "Departure Procedure",
			parentPage: "Instr",
			compute: [
				{
					inputs: ["<page:DP;io:input>", "DepAlt", "DepAltimeter_inhg", "DepOAT", "DepWindDir", "DepWind",
						"ACModel", "WBTOWeight_lbs"
					],
					outputs: ["<page:DP;io:output>"],
					precedents: ["WB"],		// WBTOWeight output
					fn: computeDP
				}
			]
		},
		AP: {
			name: "Approach Procedure",
			parentPage: "Instr",
			compute: [
				{
					inputs: ["<page:AP;io:input>",
						"DestAlt", "DestAltimeter_inhg", "DestOAT", "DestWindDir", "DestWind", "DestRwyLength_ft",
						"DestSafeRunway_ft", "ACModel", "WBLdgWeight_lbs"
					],
					outputs: ["<page:AP;io:output>"],
					precedents: ["WB", "Dest"],		// WBLdgWeight, DestSafeRunway output
					fn: computeAP
				}
			]
		},
		Hold: {
			name: "Hold Procedure",
			parentPage: "Instr",
			activate: drawHoldActivate,
			deactivate: drawHoldDeactivate,
			compute: [
				{
					inputs: ["<page:Hold;io:input>"],
					outputs: ["<page:Hold;io:output>"],
					fn: computeHold
				}
			]
		},
		Emerg: {
			name: "Emergency",
			parentPage: "Home",
			compute: [
				{
					inputs: ["<page:Emerg;io:input>", "ACModel", "WBZFWeight_lbs"],
					outputs: ["<page:Emerg;io:output>"],
					precedents: ["WB"],		// WBLdgWeight output
					fn: computeEmergency
				}
			]
		},
		More: {
			name: "More",
			parentPage: "Home",
			childPages: ["Set", "AC", "Risk", "TOU"]
		},
		Set: {
			name: "Settings",
			parentPage: "More",
			compute: [{
				inputs: ["<page:Set;io:input>"],
				fn: computeSettings
			}]
		},
		AC: {
			name: "Aircraft",
			parentPage: "More",
			activate: "editAircraft(false)",
			deactivate: "editAircraft(false)",
			compute: [
				{
					inputs: ["<page:AC;io:input>"],
					fn: "computeAC();computeHeader();"
				}
			]
		},
		Risk: {
			name: "Risk",
			parentPage: "More",
			compute: [{
				inputs: ["<page:Risk;io:input>"],
				fn: computeRisk
			}]
		},
		TOU: {
			name: "Terms of Use",
			parentPage: "More"
		}
	},
	helpPages: [
		"HelpApplicability",
		"HelpIO",
		"HelpTrip",
		"HelpWB",
		"HelpDepDest",
		"HelpEnrt",
		"HelpDP",
		"HelpAP",
		"HelpHold",
		"HelpEmerg",
		"HelpSettings",
		"HelpAC",
		"HelpRisk",
		"HelpTOU",
		"HelpOffline",
		"HelpCompatibility",
		"HelpTrouble",
		"HelpSW",
		"HelpHelp"
	],
};

/*
 * Main onload function
 */
function C172setup () {
	logEventTime("loaded");

	// build out the aircraft data tables
	buildAircraftData();
	// call the common setup
	setup(gPageDesc, gInputDesc, gOutputDesc);

	logEventTime("setup complete");
}

/*
 * Weight & Balance functions
 */
function computeWB () {
	var entry, value, valueL, valueR, stn;
	var weight, moment, cg;
	var fuel, fuelUsed, fuelToDest;
	var pct, fwdLim, aftLim;
	var bew = getIO("ACBEW_lbs");
	var bewArm = getIO("ACArm");
	var fuelData = getACData("WBFuel");
        var bagg2Data = getACData("WBBaggage2");
	var zfWeight = 0;
	var zfMoment = 0;
	var id, baseID, WBIds;
	var units;

	
	if (isACModel("172N") && getIO("ACLRTanks")) {
		fuelData = getACData("WBFuelLR");
	}
	setOutput("WBFuelMax_gal", fuelData.max);
        setOutput("WBBaggage2Max_lbs", bagg2Data.max);
	// Go through all the weight related input entries, validate them and compute
	// a cumulative weight and moment.
	WBIds = getIdList("<page:WB;io:input>");
	for (id in WBIds) {
		// skip ids in units we don't want
		units = getIOUnits(id);
		if (units == "kg" || units == "l") {
			continue;
		}
		baseID = getIOUnitsBase(id);
		stn = "";
		switch (id) {
		case "WBRow1L_lbs":
		case "WBRow1R_lbs":
		case "WBRow2L_lbs":
		case "WBRow2R_lbs":
			value = getIO(id);
			stn = baseID.substr(0, 6);		// extract the row ID
			valueL = getIO(stn+"L_lbs");	// get the weights for all the seats in this row
			valueR = getIO(stn+"R_lbs");
			if (!isValid(valueL) || !isValid(valueR) || valueL < 0 || valueR < 0) {
				setIOError(id, "Invalid input");
				value = INVALID;
			} else if (valueL + valueR > getACData(stn).max) {	// make sure the weight in this row is not too large
				setIOError(id, "Too large");
				value = INVALID;
			}
			break;
		case "WBBaggage1_lbs":
		case "WBBaggage2_lbs":
			value = getIO(id);
			stn = baseID;
			break;
		case "WBFuelUsed_gal":
		case "WBFuel_gal":
		case "WBEnrtFuelToDest":
			continue;						// don't add to weight and moment
		default:
			assert(false, "computeWB: "+id+" Invalid");
			value = INVALID;
			stn = "WBFuelUsed";
			break;
		}
		zfMoment += value * getACData(stn).arm;
		zfWeight += value;
	}
	// Add in the Basic Empty Weight and moment
	zfMoment += bew * bewArm;
	zfWeight += bew;

	// Now that we validated all the non-fuel input, validate the fuel and fuel-used.
	fuel = getIO("WBFuel_gal");
	if (!isValid(fuel)) {					// Invalid
		zfWeight = INVALID;
	} else if (fuel < getACData("WBMinTOFuel") + getACData("WBTaxiFuel")) {	// Too small
		setIOError("WBFuel_gal", "Too small for takeoff");
		zfWeight = INVALID;
	}
	showRow("WBFuelUsed_gal", !getIO("WBEnrtFuelToDest"));
	// If the input is not valid, indicate errors.
	if (!isValid(zfWeight)) {
		setOutput("WBTOWeight_lbs", INVALID_INPUT);
		setOutput("WBLdgWeight_lbs", INVALID_INPUT);
		setOutput("WBZFWeight_lbs", INVALID_INPUT);
		drawWB(INVALID);
		computeEnroute();
		return;
	}
	setOutput("WBZFWeight_lbs", roundUp(zfWeight));
	// Compute the ramp weight
	value = fuel * LBSPERGAL;
	setOutput("WBRampWeight_lbs", roundUp(zfWeight + value));	// compute ramp weight
	// Compute the takeoff weight. Indicate whether the load is light, moderate or heavy.
	// Anything above 80% and 40% of the difference between MaxTOW and BEW is considered
	// heavy and moderate loadings respectively.
	value -= getACData("WBTaxiFuel") * LBSPERGAL;				// subtract taxi fuel
	weight = zfWeight + value;									// Takeoff weight
	moment = zfMoment + value * fuelData.arm;		// Takeoff moment
	setOutput("WBTOWeight_lbs", weight);
	pct = (roundUp(weight) - bew) / (getACData("WBMaxTOWeight") - bew);
	if (pct > 1) {
		setIOError("WBTOWeight_lbs", "Too heavy", {color:"red"});
	} else if (pct > .80) {
		setIOError("WBTOWeight_lbs", "Heavy");
	} else if (pct > .40) {
		setIOError("WBTOWeight_lbs", "Moderate");
	} else {
		setIOError("WBTOWeight_lbs", "Light");
	}
	if (pct > 1) {
		setIOError("WBRampWeight_lbs", "Too heavy", {color:"red"});	// If the TOW is too heavy so is the ramp weight
	}
	// Compute the moment and index of the CG.
	cg = moment / weight;
	setOutput("WBTOCG", cg);
	fwdLim = findCGLimit(getACData("WBFwdLimitNorm"), Math.min(weight, getACData("WBMaxTOWeight")));
	aftLim = findCGLimit(getACData("WBAftLimitNorm"), Math.min(weight, getACData("WBMaxTOWeight")));
	pct = (cg - fwdLim) / (aftLim - fwdLim);
	if (pct < 0) {
		setIOError("WBTOCG", "Too far forward", {color:"red"});
	} else if (pct > 1) {
		setIOError("WBTOCG", "Too far aft", {color:"red"});
	} else if (pct > .75) {
		setIOError("WBTOCG", "Aft");
	} else if (pct > .25) {
		setIOError("WBTOCG", "Middle");
	} else {
		setIOError("WBTOCG", "Forward");
	}
	// Compute the same things for zero fuel weight
	cg = zfMoment / zfWeight;
	setOutput("WBZFCG", cg);
	fwdLim = findCGLimit(getACData("WBFwdLimitNorm"), Math.min(zfWeight, getACData("WBMaxTOWeight")));
	aftLim = findCGLimit(getACData("WBAftLimitNorm"), Math.min(zfWeight, getACData("WBMaxTOWeight")));
	pct = (cg - fwdLim) / (aftLim - fwdLim);
	if (pct < 0) {
		setIOError("WBZFCG", "Too far forward", {color:"red"});
	} else if (pct > 1) {
		setIOError("WBZFCG", "Too far aft", {color:"red"});
	} else if (pct > .75) {
		setIOError("WBZFCG", "Aft");
	} else if (pct > .25) {
		setIOError("WBZFCG", "Middle");
	} else {
		setIOError("WBZFCG", "Forward");
	}
	// Compute the maximum fuel load.
	setOutput("WBMaxFuel_gal",
		Math.min(((getACData("WBMaxTOWeight") - zfWeight) / LBSPERGAL) + getACData("WBTaxiFuel"),
		fuelData.max)
	);
	// Compute the takeoff category.
	// Utility category must have rear seat and baggage areas empty.
	if (weight <= getACData("WBMaxUtilWeight")
		&& cg >= findCGLimit(getACData("WBFwdLimitUtil"), weight)
		&& cg <= findCGLimit(getACData("WBAftLimitUtil"), weight)
		&& getIO("WBRow2L_lbs") + getIO("WBRow2R_lbs") + getIO("WBBaggage1_lbs") + getIO("WBBaggage2_lbs") == 0
	) {
		setOutput("WBTOCategory", "Utility");
	} else if (weight <= getACData("WBMaxTOWeight")
		&& cg >= findCGLimit(getACData("WBFwdLimitNorm"), weight)
		&& cg <= findCGLimit(getACData("WBAftLimitNorm"), weight)
	) {
		setOutput("WBTOCategory", "Normal");
	}
	// copy the fuel to destination
	computePage("Enrt");					// recalculate fuel usage based on TO weight
	fuelToDest = getIO("EnrtFuelToDest_gal");
	// Get the fuel used either from the WB page input or from the computed fuel usage.
	if (getIO("WBEnrtFuelToDest")) {
		fuelUsed = fuelToDest;
	} else {
		fuelUsed = getIO("WBFuelUsed_gal");
		if (isValid(fuelUsed)) {
			if (fuelUsed > fuel) {				// Too large
				fuelUsed = INVALID;
				setIOError("WBFuelUsed_gal", "> fuel");
			} else if (isValid(fuelToDest) && fuelUsed < fuelToDest) {
				setIOError("WBFuelUsed_gal", "< fuel to destination");
			}
		}
	}
	// Compute the landing weight. Indicate whether the load is light, moderate or heavy.
	if (isValid(fuelUsed) && fuelUsed > 0) {
		value = (fuel - fuelUsed - getACData("WBTaxiFuel")) * LBSPERGAL;
		weight = roundUp(zfWeight + value);			// Landing weight
		moment = zfMoment + value * fuelData.arm;	// Landing moment
		setOutput("WBLdgWeight_lbs", weight);
		pct = (weight - bew) / (getACData("WBMaxLdgWeight") - bew);
		if (pct > 1) {
			setIOError("WBLdgWeight_lbs", "Too heavy", {color:"red"});
		} else if (pct > .80) {
			setIOError("WBLdgWeight_lbs", "Heavy");
		} else if (pct > .40) {
			setIOError("WBLdgWeight_lbs", "Moderate");
		} else {
			setIOError("WBLdgWeight_lbs", "Light");
		}
		// Compute the landing CG. Indicate whether the load is forward, middle, or aft.
		cg = moment / weight;
		setOutput("WBLdgCG", cg);
		fwdLim = findCGLimit(getACData("WBFwdLimitNorm"), Math.min(weight, getACData("WBMaxTOWeight")));
		aftLim = findCGLimit(getACData("WBAftLimitNorm"), Math.min(weight, getACData("WBMaxTOWeight")));
		pct = (cg - fwdLim) / (aftLim - fwdLim);
		if (pct < 0) {
			setIOError("WBLdgCG", "Too far forward", {color:"red"});
		} else if (pct > 1) {
			setIOError("WBLdgCG", "Too far aft", {color:"red"});
		} else if (pct > .75) {
			setIOError("WBLdgCG", "Aft");
		} else if (pct > .25) {
			setIOError("WBLdgCG", "Middle");
		} else {
			setIOError("WBLdgCG", "Forward");
		}
		// Compute the landing category
		if (weight <= getACData("WBMaxUtilWeight")
			&& cg >= findCGLimit(getACData("WBFwdLimitUtil"), weight)
			&& cg <= findCGLimit(getACData("WBAftLimitUtil"), weight)
		) {
			setOutput("WBLdgCategory", "Utility");
		} else if (weight <= getACData("WBMaxTOWeight")
			&& cg >= findCGLimit(getACData("WBFwdLimitNorm"), weight)
			&& cg <= findCGLimit(getACData("WBAftLimitNorm"), weight)
		) {
			setOutput("WBLdgCategory", "Normal");
		}
	}
	// Draw the WB diagram.
	drawWB(getIO("WBTOCG"), getIO("WBTOWeight_lbs"), getIO("WBLdgCG"),
		getIO("WBLdgWeight_lbs"), getIO("WBZFCG"), getIO("WBZFWeight_lbs")
	);
}

/*
 * Draw the weight and balance diagram.
 * Only works if HTML5 canvas is supported.
 */
function drawWB (toCG, toWeight, ldgCG, ldgWeight, zfCG, zfWeight) {
	var canvas = getElt("WBCanvas");		// WB canvas
	var bew = getIO("ACBEW_lbs");			// aircraft BEW
	var maxtow = getACData("WBMaxTOWeight");	// aircraft MAXTOW
	var lo = bew - 100;						// the weight that represents the bottom of the canvas
	var hi = maxtow + 100;					// the weight that represents the top of the canvas
	var left = 33;							// the arm that represents the left side of the canvas
	var right = 52;							// the arm that represents the right side of the canvas
	var dashSize = 10;						// size of a dash and space in a dashed line in pixels
	var barX = canvas.width - 30;			// The X pixel location of the paylod/fuel bar
	var limits;
	var x, y;
	var ctx;								// WB drawing context
	var w, a, i;
	var pct, fwdLim, aftLim;
	var scaleWeight = function (w) {		// convert weight to a canvas Y pixel value
		w = Math.min(Math.max(w, lo), hi);
		return (canvas.height * (1 - (w - lo)/(hi - lo)));
	};
	var scaleArm = function (a) {			// convert arm to a canvas X pixel value
		a = Math.min(Math.max(a, left), right);
		return (canvas.width * (a - left)/(right - left));
	};
        
        if (isACModel("150M")){
            left=30;
            right=41;
        }

	// Get the drawing context, if supported and clear the canvas.
	if (canvas.getContext == undefined) {
		//canvas.innerHTML = "Please use a browser that supports HTML5 (IE9, Safari, Firefox, Chrome)";
		return;
	}
	ctx = canvas.getContext("2d");
	// Fix for Android clearRect bug
	if (gDev.platform == "Android" && gDev.phoneGap) {
		var tmp = canvas.width;
		canvas.width = 1;
		canvas.width = tmp;
	}
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.font = "bold 10pt sans-serif";
	// Draw a grid
	ctx.save();
	ctx.strokeStyle = "LightGrey";
	ctx.lineWidth = 1;
	ctx.beginPath();
	for (w = roundUpMult(lo + 50, 500); w < hi; w += 500) {
		ctx.moveTo(0, scaleWeight(w));
		ctx.lineTo(canvas.width, scaleWeight(w));
	}
	for (a = left + 5; a < right; a += 5) {
		ctx.moveTo(scaleArm(a), 0);
		ctx.lineTo(scaleArm(a), canvas.height);
	}
	ctx.stroke();
	ctx.restore();
	// Draw the outline of the W&B envelope.
	ctx.save();
	ctx.strokeStyle = "black";
	ctx.lineWidth = 1;
	ctx.beginPath();
	limits = getACData("WBFwdLimitNorm");
	for (i = 0; i < limits.length; i++) {
		if (i == 0) {
			ctx.moveTo(scaleArm(findCGLimit(getACData("WBFwdLimitNorm"), bew)), scaleWeight(bew));
		} else if (limits[i].weight > bew) {
			ctx.lineTo(scaleArm(limits[i].stn), scaleWeight(limits[i].weight));
		}
	}
	limits = getACData("WBAftLimitNorm");
	for (i = limits.length - 1; i >= 0; i--) {
		if (limits[i].weight <= bew) {
			ctx.lineTo(scaleArm(findCGLimit(getACData("WBAftLimitNorm"), bew)), scaleWeight(bew));
			break;
		}
		ctx.lineTo(scaleArm(limits[i].stn), scaleWeight(limits[i].weight));
	}
	ctx.closePath();
	ctx.stroke();
	// Draw the Utility diagram.
	ctx.beginPath();
	limits = getACData("WBFwdLimitUtil");
	for (i = 0; i < limits.length; i++) {
		if (i == 0) {
			ctx.moveTo(scaleArm(findCGLimit(getACData("WBFwdLimitUtil"), bew)), scaleWeight(bew));
		} else if (limits[i].weight > bew) {
			ctx.lineTo(scaleArm(limits[i].stn), scaleWeight(limits[i].weight));
		}
	}
	limits = getACData("WBAftLimitUtil");
	for (i = limits.length - 1; i >= 0; i--) {
		if (limits[i].weight <= bew) {
			ctx.lineTo(scaleArm(findCGLimit(getACData("WBAftLimitUtil"), bew)), scaleWeight(bew));
			break;
		}
		ctx.lineTo(scaleArm(limits[i].stn), scaleWeight(limits[i].weight));
	}
	ctx.closePath();
	ctx.fillStyle = "LightGrey";
	ctx.fill()
	ctx.stroke();
	x = (scaleArm(findCGLimit(getACData("WBFwdLimitUtil"), bew)) + scaleArm(findCGLimit(getACData("WBAftLimitUtil"), bew))) / 2;
	y = scaleWeight(bew);
	ctx.textBaseline = "bottom";
	ctx.textAlign = "center";
	ctx.fillStyle = "white";
	ctx.fillText("Utility", x, y - 2);
	ctx.restore();
	// Draw forward and aft labels with arrows.
	ctx.save();
	ctx.strokeStyle = "black";
	ctx.fillStyle = "black";
	ctx.beginPath();
	y = (canvas.height + scaleWeight(bew)) / 2;
	ctx.textBaseline = "middle";
	ctx.textAlign = "left";
	x = canvas.width * .2;
	ctx.fillText("Fwd", x, y);
	drawArrow(ctx, x - 2, y, Math.PI, 10, 8);
	ctx.textAlign = "right";
	x = canvas.width * .65;
	ctx.fillText("Aft", x, y);
	drawArrow(ctx, x + 2, y, 0, 10, 8);
	ctx.restore();
	// Check that the weights are valid
	if (!isValid(toCG) || !isValid(toWeight) || !isValid(zfCG) || !isValid(zfWeight)) {
		return;
	}
	// Draw the takoff and landing W&B points connected by a blue line.
	// The circles at the ends are red if outside of the POH restrictions.
	// They are yellow if it's "near" the edge of the envelope and green otherwise.
	// See the Help page for the defintions of "near the edge".
	ctx.save();
	// Draw a blue line first so the circles at the end overlay it
	ctx.strokeStyle = "blue";
	ctx.lineWidth = 3;
	if (isValid(ldgWeight) && isValid(ldgCG)) {
		ctx.beginPath();
		ctx.moveTo(scaleArm(toCG), scaleWeight(toWeight));
		ctx.lineTo(scaleArm(ldgCG), scaleWeight(ldgWeight));
		ctx.stroke();
	}
	// Draw a dotted line from the landing point to the zero-fuel weight point.
	if (isValid(ldgWeight) && isValid(ldgCG)) {
		drawDottedLineTo(ctx, scaleArm(ldgCG), scaleWeight(ldgWeight), scaleArm(zfCG), scaleWeight(zfWeight));
	} else {
		drawDottedLineTo(ctx, scaleArm(toCG), scaleWeight(toWeight), scaleArm(zfCG), scaleWeight(zfWeight));
	}
	// Draw a circle around the takeoff point
	fwdLim = findCGLimit(getACData("WBFwdLimitNorm"), toWeight);
	aftLim = findCGLimit(getACData("WBAftLimitNorm"), toWeight);
	// Set the color appropriately
	if (toWeight <= getACData("WBMaxTOWeight") && toCG >= fwdLim && toCG <= aftLim) {
		pct = (toWeight - bew) / (getACData("WBMaxTOWeight") - bew);
		if (pct <= .8) {
			pct = (toCG - fwdLim) / (aftLim - fwdLim);
			if (pct >= .25 && pct <= .75) {
				ctx.fillStyle = "green";
			} else {
				ctx.fillStyle = "yellow";
			}
		} else {
			ctx.fillStyle = "yellow";
		}
	} else {
		ctx.fillStyle = "red";
	}
	// Draw the circle
	ctx.beginPath();
	ctx.arc(scaleArm(toCG), scaleWeight(toWeight), 4, 0, Math.PI*2, true);
	ctx.fill();
	// Draw a circle around the landing point
	if (isValid(ldgWeight) && isValid(ldgCG)) {
		fwdLim = findCGLimit(getACData("WBFwdLimitNorm"), ldgWeight);
		aftLim = findCGLimit(getACData("WBAftLimitNorm"), ldgWeight);
		// Set the color appropriately
		if (ldgWeight <= getACData("WBMaxLdgWeight") && ldgCG >= fwdLim && ldgCG <= aftLim) {
			pct = (ldgWeight - bew) / (getACData("WBMaxLdgWeight") - bew);
			if (pct <= .8) {
				pct = (ldgCG - fwdLim) / (aftLim - fwdLim);
				if (pct >= .25 && pct <= .75) {
					ctx.fillStyle = "green";
				} else {
					ctx.fillStyle = "yellow";
				}
			} else {
				ctx.fillStyle = "yellow";
			}
		} else {
			ctx.fillStyle = "red";
		}
		// Draw the circle
		ctx.beginPath();
		ctx.arc(scaleArm(ldgCG), scaleWeight(ldgWeight), 4, 0, Math.PI*2, true);
		ctx.fill();
	}
	ctx.restore();
	// Draw payload/fuel bar
	ctx.save();
	// draw the fuel bar
	ctx.beginPath();
	ctx.textAlign = "center";
	ctx.fillStyle = "blue";		// fuel
	ctx.fillRect(barX - 5, scaleWeight(toWeight), 10, scaleWeight(zfWeight) - scaleWeight(toWeight));
	// add the "Fuel" label at the top
	ctx.textBaseline = "bottom";
	ctx.fillText("Fuel", barX, scaleWeight(toWeight) - 3);
	// draw the payload bar
	ctx.beginPath();
	ctx.fillStyle = "green";	// payload
	ctx.fillRect(barX - 5, scaleWeight(zfWeight), 10, scaleWeight(bew) - scaleWeight(zfWeight));
	// Add the "Payload" label at the bottom
	ctx.textBaseline = "middle";
	ctx.fillText("Payload", barX, (canvas.height + scaleWeight(bew)) / 2);
	ctx.restore();
}

/*
 * Mail W&B info.
 */
function mailWB (type) {
	var to = getIO("SetEmail");
	var subject = "Weight and Balance Results";
	var content;
	var url;
        var d= new Date();
        
        if (type=="WP"){
            content = "WEIGHT AND BALANCE\n\n";
            content+= "Units: LBS\n";
            content+= "Date "+d.toLocaleDateString();
            content+= "\t\t\tReg "+getIO("SelectedAC")+"\n\n";
            
            content+= "Trip "+getIO("SelectedTrip")+"\n\n";
            
            content+= "Max TakeOff Weight\t\t\t"+getACData("WBMaxTOWeight")+" lbs.\n";
            content+= "Basic Empty Weight\t\t\t"+getACData("WBBEWeight").weight+" lbs.\n";
            content+= "Pilots Weight\t\t\t\t\t"+ (parseInt(getIO("WBRow1L_lbs"))+parseInt(getIO("WBRow1R_lbs")))+" lbs.\n";
            content+= "Passenger Weight\t\t\t\t"+ (parseInt(getIO("WBRow2L_lbs"))+parseInt(getIO("WBRow2R_lbs")))+" lbs.\n";
            content+= "Fuel Weight\t\t\t\t\t"+ (parseInt(getIO("WBFuel_gal"))*6)+" lbs.\n";
            content+= "Cargo & Bagg Weight\t\t\t"+ (parseInt(getIO("WBBaggage1_lbs"))+parseInt(getIO("WBBaggage2_lbs")))+" lbs.\n\n";
            
            content+= "Actual TakeOff Weight\t\t\t"+getIO("WBTOWeight_lbs")+" lbs.\n";
            content+= "Under Load\t\t\t\t\t"+(parseInt(getACData("WBMaxTOWeight"))-parseInt(getIO("WBTOWeight_lbs")))+" lbs.\n\n";
            
            
            
            
        }
        else if (type==undefined){
            // Send fuel data
            if (getIO("SetFuelUnits") == "gal") {
                    content = "Fuel = "+getIO("WBFuel_gal")+" gal.\n";
                    content += "Fuel Used = "+getIO("WBFuelUsed_gal")+" gal.\n";
            } else {
                    content = "Fuel = "+getIO("WBFuel_l")+" l.\n";
                    content += "Fuel Used = "+getIO("WBFuelUsed_l")+" l.\n";
            }
            // Send W&B data
            if (getIO("SetWeightUnits") == "lbs") {
                    content += "Row 1 Left = "+getIO("WBRow1L_lbs")+" lbs.\n";
                    content += "Row 1 Right = "+getIO("WBRow1R_lbs")+" lbs.\n";
                    content += "Row 2 Left = "+getIO("WBRow2L_lbs")+" lbs.\n";
                    content += "Row 2 Right = "+getIO("WBRow2R_lbs")+" lbs.\n";
                    content += "Rear baggage area 1 = "+getIO("WBBaggage1_lbs")+" lbs.\n";
                    content += "Rear baggage area 2 = "+getIO("WBBaggage2_lbs")+" lbs.\n";
                    content += "\n";
                    content += "Takeoff weight = "+getIO("WBTOWeight_lbs")+" lbs.\n";
                    content += "Takeoff CG = "+getIO("WBTOCG")+"in\n";
                    content += "Landing weight = "+getIO("WBLdgWeight_lbs")+" lbs.\n";
                    content += "Landing CG = "+getIO("WBLdgCG")+"in\n";
            } else {
                    content += "Row 1 Left = "+getIO("WBRow1L_kg")+" kg.\n";
                    content += "Row 1 Right = "+getIO("WBRow1R_kg")+" kg.\n";
                    content += "Row 2 Left = "+getIO("WBRow2L_kg")+" kg.\n";
                    content += "Row 2 Right = "+getIO("WBRow2R_kg")+" kg.\n";
                    content += "Rear baggage area 1 = "+getIO("WBBaggage1_kg")+" kg.\n";
                    content += "Rear baggage area 2 = "+getIO("WBBaggage2_kg")+" kg.\n";
                    content += "\n";
                    content += "Takeoff weight = "+getIO("WBTOWeight_kg")+" kg.\n";
                    content += "Takeoff CG = "+getIO("WBTOCG")+"in\n";
                    content += "Landing weight = "+getIO("WBLdgWeight_kg")+" kg.\n";
                    content += "Landing CG = "+getIO("WBLdgCG")+"in\n";
            }
        }
	// build the url
	url = "mailto:";
	url += to+"?";
	url += "Subject="+encodeURIComponent(subject);
	url += "&body="+encodeURIComponent(content);
	// send email
	location.href = url;
}

/*
 * Compute departure results
 */
function computeDeparture () {
	var weight;
	var arpt, rwy, rwys, rwyID, cond;
	var wind;
	var roc;
	var oat, isa, pa;
	var distance;
	var Vx, Vy, Vr, Vrshort, behw;
	var i;
	var statVar = computeDeparture;		// static variables

	setAirportIO("Dep");	// setup airport fields
	// Compute values used for main computations.
	oat = getIO("DepOAT");
	setOutput("DepTempF", (isValid(oat)? degCToF(oat): INVALID_NULL));
	pa = pressureAlt(getIO("DepAlt"), getIO("DepAltimeter_inhg"));
	isa = stdTempDiff(pa, oat);
	pa = Math.max(pa, 0);
	setOutput("DepTempISA", (isValid(isa)? isa: INVALID_NULL));
	setOutput("DepDA", densityAlt(pa , oat));
	cond = getIO("DepRwyCond");
	weight = getIO("WBTOWeight_lbs");
	arpt = getIO("DepArpt");
	rwyID = getIO("DepRwy");
	// Check validity of main inputs
	if (!isValidIO("DepRwyLength_ft", "DepWind", weight, oat, pa, "DepSlope")) {
		setOutput("DepRoll_ft", INVALID_INPUT);
		rwyID = (rwyID == "Best"? null: rwyID);
		drawRunwayWind("DepCanvas", rwyID, null, 0, 0, 0, "");
		return;
	}
	// Compute the V speeds
	Vx = round(interpolateTable("Vx", weight));
	setPOHOutput("DepVx", Vx);
	Vy = round(interpolateTable("Vy", weight));
	setPOHOutput("DepVy", Vy);
	Vrshort = round(interpolateTable("TOVr", weight));
	setPOHOutput("DepVr", Vrshort, null, "TOVr");
	Vr = 55;			// use normal takeoff speed for the rest of the computations
	// We use the fixed MAXTOW stall speed since we have no IAS-CAS information below it.
	// We use the weight adjusted 1.3*Vs since that can be displayed accurately, but that
	// means that 1.3*Vs is less than 1.3 times the displayed Vs.
	setOutput("DepVs10", stallIas("10"));	// TO flaps
	setOutput("Dep13Vs10", stallIas13(weight, "10"));
	setOutput("DepVs", stallIas("0"));		// no flaps
	setOutput("Dep13Vs", stallIas13(weight, "0"));
	// Adjust Va for weight
	setPOHOutput("DepVa", interpolateTable("Va", weight));
	// Set wind object
	wind = new Wind(getIO("DepWindDir"), getIO("DepWind"));
	// If there's an airport and the user selected "Best" as the runway option, setup runways.
	// Otherwise just setup one runway from the input.
	if (arpt) {
		rwys = getRunwayData(arpt);
	}
	if (!arpt || !rwys) {
		rwy = {}
		rwy.rwyID = rwyID;
		rwy.rwyLength = getIO("DepRwyLength_ft");
		rwy.slope = getIO("DepSlope");
		rwys = [rwy];
	}
	// Compute the headwind, crosswind, roll, and roll with safety factor.
	for (i = 0; i < rwys.length; i++) {
		rwy = rwys[i];
		rwy.hwind = wind.rwyHeadwind(rwy.rwyID);
		rwy.xwind = wind.rwyCrosswind(rwy.rwyID);
		rwy.roll = takeoffDistance("TORoll", cond, rwy.slope, weight, isa, pa, rwy.hwind, Vr);
		rwy.roll = roundUp(rwy.roll);
		// add saftey factor, round to next 100'
		rwy.safeRoll = roundUp(rwy.roll * (1 + getIO("SetTOSafety") / 100), -2);
		rwy.safeRoll = Math.max(rwy.safeRoll, rwy.roll + 200);	// ensure safety factor >=200'
		rwy.safe = isValid(rwy.safeRoll)
			&& rwy.safeRoll <= rwy.rwyLength
			&& rwy.xwind <= getACData("MaxXWind");
	}
	if (rwys.length > 1) {
		// Sort the runways from "best" to "worst".
		// Select the first runway (the "best") and setup it's parameters in the input.
		rwys.sort(sortBestRunway);
		rwy = rwys[0];
		setOutput("DepBestRwy", rwy.rwyID);
		showRow("DepBestRwy", true);
		if (rwyID != "Best") {
			rwy = null;
			for (i = 0; i < rwys.length; i++) {
				if (rwys[i].rwyID == rwyID) {
					rwy = rwys[i];
					break;
				}
			}
			assert(rwy, "computeDeparture: Can't find runway: "+rwyID);
		}
		// set length and slope and disable editing
		setupInput("DepRwyLength_ft", rwy.rwyLength);
		setupInput("DepSlope", rwy.slope);
		getElt(getCurrentUnitsID("DepRwyLength_ft")).disabled = true;
		getElt("DepSlope").disabled = true;
	} else {
		setOutput("DepBestRwy", "-");
		showRow("DepBestRwy", false);
		getElt(getCurrentUnitsID("DepRwyLength_ft")).disabled = false;
		getElt("DepSlope").disabled = false;
	}
	// Set the computed roll and safe runway for the selected runway.
	setPOHOutput("DepRoll_ft", rwy.roll, null, "TORoll");
	setOutput("DepSafeRunway_ft", rwy.safeRoll);
	// Set head/cross wind. Warn about too strong crosswind.
	setOutput("DepHeadwind", rwy.hwind);
	setOutput("DepCrosswind", Math.abs(rwy.xwind));
	setOutput("DepCrosswindDir", (rwy.xwind == 0? "": (rwy.xwind < 0? "from left": "from right")));
	if (Math.abs(rwy.xwind) > getACData("MaxXWind")) {
		setIOError("DepCrosswind", "&gt; max. crosswind");
	}
	// Compute the obstacle clearance distance.
	rwy.obstacle = takeoffDistance("TOObstacle", cond, rwy.slope, weight, isa, pa, rwy.hwind, Vr);
	setPOHOutput("DepObstacle_ft", rwy.obstacle);
	rwy.obstacle = roundUp(rwy.obstacle);
	rwy.safeObstacle = rwy.obstacle * (1 + getIO("SetTOSafety") / 100);
	setOutput("DepSafeObstacle_ft", rwy.safeObstacle);
	// Compute runway left and warnings
	if (isValid(rwy.rwyLength)) {
		if (isValid(rwy.roll) && rwy.rwyLength > 0) {
			distance = round(rwy.rwyLength - rwy.roll);
			if (!isValid(rwy.safeRoll) || rwy.rwyLength >= rwy.safeRoll) {
				setOutput("DepRunwayLeft_ft", distance);
			} else {
				setOutput("DepRunwayLeft_ft", distance,
					distance <= 200? {color: "red"}: {backgroundColor: "yellow"});
				setIOError("DepRwyLength_ft", "< safe runway");
			}
			if (isValid(rwy.obstacle)) {
				if (rwy.safeObstacle > rwy.rwyLength) {
					setOutput("DepObstacleDist_ft", rwy.safeObstacle - rwy.rwyLength);
				}
				showRow("DepObstacleDist_ft", rwy.safeObstacle > rwy.rwyLength);
			}
		}
	} else {
		setOutput("DepRunwayLeft_ft", INVALID_INPUT);
	}
	// Compute the accelerate-stop distance: Takeoff roll + landing roll + 3 sec @ Vr.
	// Use "landing flaps" to compute landing roll since Vthresh in that configuration is close to Vr.
	// If there's an error, the distance variable converts to NaN.
	distance = landingDistance("LdgRoll", cond, rwy.slope, weight, oat, pa, rwy.hwind, "landing flaps");
	distance += rwy.roll + (3 * Vr * FTPERNM / 3600);
	setOutput("DepAcStop_ft", distance);
	// Compute the "break even headwind": If the upslope runway has a headwind greater than
	// this value, take off upslope. Otherwise takeoff downslope even with a tailwind.
	// We limit ourselves to at most 10kt of tailwind.
	if (rwy.slope != 0) {
		var distUp, distDown;
		// Find the wind, behw, where taking off upslope with a behw headwind is shorter than
		// taking off downslope with a behw tailwind.
		for (behw = 1; behw < 10; behw++) {
			distUp = takeoffDistance("TORoll", cond, Math.abs(rwy.slope), weight, isa, pa, behw, Vr);
			distDown = takeoffDistance("TORoll", cond, -Math.abs(rwy.slope), weight, isa, pa, -behw, Vr);
			if (!isValid(distUp, distDown)) {
				behw = INVALID_NULL;		// just display "-" on error
				break;
			}
			if (distUp < distDown) {
				break;
			}
		}
	} else {
		behw = 0;
	}
	setOutput("DepBEWind", behw);
	drawRunwayWind("DepCanvas", rwy.rwyID, wind, rwy.rwyLength, rwy.roll, rwy.safeRoll,
		(isValid(Vrshort, Vx, Vy, rwy.safeRoll)
			? "Vrshort: "+Vrshort+";Vx: "+Vx+";Vy: "+Vy+";Safe rwy: "+fmtNum(rwy.safeRoll)+" ft."
			: "")
		+(arpt == ""
			? ""
			: ";"+arpt+" "+rwy.rwyID+": "+fmtNum(rwy.rwyLength)+" ft.")
	);
}
/*
 * Mail W&B info.
 */
function mailCheck () {
	var to = getIO("SetEmail");
	var subject = "Enroute Checkpoint "+getIO("SelectedCheck")+ " Overview";
	var content,contentcheck="";
	var url;
        
        /**
        * @param {*}       str                         input string, or any other type (will be converted to string)
        * @param {number}  length                      desired length to pad the string to
        * @param {Object}  [opts]
        * @param {string}  [opts.padWith=" "]          char to use for padding
        * @param {boolean} [opts.padLeft=false]        whether to pad on the left
        * @param {boolean} [opts.collapseEmpty=false]  whether to return an empty string if the input was empty
        * @returns {string}
        */
       function pad ( str, length, opts ) {
           var padding = ( new Array( Math.max( length - ( str + "" ).length + 1, 0 ) ) ).join( opts && opts.padWith || " " ),
               collapse = opts && opts.collapseEmpty && !( str + "" ).length;
           return collapse ? "" : opts && opts.padLeft ? padding + str : str + padding;
       }
               
        content = "Block Start: "+getIO("CheckBStart")+ "\t\tTake Off: "+getIO("CheckTakeOff")+"\t\tBlock End: "+getIO("CheckBEnd")+"\n\n";
        contentcheck = "CHECKPOINTS\t\t\tHDG"+"\tDIST\tG/S\t\tE T E\tE T A\t\tA T A\tFUEL USED\tFUEL REM.\n\n";
        
        for (i=1;i<=CHKROWS;i++){
            if (getIO("CheckDist"+i)!="0" && getIO("CheckKIAS"+i)!="0"){
                contentcheck +=  getIO("CheckPoint"+i)+"\t\t\t\t";
                contentcheck +=  pad(getIO("CheckCompHead"+i),3,{ padWith: "0", padLeft: true })+"\t\t";
                contentcheck +=  getIO("CheckDist"+i)+"\t\t";
                contentcheck +=  getIO("CheckKIAS"+i)+"\t\t";
                contentcheck +=  pad(getIO("CheckETE"+i),2,{ padWith: "0", padLeft: true })+"\t\t";
                contentcheck +=  fmtTime(roundZTime(getIO("CheckETA"+i)))+"\t\t";
                contentcheck +=  pad(getIO("CheckATA"+i),4,{ padWith: "-", padLeft: false })+"\t\t";
                contentcheck +=  getIO("CheckFuel"+i)+"\t\t";
                contentcheck +=  getIO("CheckFuelRem"+i)+"\n";
            }
        }
        
        contentcheck+="\n\nTOTALS\t\t\t\t\t"+getIO("CheckTotalDist")+"\t\t\t\t\t\t"+fmtTime(roundZTime(getIO("CheckTotalETE")))+"\t"+fmtTime(roundZTime(getIO("CheckTotalATA")))+"\t\t\t\t\t"+getIO("CheckTotalFuelUsd")+"\t\t"+getIO("CheckTotalFuelRem")+"\n\n";
        
	// build the url
	url = "mailto:";
	url += to+"?";
	url += "Subject="+encodeURIComponent(subject);
	url += "&body="+encodeURIComponent(content+contentcheck);
	// send email
	location.href = url;
}
/*
 * Compute computeCheckpoints.
 */
function computeCheckpoints(){
	
	var TakeOff,CheckATA,tmpTime,tmpTime1,FuelClimb;
        var DistClimb,FuelFlowCruise,TimeClimb,ClimbRem;
        var CruiseAlt,DestAlt,IAFAlt;
        var CheckDist,CheckGS;
        var selectedCheck = getIO("SelectedCheck");
        var version = "v.1.0.2";
        
        
	TripDist=0,TripETE=0,TripETEFuel=0,TripFuel=0;
	CheckETE=0,CheckETA=0,CheckFuel=0,tmpDist=0,TotalFuel=0,TotalETE=0,TotalATA=0;
        TODDist=0,TODETE=0,TODFuelUsed=0,TODGS=0;
        
        var calcPlannedTimeFuel =function (i){
            
            //Time calculations

            CheckDist = getIO("CheckDist"+i);
            CheckGS = getIO("CheckKIAS"+i);
            

            if (CheckDist!=0 && CheckGS!=0){
                
                TODGS = CheckGS;
                CheckETE = round(CheckDist/(CheckGS/60));
                TotalETE+=CheckETE;
                setOutput("CheckETE"+i,CheckETE);
            
            
                if (CheckDist>0) {
                    if (ClimbRem){
                        DistClimb-=CheckDist;
                        if (DistClimb<0){
                            ClimbRem=false;
                        }
                    }
                }

                //Fuel calculations
                if (ClimbRem){
                    CheckFuel = CheckETE*FuelClimb/TimeClimb;
                }
                else{
                    if (DistClimb<0){
                        tmpETE = DistClimb*(-1)/(CheckGS/60);
                        CheckFuel = tmpETE*FuelFlowCruise/60;
                        tmpDist = CheckDist + DistClimb;
                        tmpETE = tmpDist/(CheckGS/60);
                        CheckFuel += (tmpETE*FuelClimb/TimeClimb);
                        DistClimb = 0;
                    }
                    else {
                        CheckFuel = CheckETE*FuelFlowCruise/60;
                    }
                }
                CheckFuel = round(CheckFuel,1);    
                TripFuel+=CheckFuel;
                TotalFuel-=CheckFuel;

                //Set fuel 
                setOutput("CheckFuel"+i,CheckFuel);
                setOutput("CheckFuelRem"+i,TotalFuel);
            }
                
        };
        
	var CalculateETA =function (tmp,i){
            
            if (CheckDist!=0 && CheckGS!=0 && tmp!=null) {                    
                    TripETE+=CheckETE;    
                    CheckETA = (parseInt(tmp[0])*60) +parseInt(tmp[1])+TripETE;
                    setOutput("CheckETA"+i,CheckETA);
            }
	};
        
        var ShowCheckRows=function (i){
            
            for (j=1;j<=CHKROWS;j++) {
                if (getIO("CheckDist"+j)!=0 && getIO("CheckKIAS"+j)!=0){

                    CheckLastRow=j+1;

                    if (CheckLastRow>CHKROWS){
                        CheckLastRow=CHKROWS;                    
                    }
                } 
            }
            
            if (i==1){
                showRow("rowCheckpoint"+i, true);
            }
            else if (i>1){
                if (CheckDist!=0 && CheckGS!=0){
                    showRow("rowCheckpoint"+CheckLastRow, true);
                }
                else {
                    if (i!=CheckLastRow){
                        SetCheckUTCTime(ATA+i,false);
                    }
                    if (i>CheckLastRow && i>1){
                        showRow("rowCheckpoint"+i, false);
                    }
                }
            }
        };
        
	computeCheck();
        
        TakeOff = getIO("CheckTakeOff");        
	TotalFuel = getIO("WBFuel_gal");
	FuelClimb = getIO("EnrtClimbFuel_gal");
   	DistClimb = getIO("EnrtClimbDist");
   	FuelFlowCruise = getIO("EnrtGPH");
        TimeClimb = getIO("EnrtClimbTime");
        CruiseAlt = getIO("EnrtAltH");
        DestAlt = getIO("DestAlt");
        
        ClimbRem = true;
        
	for (i=1;i<=CHKROWS;i++) {
            
                //sumarize total trip distance
                TripDist +=	getIO("CheckDist"+i);
                
                calcPlannedTimeFuel(i);
                
		if (i==1) {
			if (TakeOff!="") {
				tmpTime = TakeOff.split(":");
				CalculateETA(tmpTime,i);
			}
		}
		else{
			var prevrow = i-1;
			CheckATA = getIO("CheckATA"+prevrow);
			if (CheckATA!="") {
                                tmpTime1 = tmpTime;
				tmpTime = CheckATA.split(":");
				TripETE =0;
                                if (tmpTime!=null && tmpTime1!=null){
                                    TotalATA += ((parseInt(tmpTime[0])*60) +parseInt(tmpTime[1])) - ((parseInt(tmpTime1[0])*60) +parseInt(tmpTime1[1]));
                                }	
                                CalculateETA(tmpTime,i);
			}
			else{
				CalculateETA(tmpTime,i);
				
			}
			
		}
                //Set Totals
                setOutput("CheckTotalDist",TripDist);
                setOutput("CheckTotalETE",TotalETE);
                setOutput("CheckTotalATA",TotalATA);
                setOutput("CheckTotalFuelUsd",TripFuel);
                setOutput("CheckTotalFuelRem",TotalFuel);
                ShowCheckRows(i);
                
	}
    //Set TOC, Cruise, TOD
    if (getIO("CheckIAF")) {
        IAFAlt = getIO("CheckIAFAlt")*100;
	}
    else{
        IAFAlt = DestAlt+1000;
    }
        
    TODETE = ((CruiseAlt*100)-(IAFAlt))/500;
    TODDist = TODETE*(TODGS/60);
    TODFuelUsed = TODETE*FuelFlowCruise/60;
    setOutput("CheckTODDist",TODDist);
    setOutput("CheckTODKias",TODGS);
    setOutput("CheckTODETE",TODETE);
    setOutput("CheckTODFuelUsd",TODFuelUsed);
    setOutput("CheckVersion",version);    
    
    if (TripDist>getIO("EnrtMaxRange")){
        setOutput("CheckTotalDist",INVALID_INPUT);
    }
    if (TotalETE>getIO("EnrtEndurance")){
        setOutput("CheckTotalETE",INVALID_INPUT);
    }
    if (TripFuel>getIO("WBFuel_gal")){
        setOutput("CheckTotalFuelUsd",INVALID_INPUT);
        setOutput("CheckTotalFuelRem",INVALID_INPUT);
    }    
        
    if (selectedCheck != "[Current]"){
        if(CheckLastRow>1 && (getIO("CheckDist"+CheckLastRow) == "0" || getIO("CheckKIAS"+CheckLastRow) == "0")&& !gIO.checkEditable){
            showRow("rowCheckpoint"+CheckLastRow, false);
        }
    }
}

/*
 * Compute cruise results.
 */
function computeEnroute () {
	var weight;
	var isa, oat;
	var deppa, climbfuel, climbdist, climbtime;
	var cruisepa, cruiseisa, cruiseoat, cruisetas, cruisefuel, cruisegph, cruiserpm;
	var destpa;
	var altpa, alttas, resvfuel, altgph, altrpm;
	var altdist;
	var dist, destdist;
	var fuel, range, endurance, fuelUsed, time;
	var wind = (getIO("EnrtWindDir") == "tailwind"? getIO("EnrtWind"): -getIO("EnrtWind"));
	var tempType = getIO("EnrtTempType");

	// Compute departure and destination pressure altitudes
	deppa = Math.max(0, pressureAlt(getIO("DepAlt"), getIO("DepAltimeter_inhg")));
	destpa = Math.max(0, pressureAlt(getIO("DestAlt"), getIO("DestAltimeter_inhg")));
	cruisepa = cruisePA();
	if (cruisepa <= deppa) {
		setIOError("EnrtAltH", "<= departure altitude");
		cruisepa = INVALID;
	} else if (cruisepa <= destpa) {
		setIOError("EnrtAltH", "<= destination altitude");
		cruisepa = INVALID;
	}
	// Compute and check destination distance
	dist = getIO("EnrtDist");		// route distance
	setAirportDistance("EnrtDestDist", "DepArpt", "DestArpt");
	destdist = getIO("EnrtDestDist");
	if (isValid(destdist)) {
		if (dist > destdist * 1.2) {
			setIOError("EnrtDist", "Route distance may be excessive");
		} else if (dist < destdist) {
			setIOError("EnrtDist", "Route distance less than dest. distance");
		}
	}
	weight = getIO("WBTOWeight_lbs");
	// Compute OAT and ISA from the temperature type.
	// Change the other type(s) to keep all in sync, but use default if primary is invalid
	switch (tempType) {
	case "OAT":
		cruiseoat = getIO("EnrtOAT");
		cruiseisa = stdTempDiff(cruisepa, cruiseoat);
		setupInput("EnrtISA", (isValid(cruiseisa)? round(cruiseisa): inputDefault("EnrtISA")));
		break;
	case "ISA":
		cruiseisa = getIO("EnrtISA");
		cruiseoat = stdTemp(cruisepa) + cruiseisa;
		setupInput("EnrtOAT", (isValid(cruiseoat)? round(cruiseoat): inputDefault("EnrtOAT")));
		break;
	}
	setOutput("EnrtISA2", round(cruiseisa));
	// Show only the selected temperature type
	showSpan("EnrtOAT", tempType == "OAT"); showIOErr("EnrtOAT", tempType == "OAT");
	showSpan("EnrtISA", tempType == "ISA"); showIOErr("EnrtISA", tempType == "ISA");
	showRow("EnrtISA2", tempType != "ISA");		// don't show computed ISA, if temp type is ISA
	//Check for valid input.
	if (!isValidIO("WBFuel_gal", "WBTOWeight_lbs", "WBZFWeight_lbs", deppa, "DepOAT",
		cruisepa, cruiseoat, cruiseisa,
		"EnrtDist", "EnrtWind", destpa, "DestOAT")
	) {
		setOutput("EnrtFuelToDest_gal", INVALID_INPUT);
		setOutput("WBFuelToDest_gal", INVALID_INPUT);
		return;
	}
	// set the highlight for emergency glide.
	gemergAltHilite = Math.max(round(cruisepa, -3), 10000);
	// Compute the fuel/distance/time for climb.
	// Subtract the value to climb from MSL to departure altitude from the value to climb from MSL
	// to cruise altitude. Zero if the cruise altitude is at or below the departure PA.
	isa = (stdTempDiff(getIO("DepAlt"), getIO("DepOAT")) + cruiseisa) / 2;
	isa = Math.min(Math.max(isa, -20), 20);		// keep climb ISA within POH limits
	climbfuel = interpolateTable("ClimbFuel", cruisepa) * (1 + (isa > 0? isa * .01: 0));
	climbfuel -= interpolateTable("ClimbFuel", deppa) * (1 + (isa > 0? isa * .01: 0));
	climbdist = interpolateTable("ClimbDist", cruisepa) * (1 + (isa > 0? isa * .01: 0));
	climbdist -= interpolateTable("ClimbDist", deppa) * (1 + (isa > 0? isa * .01: 0));
	climbtime = interpolateTable("ClimbTime", cruisepa) * (1 + (isa > 0? isa * .01: 0));
	climbtime -= interpolateTable("ClimbTime", deppa) * (1 + (isa > 0? isa * .01: 0));
	climbfuel += getACData("WBTaxiFuel");		// taxi + takeoff
	climbdist += climbtime/60 * wind;			// factor in wind
	setPOHOutput("EnrtClimbFuel_gal", round(climbfuel,1), null, "ClimbFuel");
	setPOHOutput("EnrtClimbTime", round(climbtime), null, "ClimbTime");
	setPOHOutput("EnrtClimbDist", round(climbdist), null, "ClimbDist");
	if (!isValid(climbfuel, climbtime, climbdist)) {
		return;		// remaining calculations don't make sense if these are invalid
	}
	// ensure cruise altitude makes sense
	if (dist <= climbdist) {
		setIOError("EnrtAltH", "too high for route distance");
		return;
	}
	// Compute cruise
	// Look up cruise TAS, fuel flow and torque setting. Compute pounds per hour and efficiency (nm/gal).
	cruiserpm = cruiseRPM(getIO("EnrtPower"), cruisepa, cruiseisa);
	setPOHOutput("EnrtRPM", cruiserpm);
	cruisetas = interpolateTable("CruiseTAS", cruiseisa, cruisepa, cruiserpm);
	setPOHOutput("EnrtTAS", cruisetas);
	cruisegph = interpolateTable("CruiseFF", cruiseisa, cruisepa, cruiserpm);
	setPOHOutput("EnrtGPH", cruisegph);
	setOutput("EnrtPPH", cruisegph * LBSPERGAL);
	setOutput("EnrtEff", cruisetas/cruisegph);
	// Compute the fuel on board for the given climb/cruise/descent profiles.
	cruisefuel = getIO("WBFuel_gal") - climbfuel;	// climb fuel includes taxi
	assert(isValid(cruisefuel), "computeEnroute: cruisefuel invalid");
	if (cruisefuel >= 0) {
		setPOHOutput("EnrtFOB", cruisefuel/(cruisegph/60) + climbtime);
	} else {
		setIOError("EnrtFOB", "Insufficient fuel");
	}
	// Compute the IFR reserve fuel required at destination.
	// First compute the fuel for the 45min IFR fuel requirement. Being conservative, we'll assume the
	// 45min is spent at 3,000' above the destination.
	altpa = Math.min(destpa + 3000, cruisepa);
	altrpm = cruiseRPM(getIO("EnrtPower"), altpa, isa);
	altgph = interpolateTable("CruiseFF", isa, altpa, altrpm);
	alttas = interpolateTable("CruiseTAS", isa, altpa, altrpm);
	switch (getIO("EnrtReserve")) {
	case "VFR":
		resvfuel = altgph * 30 / 60;
		altdist = 0;
		break;
	case "IFR0":
		resvfuel = altgph * 45 / 60;
		altdist = 0;
		break;
	case "IFR50":
		resvfuel = altgph * 45 / 60;
		altdist = 50;
		break;
	case "IFR100":
		resvfuel = altgph * 45 / 60;
		altdist = 100;
		break;
	}
	// for alternates, add climb and 5 min hold
	if (altdist > 0) {
		resvfuel += interpolateTable("ClimbFuel", altpa) * (1 + (isa > 0? isa * .01: 0));
		resvfuel -= interpolateTable("ClimbFuel", destpa) * (1 + (isa > 0? isa * .01: 0));
		resvfuel += altgph * (5 / 60);
		resvfuel += altgph * (altdist / alttas);
	}
	resvfuel = roundUp(resvfuel);
	if (!isValid(resvfuel)) {
		resvfuel = altgph;		// error object
	}
	setPOHOutput("EnrtAltResv_gal", resvfuel);
	// Compute Endurance and range for the alternate profile, and ETE and fuel used for the route distance.
	// Check that the route distance is greater than the climb plus descent distances, and less than the range.
	cruisefuel -= resvfuel;
	if (isValid(cruisefuel) && cruisefuel > 0) {
		endurance = cruisefuel / (cruisegph / 60) + climbtime;
		setPOHOutput("EnrtEndurance", endurance);
		range = climbdist + ((cruisetas + getIO("EnrtWind")) * cruisefuel / cruisegph);
		setPOHOutput("EnrtMaxRange", range);
		if (isValid(range) && dist > range) {
			setIOError("EnrtFuelToDest_gal", "Insufficient fuel");
			setIOError("EnrtFuelAtDest_gal", "Insufficient fuel");
		} else {
			time = (dist - climbdist) / ((cruisetas + wind) / 60);
			setPOHOutput("EnrtETE", time + climbtime)
			fuel = time * cruisegph / 60;
			setPOHOutput("EnrtClimbCruise_gal", fuel);
			fuel = Math.min(fuel, cruisefuel);		// fuel to dist doesn't always match range computation
			fuelUsed = fuel + climbfuel + getACData("WBTaxiFuel");
			setPOHOutput("EnrtFuelToDest_gal", fuelUsed);
			setPOHOutput("EnrtFuelAtDest_gal",
				Math.max(getIO("WBFuel_gal") - getACData("WBTaxiFuel") - fuelUsed, resvfuel)
			);
			if (altdist > 0) {
				setOutput("EnrtFuelAtAlt_gal",
					Math.max(getIO("WBFuel_gal") - getACData("WBTaxiFuel") - fuelUsed - resvfuel, 0)
				);
			}
		}
	} else if (isValid(cruisefuel)) {
		setIOError("EnrtEndurance", "Insufficient fuel");
		setIOError("EnrtMaxRange", "Insufficient fuel");
		setIOError("EnrtFuelToDest_gal", "Insufficient fuel");
		setIOError("EnrtFuelAtDest_gal", "Insufficient fuel");
	}
        computeCheckpoints();
}

/*
 * Compute destination results
 */
function computeDestination () {
	var weight;
	var arpt, rwy, rwys, rwyID, cond;
	var wind;
	var oat, isa, pa;
	var roll, distance, safeRwy, rwyLen, slope;
	var color;
	var ias, roc;
	var i;

	setAirportIO("Dest");		// setup airport fields
	// Compute density altitude, deg F and ISA.
	oat = getIO("DestOAT");
	setOutput("DestTempF", (isValid(oat)? degCToF(oat): INVALID_NULL));
	pa = pressureAlt(getIO("DestAlt"), getIO("DestAltimeter_inhg"));
	isa = stdTempDiff(pa, oat);
	pa = Math.max(pa, 0);
	setOutput("DestTempISA", (isValid(isa)? isa: INVALID_NULL));
	setOutput("DestDA", densityAlt(pa , oat));
	slope = 0; // getIO("DestSlope");
	cond = getIO("DestRwyCond");
	weight = getIO("WBLdgWeight_lbs");
	arpt = getIO("DestArpt");
	rwyID = getIO("DestRwy");
	// Check validity of main inputs
	if (!isValid("DestRwyLength_ft", "DestWind", weight, oat, pa)) {
		if (isValid(weight)) {
			setOutput("DestRoll_ft", INVALID_INPUT);
		} else {
			setOutputNull("DestRoll_ft");
			setIOError("DestRoll_ft", "Invalid landing weight");
		}
		rwyID = (rwyID == "Best"? null: rwyID);
		drawRunwayWind("DestCanvas", rwyID, wind, 0, 0, 0, "");
		return;
	}
	wind = new Wind(getIO("DestWindDir"), getIO("DestWind"));
	// Setup available runways if airport is set. Otherwise just setup one runway from the input.
	if (arpt) {
		rwys = getRunwayData(arpt);
	}
	if (!arpt || !rwys) {
		rwy = {}
		rwy.rwyID = rwyID;
		rwy.rwyLength = getIO("DestRwyLength_ft");
		rwy.dispThresh = 0;			// Assumed in rwyLength
		rwy.slope = 0;
		rwys = [rwy];
	}
	// Compute the headwind, crosswind, roll, and roll with safety factor.
	// Correct runway length for displace threshold.
	for (i = 0; i < rwys.length; i++) {
		rwy = rwys[i];
		rwy.hwind = wind.rwyHeadwind(rwy.rwyID);
		rwy.xwind = wind.rwyCrosswind(rwy.rwyID);
		rwy.roll = landingDistance("LdgRoll", cond, slope, weight, isa, pa, rwy.hwind, getIO("DestFlaps"));
		// add saftey factor, round to next 100'
		rwy.safeRoll = roundUp(roundUp(rwy.roll) * (1 + getIO("SetLdgSafety") / 100), -2);
		rwy.safeRoll = Math.max(rwy.safeRoll, roundUp(rwy.roll) + 200);	// ensure safety factor >=200'
		rwy.safe = isValid(rwy.safeRoll)
			&& rwy.safeRoll <= rwy.rwyLength && rwy.xwind <= getACData("MaxXWind");
		rwy.rwyLength -= rwy.dispThresh;		// correct for displaced threshold
	}
	if (rwys.length > 1) {
		// Sort the runways from "best" to "worst".
		// Select the first runway (the "best") and setup it's parameters in the input.
		rwys.sort(sortBestRunway);
		setOutput("DestBestRwy", rwys[0].rwyID);
		showRow("DestBestRwy", true);
		if (rwyID == "Best") {
			rwy = rwys[0];
		} else {
			rwy = null;
			for (i = 0; i < rwys.length; i++) {
				if (rwys[i].rwyID == rwyID) {
					rwy = rwys[i];
					break;
				}
			}
			assert(rwy, "computeDestination: Can't find runway: "+rwyID);
		}
		setupInput("DestRwyLength_ft", rwy.rwyLength);
	} else {
		setOutput("DestBestRwy", "-");
		showRow("DestBestRwy", false);
	}
	// Set the computed roll and safe runway for the selected runway.
	setPOHOutput("DestRoll_ft", rwy.roll, null, "LdgRoll");
	setOutput("DestSafeRunway_ft", rwy.safeRoll);
	// Set head/cross wind. Warn about too strong crosswind.
	setOutput("DestHeadwind", rwy.hwind);
	setOutput("DestCrosswind", Math.abs(rwy.xwind));
	setOutput("DestCrosswindDir", (rwy.xwind == 0? "": (rwy.xwind < 0? "from left": "from right")));
	if (Math.abs(rwy.xwind) > getACData("MaxXWind")) {
		setIOError("DestCrosswind", "&gt; max. crosswind");
	}
	// Compute the obstacle clearance distance.
	rwy.obstacle = landingDistance("LdgObstacle", cond, slope, weight, isa, pa, rwy.hwind, getIO("DestFlaps"));
	setPOHOutput("DestObstacle_ft", rwy.obstacle , null, "LdgObstacle");
	rwy.safeObstacle = rwy.obstacle * (1 + getIO("SetLdgSafety") / 100);
	setOutput("DestSafeObstacle_ft", rwy.safeObstacle);
	// Compute runway left and warnings
	if (isValid(rwy.rwyLength)) {
		if (isValid(rwy.roll) && rwy.rwyLength > 0) {
			distance = round(rwy.rwyLength - rwy.roll);
			if (!isValid(rwy.safeRoll) || rwy.rwyLength >= rwy.safeRoll) {
				setOutput("DestRunwayLeft_ft", distance);
				if (isValid(rwy.obstacle) && rwy.rwyLength < rwy.obstacle) {
					setIOError("DestRwyLength_ft", "< obstacle clearance dist.");
				}
			} else {
				setOutput("DestRunwayLeft_ft", distance,
					distance <= 200? {color: "red"}: {backgroundColor: "yellow"});
				setIOError("DestRwyLength_ft", "< safe runway");
			}
			if (isValid(rwy.obstacle)) {
				if (rwy.safeObstacle > rwy.rwyLength) {
					setOutput("DestObstacleDist_ft", rwy.safeObstacle - rwy.rwyLength);
				}
				showRow("DestObstacleDist_ft", rwy.safeObstacle > rwy.rwyLength);
			}
		}
	} else {
		setOutput("DestRunwayLeft_ft", INVALID_INPUT);
	}
	// Compute the stall speed, Vs, and 1.3Vs (for manuevering)
	// for the different flap configurations.
	// We use the fixed MAXTOW stall speed since we have no IAS-CAS information below it.
	// We use the weight adjusted 1.3*Vs since that can be displayed accurately, but that
	// means that 1.3*Vs is less than 1.3 times the displayed Vs.
	setOutput("DestVs30", stallIas("30"));		// 30deg flaps
	setOutput("Dest13Vs30", stallIas13(weight, "30"));
	setOutput("DestVs10", stallIas("10"));		// 10deg flaps
	setOutput("Dest13Vs10", stallIas13(weight, "10"));
	setOutput("DestVs", stallIas("0"));
	setOutput("Dest13Vs", stallIas13(weight, "0"));
	setPOHOutput("DestVa", interpolateTable("Va", weight));
	// Compute climb rates.
	roc = climbRate(oat, pa);
	ias = round(interpolateTable("Vy", Math.max(pa, 0)))
	setPOHOutput("DestROC", roc);
	setPOHOutput("DestVy", ias);
	// Draw the runway diagram
	drawRunwayWind("DestCanvas", rwy.rwyID, wind, rwy.rwyLength, rwy.roll, rwy.safeRoll,
		(!isValid(rwy.safeRoll)
			? ""
			: "Safe rwy: "+fmtNum(rwy.safeRoll)+" ft."
		 +(arpt == ""
			? ""
			: ";"+arpt+" "+rwy.rwyID+": "+fmtNum(rwy.rwyLength)+" ft."))
	);
}

/*
 * Compute IFR departure procedure performance.
 */
function computeDP () {
	var pa, isa;
	var roc, aoc, ias;
	var wind = new Wind(getIO("DepWindDir"), getIO("DepWind"));
	var depAlt = getIO("DepAlt");
	var oat = getIO("DepOAT");
	var isa = stdTempDiff(pressureAlt(depAlt, getIO("DepAltimeter_inhg")), oat);

	// check for valid input
	if (!isValidIO("DPMEAH", "DepAlt", "DepOAT", "DepAltimeter_inhg", "DepWindDir", "DepWind")) {
		setOutput("DPROC", INVALID_INPUT);
		return;
	}
	// Departure Procedure climb. Takeoff segment to 500' AGL
	pa = Math.max(0, pressureAlt(depAlt + 500, getIO("DepAltimeter_inhg")));
	roc = climbRate(oat, pa);
	setPOHOutput("DPTOROC", roc);
	ias = round(interpolateTable("Vy", pa));
	setPOHOutput("DPTOVy", ias);
	aoc = climbGradient(roc, casToTAS(ias, pa, oat) - getIO("DepHeadwind"));
	setOutput("DPTOAOC", aoc, (aoc < 200? {color:"red"}: undefined));
	// Climb to enroute
	if (getIO("DPMEAH") * 100 > depAlt) {
		pa = Math.max(0, pressureAlt(getIO("DPMEAH") * 100, getIO("DepAltimeter_inhg")));
		oat = stdTemp(pa) + isa;
		ias = round(interpolateTable("Vy", pa));
		setPOHOutput("DPVy", ias);
		roc = climbRate(oat, pa);
		setPOHOutput("DPROC", roc);
		aoc = climbGradient(roc, casToTAS(ias, pa, oat));
		setOutput("DPAOC", aoc, (aoc < 200? {color:"red"}: undefined));
		// use the maximum surface wind as a worst case tailwind for the climb
		aoc = climbGradient(roc, casToTAS(ias, pa, oat) + wind.max);
		setOutput("DPAOCT", aoc, (aoc < 200? {color:"red"}: undefined));
		setOutput("DPAOCWind", wind.max);
	} else {
		setIOError("DPMEAH", "<= departure airport");
		setOutput("DPROC", INVALID_INPUT);
	}
	// Departure procedure cold weather altitude adjustment.
	if (changedIO("DepAlt")) {
		// setup defaults if destination altitude changes
		setupInput("DPCold1", roundUp(depAlt + 400));
		setupInput("DPCold2", roundUpMult(depAlt + 1000, 1000));
		setupInput("DPCold3", roundUpMult(depAlt + 2000, 1000));
		setupInput("DPCold4", roundUp(getIO("DPMEAH") * 100));
	} else {
		// setup defaults if MEA changes
		if (isValid("DPMEAH") && changedIO("DPMEAH")) {
			setupInput("DPCold4", roundUp(getIO("DPMEAH") * 100));
		}
	}
	computeColdAltAdj("DP", depAlt, oat, 4);
}

/*
 * Compute IFR DP and MA performance.
 */
function computeAP () {
	var MIN_MDH = 200;			// minimum MDH to compute a VDP
	var VDP_ANGLE = 4;			// VDP descent angle in degrees
	var MIN_SAFE_RWY = 2000;	// minumum landing rwy remaining for min VDP
	var MIN_VDP = .5;			// minimum VDP, in nm
	var MIN_VDP_RWY = 4000;		// minimum runway length to compute a min VDP
	var pa, isa, roc, aoc, ias;
	var dist, gph;
	var weight = getIO("WBLdgWeight_lbs");
	var rwyLen = getIO("DestRwyLength_ft");
	var destAlt = getIO("DestAlt");
	var oat = getIO("DestOAT");
	var isa = stdTempDiff(pressureAlt(destAlt, getIO("DestAltimeter_inhg")), oat);
	var wind = new Wind(getIO("DestWindDir"), getIO("DestWind"));
	var mdh = getIO("APMDH");

	// check for valid input
	if (!isValidIO("APMAHoldAltH", "APMDH",
		"DestAlt", "DestOAT", "DestAltimeter_inhg",
		rwyLen, "DestSafeRunway_ft", "DestWindDir", "DestWind")
	) {
		setOutput("APMAROC", INVALID_INPUT);
		return;
	}
	// Visual Descent Point (VDP).
	// Compute the distance from the touchdown point for a 3 deg. descent from the
	// Minimum Descent Height (MDH) above the runway.
	if (mdh >= MIN_MDH) {
		dist = mdh / Math.tan(degToRad(VDP_ANGLE));		// horizontal feet to descend from MDH at VDP_ANGLE deg
		setOutput("APVDP", dist / FTPERNM);
		if (rwyLen >= MIN_VDP_RWY && rwyLen >= getIO("DestSafeRunway_ft")) {
			dist -= rwyLen - Math.max(getIO("DestSafeRunway_ft"), MIN_SAFE_RWY);
			setOutput("APMinVDP", Math.max(dist / FTPERNM, MIN_VDP));	// not less than MIN_VDP
			setOutput("APMinVDPInfo",
				(getIO("DestArpt").length > 0? getIO("DestArpt")+" ": "Rwy ")
				+(getIO("DestRwy") == "Best"? getIO("DestBestRwy"): getIO("DestRwy"))+": "
				+fmtNum(rwyLen)+"ft. "
				+"("+getIO("DestRwyCond")+"), "
				+(wind.min+wind.max == 0? wind.getWindSpeed(): wind.getWindDir()+"@"+wind.getWindSpeed())+"KT, "
				+"flaps:"+getIO("DestFlaps")
			);
		}
	}
	// Missed Approach climb.
	if (getIO("APMAHoldAltH") * 100 > destAlt) {
		pa = Math.max(0, pressureAlt(getIO("APMAHoldAltH") * 100, getIO("DestAltimeter_inhg")));
		oat = stdTemp(pa) + isa;
		ias = round(interpolateTable("Vy", pa));
		roc = climbRate(oat, pa);
		setPOHOutput("APMAROC", roc);
		aoc = climbGradient(roc, casToTAS(ias, pa, oat));
		setOutput("APMAAOC", aoc, (aoc < 200? {color:"red"}: undefined));
		// use the maximum surface wind as a worst case tailwind for the climb
		aoc = climbGradient(roc, casToTAS(ias, pa, oat) + wind.max);
		setOutput("APMAAOCT", aoc, (aoc < 200? {color:"red"}: undefined));
		setOutput("APAOCWind", wind.max);
	} else {
		setIOError("APMAHoldAltH", "<= destination airport");
	}
	// Destination cold weather altitude adjustment
	if (changedIO("DestAlt")) {
		// setup defaults if destination altitude changes
		setupInput("APCold1", roundUpMult(destAlt + 3000, 1000));
		setupInput("APCold2", roundUpMult(destAlt + 2000, 1000));
		setupInput("APCold3", roundUpMult(destAlt + 1000, 1000));
		setupInput("APCold4", roundUp(destAlt + getIO("APMDH")));
		setupInput("APCold5", roundUpMult(destAlt + 1000, 1000));
		setupInput("APCold6", roundUp(getIO("APMAHoldAltH") * 100));
	} else {
		// setup defaults if MDH/DA or hold altitude changes
		if (isValid("APMDH") && changedIO("APMDH")) {
			setupInput("APCold4", roundUp(destAlt + getIO("APMDH")));
		}
		if (isValid("APMAHoldAltH") && changedIO("APMAHoldAltH")) {
			setupInput("APCold6", roundUp(getIO("APMAHoldAltH") * 100));
		}
	}
	computeColdAltAdj("AP", destAlt, oat, 6);
}

var gAltOffset = 3000;		// Altitude offset above destination for lowest row in table. Set to high key altitude

/*
 * Set the Emergency results
 */
function computeEmergency () {
	var error = false;
	var isa = validateInt(getIO("EmergISA"));		// ISA for glide
	var destAlt = validateInt(getIO("EmergLdgAlt"));// Altitude of destination airport
	var maxAlt = getACData("MaxAlt");				// maximum cruise altitude
	var glideRatio = getACData("GlideRatio");		// Max distance glide ratio
	var glideCAS = getACData("GlideCAS");			// CAS (not IAS) for max glide
	var html = "";									// String to accumulate table html
	var alt, dist;
	var e = getElt("EmergGlideTable");
	var hwind;
	var glideTableStart, glideTableEnd;

	// The HTML for the glide tables. We use a more compact table with fewer values in the small screen version.
	glideTableStart = '<table style="text-align:center">'
		+'<caption>Current selection: <span id="EmergGlideDist"></span>&thinsp;nm.</caption>'
		+'<tr><td colspan="2"> </td><td colspan="4" style="text-align:left">Tailwind (kt)</td>'
			+'<td colspan="5" style="text-align:right">Headwind (kt)</td></tr>';
	glideTableEnd = '</table>';
	assert(destAlt < 12000, "computeEmergency: bad destination altitude");
	// Add column header row for Altitude, OAT and the various wind values.
	// The small screen UI has fewer columns.
	html += '<tr><td><u>Altitude</td><td><u>OAT</td>';
	for (hwind = -40; hwind <= 40; hwind += 10) {
		html += '<td id="W'+hwind+'" '							// wind column header. Set column id W<wind>
			+'style="color:blue; white-space:nowrap;"'			// indicate this is clickable
			+'onclick="emergHilite(null, this.id)">'			// on click recompute hilighting
			+'<u>'+Math.abs(hwind)+'</u></td>';							// display headwind
	}
	html += '</tr>';
	// Add each table row to the HTML string.
	for (alt = roundUp(destAlt, -3) + gAltOffset; alt <= maxAlt; alt += 1000) {
		html += '<tr>'											// start a new row
			+'<td id="A'+alt+ '" '								// altitude row header. Set row id A<alt>
			+'style="color:blue; white-space:nowrap;"'			// indicate this is clickable
			+'onclick="emergHilite(this.id, null)">'			// on click recompute hilighting
			+'<u>'+fmtNum(alt)+'</u></td>';						// display altitude
		html += '<td id="O'+alt+'">'							// OAT column
			+ round(stdTemp(alt) + isa)
			+ '&deg;</td>';
		// Emit columns for the different headwind values.
		for (hwind = -40; hwind <= 40; hwind += 10) {
			dist = glideDistance(glideRatio, glideCAS, hwind, alt, destAlt, isa);
			html += '<td id="A'+alt+'W'+hwind+'">'				// Data value. ID is A<alt>W<wind>
				+round(dist, (dist < 10? 1: 0))+'</td>';		// if value less than 10, display 1 decimal
		}
		html += '</tr>';										// Finish the row
	}
	e.innerHTML = glideTableStart + html + glideTableEnd;		// Add the table to the element
	emergHilite(null, null);									// Highlight the current row/col on the new table
}

/*
 * Hilight the current row and column of the glide table.
 * called from on a click on the row or column header.
 * Could use CSS & styles here, but it seems like less work this way.
 */
var gemergWindHilite = 0;										// Current wind column to highlight
var gemergAltHilite = 10000;									// Current altitude column to highlight

function emergHilite (altID, windID) {
	var alt, hwind;
	var hilite = "yellow";
	var unhilite = "transparent";
	var bg;
	var minAlt = roundUp(getIO("EmergLdgAlt"), -3) + gAltOffset;
	var maxAlt = getACData("MaxAlt");								// maximum cruise altitude

	if (altID) {
		gemergAltHilite = parseInt(altID.substr(1));			// if an alitude is clicked, make it the current one
	}
	gemergAltHilite = Math.max(gemergAltHilite, minAlt);		// note: minAlt can change with the altitude of the glide target.
	if (windID) {
		gemergWindHilite = parseInt(windID.substr(1));			// if a wind value is clicked, make it the current one
		computeEmergency();
	}
	// Hilight the current wind header. Unhilight the others.
	for (hwind = -40; hwind <= 40; hwind += 10) {
		getElt("W" + hwind).style.backgroundColor = (hwind == gemergWindHilite? hilite: unhilite);
	}
	// Highlight the current altitude row and glide values in the current wind column.
	// Unhighlight the rest.
	for (alt = minAlt; alt <= maxAlt; alt += 1000) {
		bg = (alt == gemergAltHilite? hilite: unhilite);
		getElt("A"+alt).style.backgroundColor = bg;				// Altitude header
		getElt("O"+alt).style.backgroundColor = bg;				// OAT
		for (hwind = -40; hwind <= 40; hwind += 10) {			// wind values
			getElt("A"+alt+"W"+hwind).style.backgroundColor
				= (hwind == gemergWindHilite? hilite: bg);		// highight the current row values and values in the current column
			if (alt == gemergAltHilite && hwind == gemergWindHilite) {
				setOutput("EmergGlideDist", getElt("A"+alt+"W"+hwind).innerHTML);
			}
		}
	}
}

/*
 * Check aircraft parameters.
 */
function computeAC () {
	if (gIO.regressionTest) {
		return;		// avoid interfering with regression test setup
	}
	// If the current aircraft is editable, deal with changes
	if (gIO.aircraftEditable) {
		// check for changes in the registration name string
		if (getIO("ACReg") != getIO("SelectedAC")) {
			changeACReg();
		}
		// check for model changes
		if (getIO("ACModel") != getCurrentAC()) {
			setACModel();
			dialog.confirm("Set empty weight and arm to model defaults?",
				function (yes) {
					if (yes) {
						setupInput("ACBEW_lbs", getACData("WBBEWeight").weight);
						setupInput("ACArm", getACData("WBBEWeight").arm);
						computePage("AC");
					}
				}
			);
		}
		setAircraftFromPage();
	} else if (changedIO("SelectedAC")) {
		// The current selected aircraft changed
		setPageFromAircraft();
                setACModel();
                computeTrip();
		if (getIO("TripSelectedAC") != "[Any]") {
			setupInput("TripSelectedAC", getIO("SelectedAC"));
		}
	}
}

/*
 * Check stored aircraft for validity.
 * It's best to remove them rather than risk using invalid aircraft data.
 */
function checkAircraft (aircraft) {
	var validACinput = function (id) {
		return (id in aircraft && isValid(validateInput(id, aircraft[id])));
	};
	
	return (validACinput('ACReg') && validACinput('ACModel')
		&& validACinput('ACArm') && validACinput('SetWeightUnits')
		&& (aircraft['SetWeightUnits'] === 'lbs'
			? validACinput('ACBEW_lbs')
			: validACinput('ACBEW_kg'))
		&& (aircraft["ACModel"] === "172N"
			? validACinput('ACLRTanks')
			: true)
	);
}

/*
 * Set the aircraft model.
 */
function setACModel () {
	setCurrentAC(getIO("ACModel"));
	// Show or hide model dependent fields.
	showRow("ACLRTanks", isACModel("172N"));
}

/*
 * Check any changed settings.
 */
function computeSettings () {
	if (changedIO("SetAltimeterUnits")) {
		convertIDunits(["DepAltimeter", "DestAltimeter"],
			{"inhg": "Altimeter_inhg", "hpa": "Altimeter_hpa"},
			getLastIO("SetAltimeterUnits"),
			getIO("SetAltimeterUnits")
		);
	}
	if (changedIO("SetRunwayUnits")) {
		convertIDunits(
			["DepRwyLength", "DestRwyLength",
				"DepRunwayLeft", "DestRunwayLeft",
				"DepSafeRunway", "DestSafeRunway",
				"DepRoll", "DestRoll",
				"DepObstacle", "DestObstacle",
				"DepAcStop"],
			{"ft": "Runway_ft", "m": "Runway_m"},
			getLastIO("SetRunwayUnits"),
			getIO("SetRunwayUnits")
		);
	}
	if (changedIO("SetFuelUnits")) {
		convertIDunits(
			["TripWBFuel", "TripWBFuelUsed",
				"WBFuel", "WBFuelMax", "WBFuelToDest", "WBFuelUsed", "WBFuelUsedMax", "WBMaxFuel",
				"EnrtFuelToDest", "EnrtFuelAtDest", "EnrtFuelAtAlt", "EnrtAltResv",
				"EnrtClimbFuel"],
			{"gal": "Fuel_gal", "l": "Fuel_l", "lbs":"Fuel_lbs", "kg": "Fuel_kg"},
			getLastIO("SetFuelUnits"),
			getIO("SetFuelUnits")
		);
	}
	if (changedIO("SetWeightUnits")) {
		convertIDunits(
			["TripWBRow1L", "TripWBRow1R",
				"TripWBRow2L", "TripWBRow2R",
				"TripWBBaggage1", "TripWBBaggage2",
				"WBRow1L", "WBRow1R",
				"WBRow2L", "WBRow2R",
				"WBBaggage1", "WBBaggage2",
				"WBTOWeight", "WBLdgWeight", "WBZFWeight", "WBRampWeight",
				"ACBEW"],
			{"lbs": "Weight_lbs", "kg": "Weight_kg"},
			getLastIO("SetWeightUnits"),
			getIO("SetWeightUnits")
		);
	}
	setInputStyle();
}

/*
 * Fixup old versions of saved Input.
 */
function fixSavedInput (savedInput) {
	var id;
	var i;
	var fixID = function (elts, id) {
		switch (id) {

		case "ACTOSafety":
		case "ACLdgSafety":
		case "ACEmerg":
		case "ACEnrtFuelToDest":
			elts[id.replace(/^AC/, "Set")] = elts[id];
			delete elts[id];
			break;
		case "EnrtWind":
			if (elts[id] < 0) {
				elts[id] = -elts[id];
				elts["EnrtWindDir"] = "headwind";
			}
			break;
		case "RemoteSaveTime":
			elts["SaveTime"] = elts["RemoteSaveTime"];
			delete elts["RemoteSaveTime"];
			break;
		case "DepAltimeter":
		case "DestAltimeter":
			elts[id+"_inhg"] = elts[id];
			delete elts[id];
			break;
		case "DepRwyLength":
		case "DestRwyLength":
			elts[id+"_ft"] = elts[id];
			delete elts[id];
			break;
		case "WBFuel":
		case "WBFuelMax":
		case "WBFuelToDest":
		case "WBFuelUsed":
		case "WBFuelUsedMax":
		case "WBMinFuelUsed":
		case "WBMaxFuel":
		case "EnrtFuelToDest":
		case "EnrtFuelAtDest":
		case "EnrtFuelAtAlt":
		case "EnrtAltResv":
		case "EnrtClimbFuel":
			elts[id+"_gal"] = elts[id];
			delete elts[id];
			break;
		case "WBRow1L":
		case "WBRow1R":
		case "WBRow2L":
		case "WBRow2R":
		case "WBBaggage1":
		case "WBBaggage2":
		case "WBTOWeight":
		case "WBLdgWeight":
		case "WBZFWeight":
		case "WBRampWeight":
		case "ACBEW":
			elts[id+"_lbs"] = elts[id];
			delete elts[id];
			break;
		case "APMAClimbAlt":
			elts["APMAHoldAltH"] = round(elts[id]/100);
			delete elts[id];
			break;
		case "EnrtAlt":
		case "TripEnrtAlt":
		case "DPMEA":
			elts[id+"H"] = round(elts[id]/100);
			delete elts[id];
			break;
		default:
			break;
		}
	};

	if (savedInput["Version"] == VERSION) {
		return;
	}
	// fixup main elements
	for (id in savedInput) {
		fixID(savedInput, id);
	}
	// fixup elements in each aircraft
	if ("Aircraft" in savedInput && typeOf(savedInput["Aircraft"]) == "array") {
		for (i = 0; i < savedInput["Aircraft"].length; i++) {
			if (typeOf(savedInput["Aircraft"][i]) != "object") {
				continue;
			}
			for (id in savedInput["Aircraft"][i]) {
				fixID(savedInput["Aircraft"][i], id);
			}
			if (!("SetWeightUnits" in savedInput["Aircraft"][i])) {
				savedInput["Aircraft"][i]["SetWeightUnits"] = "lbs";
			}
		}
	}
	// fixup elements in each trip
	if ("Trips" in savedInput && typeOf(savedInput["Trips"]) == "array") {
		for (i = 0; i < savedInput["Trips"].length; i++) {
			if (typeOf(savedInput["Trips"][i]) != "object") {
				continue;
			}
			for (id in savedInput["Trips"][i]) {
				fixID(savedInput["Trips"][i], id);
			}
			if (!("SetWeightUnits" in savedInput["Trips"][i])) {
				savedInput["Trips"][i]["SetWeightUnits"] = "lbs";
			}
			if (!("SetFuelUnits" in savedInput["Trips"][i])) {
				savedInput["Trips"][i]["SetFuelUnits"] = "gal";
			}
		}
	}
}

/*
 * Execute a regression test.
 */
function regressionTest (str) {
	var err = false;
	var savedInput, savedVersion, savedTOU, savedCloudEnabled;
	var id;
	var a, i, r;

	// check for regression test string
	if (str != "XYZZY") {
		return;
	}
	gIO.cloudEnabled = false;			// disable cloud sync
	// Remember current stored values
	savedInput = getStorage(gAppID + "Input");
	savedVersion = getStorage(gAppID + "Version");
	savedTOU = getStorage(gAppID + "TOU");
	savedCloudEnabled = gIO.cloudEnabled;

	resetSavedInput(false);				// reset stored values
	setInputState({"AppID": gAppID});	// set input to defaults

	checkDB();							// check the databases
	checkACData();						// check the aircraft data

	gIO.regressionTest = true;
	// Default scenario
	setInput("SetAltimeterUnits", "inhg");
	setInput("SetRunwayUnits", "ft");
	setInput("WBEnrtFuelToDest", false);
	setInput("ACModel", "172S");
	setCurrentAC(getIO("ACModel"));
	setInput("ACBEW_lbs", inputDefault("ACBEW_lbs"));
	setInput("ACArm", inputDefault("ACArm"));
	setInput("SetTOSafety", 40);
	setInput("SetLdgSafety", 40);

	selectPage("WB");
	setInput("WBFuel_gal", 53);
	setInput("WBFuelUsed_gal", 26);
	setInput("WBRow1L_lbs", 170);
	setInput("WBRow1R_lbs", 0);
	setInput("WBRow2L_lbs", 0);
	setInput("WBRow2R_lbs", 0);
	setInput("WBBaggage1_lbs", 0);
	setInput("WBBaggage2_lbs", 0);
	err += checkOutput("WBTOWeight_lbs", 2106);
	err += checkOutput("WBTOCG", 39.5);
	err += checkOutput("WBLdgWeight_lbs", 1950);
	err += checkOutput("WBLdgCG", 38.8);
	err += checkOutput("WBMaxFuel_gal", 53);
	err += checkOutput("WBRampWeight_lbs", 2114);
	// max TO weight
	setInput("WBRow2R_lbs", 445);
	err += checkOutput("WBTOWeight_lbs", 2551);
	err += checkEltText("WBTOWeightError", "Too heavy");
	// forward limit
	setInput("WBRow1R_lbs", 344);
	setInput("WBRow2R_lbs", 100);
	err += checkOutput("WBTOWeight_lbs", 2550);
	err += checkOutput("WBTOCG", 40.5);
	err += checkEltText("WBTOCGError", "Too far forward");
	// aft limit
	setInput("WBRow1R_lbs", 0);
	setInput("WBRow2R_lbs", 274);
	setInput("WBBaggage1_lbs", 120);
	setInput("WBBaggage2_lbs", 50);
	err += checkOutput("WBTOWeight_lbs", 2550);
	err += checkOutput("WBTOCG", 47.3);
	err += checkEltText("WBTOCGError", "Too far aft");
	// restore to default
	setInput("WBRow2R_lbs", 0);
	setInput("WBBaggage1_lbs", 0);
	setInput("WBBaggage2_lbs", 0);

	// Departure
	selectPage("Dep");
	setInput("DepArpt", "");
	setInput("DepAlt", 0);
	setInput("DepWindDir", 10);
	setInput("DepWind", "0");
	setInput("DepOAT", 15);
	setInput("DepAltimeter_inhg", 29.92);
	setInput("DepRwy", 1);
	setInput("DepRwyCond", "hard");
	setInput("DepRwyLength_ft", 0);
	setInput("DepSlope", 0);

	err += checkOutput("DepHeadwind", 0);
	err += checkOutput("DepCrosswind", 0);
	err += checkOutput("DepRoll_ft", 610);
	err += checkOutput("DepVr", 44);
	err += checkOutput("DepObstacle_ft", 1055);
	err += checkOutput("DepSafeRunway_ft", 900);
	err += checkOutput("DepVx", 63);
	err += checkOutput("DepVy", 73);
	err += checkOutput("DepVs10", 43);
	err += checkOutput("DepVs", 48);
	err += checkOutput("DepVa", 95);
	err += checkOutput("DepDA", 0);
	err += checkOutput("DepTempISA", 0);
	err += checkOutput("DepBEWind", 0);
	err += checkOutput("DepAcStop_ft", 1470);

	// Destination
	selectPage("Dest");
	setInput("DestArpt", "");
	setInput("DestAlt", 0);
	setInput("DestWindDir", 10);
	setInput("DestWind", "0");
	setInput("DestOAT", 15);
	setInput("DestAltimeter_inhg", 29.92);
	setInput("DestRwy", 1);
	setInput("DestRwyCond", "hard");
	setInput("DestRwyLength_ft", 0);
	setInput("DestFlaps", "30");

	// Enroute
	selectPage("Enrt");
	setInput("EnrtAltH", 55);
	setInput("EnrtOAT", 0);
	setInput("EnrtTempType", "ISA");
	setInput("EnrtDist", 100);
	setInput("EnrtWind", 0);
	setInput("EnrtPower", "65");
	setInput("EnrtReserve", "VFR");

	err += checkOutput("EnrtFOB", 337);
	err += checkOutput("EnrtEndurance", 304);
	err += checkOutput("EnrtMaxRange", 571);
	err += checkOutput("EnrtAltResv_gal", 5);
	err += checkOutput("EnrtTAS", 114);
	err += checkOutput("EnrtGPH", 9);
	err += checkOutput("EnrtPPH", 54);
	err += checkOutput("EnrtEff", 12.6);
	err += checkOutput("EnrtISA", 0);
	err += checkOutput("EnrtClimbFuel_gal", 3);
	err += checkOutput("EnrtClimbDist", 12);
	err += checkOutput("EnrtClimbTime", 9);

	err += checkOutput("DestHeadwind", 0);
	err += checkOutput("DestCrosswind", 0);
	err += checkOutput("DestRoll_ft", 545);
	err += checkOutput("DestObstacle_ft", 1290);
	err += checkOutput("DestSafeRunway_ft", 800);
	err += checkOutput("DestRunwayLeft_ft", INVALID);
	err += checkOutput("DestVs30", 40);
	err += checkOutput("DestVs10", 43);
	err += checkOutput("DestVs", 48);
	err += checkOutput("DestVa", 91);
	err += checkOutput("DestROC", 729);
	err += checkOutput("DestVy", 74);
	err += checkOutput("DestDA", 0);
	err += checkOutput("DestTempISA", 0);

	// Departure procedure
	selectPage("DP");
	setInput("DPMEAH", 30);

	err += checkOutput("DPTOROC", 707);
	err += checkOutput("DPTOVy", 74);
	err += checkOutput("DPTOAOC", 568);
	err += checkOutput("DPROC", 627);
	err += checkOutput("DPVy", 73);
	err += checkOutput("DPAOC", 493);
	err += checkOutput("DPAOCT", 493);

	// Approach procedure
	selectPage("AP");
	setInput("APMDH", 200);
	setInput("APMAHoldAltH", 30);

	err += checkOutput("APVDP", .5);
	err += checkOutput("APMinVDP", INVALID);
	err += checkOutput("APMAROC", 627);
	err += checkOutput("APMAAOC", 493);
	err += checkOutput("APMAAOCT", 493);

	selectPage("Set");
	if (!err) {
		notice("Regression test passed");
	}
	gIO.regressionTest = false;
	// Restore old saved values and recompute
	setInput("DepArpt", "");
	setInput("DestArpt", "");
	if (savedInput) {
		setStorage(gAppID + "Input", savedInput);
		setStorage(gAppID + "Version", savedVersion);
		setStorage(gAppID + "TOU", savedTOU);
	}
	restoreInput();
	gIO.cloudEnabled = savedCloudEnabled;			// restore cloud sync
}

/****
 * Misc computations
 ****/

/*
 * Compute the maximum usable fuel.
 */
function maxUsableFuel () {
	if (isACModel("172N") && getIO("ACLRTanks")) {
		return (getACData("WBFuelLR").max);
	}
	return (getACData("WBFuel").max);
}

/*
 * Compute rate of climb in ft/min.
 * The table indicates the climb speed/power/config table to use
 */
function climbRate (oat, pa) {
	return (round(interpolateTable("ClimbRate", Math.max(oat, 0), Math.max(pa, 0))));
}

/*
 * Compute the Takeoff distance (ground roll or obstacle clearance).
 */
function takeoffDistance (table, cond, slope, weight, oat, pa, hdwind, Vr) {
	var dist;

	pa = Math.max(pa, 0);				// POH tables are for PA >=0
	weight = Math.max(weight, tableMin(table, "weight"));	// POH tables are for weight >= 2200
	oat = Math.max(oat, 0);				// POH tables are for OAT >= 0
	// Get the base distance depending on pressure alt. and OAT.
	dist = interpolateTable(table, weight, oat, pa);
	if (typeof (dist) == "object") {		// check for error object
		return (dist);
	}
	// Adjust for head or tail wind.
	// For headwind, POH says reduce 10% per 9kts.
	// For tailwind, POH says increase 10% per 2kts.
	dist *= 1 - ((hdwind > 0? .1/9: .1/2) * hdwind);
	// Adjust for surface conditions
	if (table == "TORoll") {
		if (cond == "dry grass") {
			dist *= 1.15;
		}
		// Adjust the roll for slope.
		if (slope > 0) {
			dist = TOSlopeAdjust(dist, slope, Vr);
		}
	} else {	// Obstacle clearance
		if (cond == "dry grass") {
			// Adjust using 15% of hard surface ground roll (including slope)
			dist += takeoffDistance("TORoll", "hard", slope, weight, oat, pa, hdwind, Vr) * .15;
		} else if (slope > 0) {	// hard surface with slope
			// Adjust using difference in ground roll with and without slope
			dist += takeoffDistance("TORoll", "hard", slope, weight, oat, pa, hdwind, Vr) - takeoffDistance("TORoll", "hard", 0, weight, oat, pa, hdwind, Vr);
		}
	}
	return (roundUp(dist));
}

/*
 * Compute the landing distance (ground roll or obstacle clearance, the table indicates which).
 */
function landingDistance (table, cond, slope, weight, oat, pa, hdwind, flaps) {
	var dist;

	pa = Math.max(pa, 0);				// POH table are for PA >=0
	oat = Math.max(oat, 0);				// POH tables are for OAT >= 0
	// Get the base distance.
	dist = interpolateTable(table, oat, pa);
	// Adjust for head or tail wind.
	// For headwind, POH says reduce 10% per 9kts.
	// For tailwind, POH says increase 10% per 2kts.
	dist *= 1 - ((hdwind > 0? .1/9: .1/2) * hdwind);
	// Adjust for flaps up.
	if (flaps == "0") {
		dist *= 1.35;
	}
	// Adjust for surface conditions
	if (table == "LdgRoll") {
		if (cond == "dry grass") {
			dist *= 1.45;
		}
	} else {	// Obstacle clearance
		if (cond == "dry grass") {
			// Adjust using 45% of hard surface ground roll (including slope)
			dist += landingDistance("LdgRoll", "hard", slope, weight, oat, pa, hdwind, flaps) * .45;
		}
	}
	return (roundUp(dist));
}

/*
 * Find an RPM appropriate to the power setting.
 */
function cruiseRPM (power, pa, isa) {
	var rpm;

	switch (power) {
	case "Max":
		// The highest power setting in table is 83. The high power setting that's the lowest is 60.
		// Search from 83 downward to 60 until we find a setting that works.
		for (power = 83; power >= 60; power--) {
			rpm = interpolateTable("CruiseRPM", isa, pa, power);
			if (isValid(rpm)) {
				rpm = roundDownMult(rpm, 10);
				if (isValid(interpolateTable("CruiseTAS", isa, pa, rpm))) {
					return (rpm);
				}
			}
		}
		break;
	case "LR":
		// The lowest power setting in table is 40. The low power setting that's the highest is 49.
		// Search from 40 upward to 49 until we find a setting that works.
		for (power = 40; power <= 49; power++) {
			rpm = interpolateTable("CruiseRPM", isa, pa, power);
			if (isValid(rpm)) {
				rpm = roundUpMult(rpm, 10);
				if (isValid(interpolateTable("CruiseTAS", isa, pa, rpm))) {
					return (rpm);
				}
			}
		}
		break;
	default:
		rpm = interpolateTable("CruiseRPM", isa, pa, power);
		return (roundMult(rpm, 10));
		break;
	}
	return (INVALID);
}

/*
 * Adjust a V speed in KIAS for weight. Only reliable above the stall.
 */
function speedAdjustIas (ias, Wspec, weight, flaps) {
	var cas;

	// convert to KCAS, adjust for weight, then convert back to KIAS.
	cas = iasToCas(ias, flaps);
	cas = speedAdjustCas(cas, Wspec, weight);
	// there's a minimum cas that can be displayed accurately
	cas = Math.max(cas, tableMin("CASToIAS"+flaps, "airspeed"));
	return (casToIas(cas, flaps));
}

/*
 * The POH only publishes MAXTOW stall speeds, and IAS/CAS is not reliable below this speed.
 */
function stallIas(flaps) {
	return (getACData("StallIAS"+flaps));
}

/*
 * Compute the weight adjusted 1.3 * stall speed.
 * Convert to CAS, do the adjustment, then convert back.
 */
function stallIas13(weight, flaps) {
	var cas = getACData("StallCAS"+flaps);

	cas = speedAdjustCas(cas, getACData("WBMaxTOWeight"), weight);
	return (casToIas(1.3 * cas, flaps));
}

/*
 * Compute KCAS from KIAS. Only reliable above the stall
 */
function iasToCas (ias, flaps) {
	return (round(interpolateTable("IASToCAS"+flaps, ias)));
}

/*
 * Compute KCAS from KIAS. Only reliable above the stall.
 */
function casToIas (cas, flaps) {
	return (round(interpolateTable("CASToIAS"+flaps, cas)));
}

/*
 * Build missing entries in the aircraft database
 */
function buildAircraftData () {
	// build table to convert CAS to IAS.
	// C172S contain the main tables. Other aircraft refer to these.
	buildIASTable(gACData.model["172S"], "0");
	buildIASTable(gACData.model["172S"], "10");
	buildIASTable(gACData.model["172S"], "30");
	buildIASTable(gACData.model["172N"], "0");
	buildIASTable(gACData.model["172N"], "10");
	buildIASTable(gACData.model["172N"], "30");
        buildIASTable(gACData.model["150M"], "0");
	buildIASTable(gACData.model["150M"], "10");
	buildIASTable(gACData.model["150M"], "30");
}

/*
 * Build a table to convert indicated airspeed to calibrated airspeed
 * by "inverting" the IAS to CAS table.
 */
function buildIASTable (acdata, config) {
	var iasa = acdata["IASToCAS"+config].a;
	var a = [];
	var i;

	// For each ISA, make an entry CAS to IAS
	for (i = 0; i < iasa.length; i++) {
		a[i] = {};
		a[i].p = iasa[i].v;
		a[i].v = iasa[i].p;
	}
	// setup new table
	acdata["CASToIAS"+config] = {};
	switch (config) {
	case "Clean":
		acdata["CASToIAS"+config].name = "Indicated airspeed in clean configuration";
		break;
	case "TO":
		acdata["CASToIAS"+config].name = "Indicated airspeed in takeoff configuration";
		break;
	case "Ldg":
	default:
		acdata["CASToIAS"+config].name = "Indicated airspeed in landing configuration";
		break;
	}
	acdata["CASToIAS"+config].parmNames = ["airspeed"];
	acdata["CASToIAS"+config].a = a;
}