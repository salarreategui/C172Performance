<?php
/*
 * This is a helper script to fetch METAR data that cannot be fetched directly from the NOAA site due to cross-site access restrictions.
 */
if (!empty($_SERVER['SUBDOMAIN_DOCUMENT_ROOT'])) {
	/* GoDaddy Hackery */
	$_SERVER['DOCUMENT_ROOT'] = $_SERVER['SUBDOMAIN_DOCUMENT_ROOT'];
}

$url = "http://weather.noaa.gov/pub/data/observations/metar/stations/";
$station = $_POST["station"];

if ($station == "") {
	$station = $_GET["station"];
}

$file = @fopen($url . $station . ".TXT", "r");

header("Expires: Mon, 26 Jul 1997 05:00:00 GMT");
header("Cache-Control: no-cache");
header("Pragma: no-cache");
header("Access-Control-Allow-Origin: *");

if (!$file) {
	header("HTTP/1.1 410 Gone");
	exit("metar.php error: " . $file . " missing");
}
while (!feof($file)) {
    echo fgets($file);
}
fclose($file);
?> 
