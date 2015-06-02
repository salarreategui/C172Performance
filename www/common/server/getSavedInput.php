<?php
/*
 * Return saved user input.
 * The data is stored in ../savedInput/TBM/$id.txt.
 * The id is usually in the form "email+saveID" or "TR+email+timestamp" for trouble reports.
 * Returns a 410 error if something goes wrong.
 */
if (!empty($_SERVER['SUBDOMAIN_DOCUMENT_ROOT'])) {
	/* GoDaddy Hackery */
	$_SERVER['DOCUMENT_ROOT'] = $_SERVER['SUBDOMAIN_DOCUMENT_ROOT'];
}
chdir($_SERVER['DOCUMENT_ROOT']);

$app = getenv("POH_APP");						// aircraft type
$saveDir = "savedInput/" . $app;				// directory where input is saved for this aircraft type

$id = $_POST["id"];								// get the id from the Post

$fileName = $saveDir . "/" . $id . ".txt";		// file we're retrieving

// if the file exists, get it
if (!file_exists($fileName)) {
	header("HTTP/1.1 410 Gone");
	exit("getSavedInput.php error: " . $fileName . " missing");
} else {
	$file = fopen($fileName, "r");
	echo fread($file, filesize($fileName));
	fclose($file);
}
?>
