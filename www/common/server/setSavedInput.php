<?php
/*
 * Save user input.
 * The data is stored in ../savedInput/TBM/$id.txt.
 * The id is usually in the form "email+saveID" or "TR+email+timestamp" for trouble reports.
 * Returns a 410 error if something goes wrong.
 */
if (!empty($_SERVER['SUBDOMAIN_DOCUMENT_ROOT'])) {
	/* GoDaddy Hackery */
	$_SERVER['DOCUMENT_ROOT'] = $_SERVER['SUBDOMAIN_DOCUMENT_ROOT'];
}
chdir($_SERVER['DOCUMENT_ROOT']);

$app = getenv("POH_APP");			// aircraft type
$saveDir = "savedInput/" . $app;	// directory where input is saved for this aircraft type

$backups = array(1, 7, 30);			// max age of each backup in days. From youngest to oldest.
$now = time();

// Get the id and input from the POST
$id = $_POST["id"];
$input = stripslashes($_POST["input"]);
// Make sure the save directory exits.
if (!is_dir($saveDir)) {
	mkdir($saveDir);
}
$fileName = $saveDir . "/" . $id . ".txt";								// primary file name
$backup = $saveDir . "/" . $id . "(backup" . $backups[0] . ").txt";		// first backup file name

// If the file already exists, check the age of the first backup before the file is overwritten.
// If the most recent backup is older than it's max age, move the current file to the first backup.
if (file_exists($fileName)) {
	if (!file_exists($backup) || ($now - filemtime($backup)) / (60 * 60 * 24) >= $backups[0]) {
		@rename($fileName, $backup);
	}
}

// Write the input to the file. Return 410 if this fails.
$file = @fopen ($fileName, "w");
if (!$file) {
	header("HTTP/1.1 410 Gone");
	exit("setSavedInput.php error: Can't create file " . $fileName);
}
if (@fwrite($file, $input) == 0) {
	header("HTTP/1.1 410 Gone");
	exit("setSavedInput.php error: Can't write file " . $fileName);
}
fclose($file);

// If there's no first backup, copy the file.
if (!file_exists($backup)) {
	@copy($fileName, $backup);
}

// At this point the first backup always exists. Go through the required backups and check whether they are too old.
// If too old, copy the next younger backup to it, preserving it's modification time. We go from oldest backup to
// youngest, so that the older data is preserved.
for ($i = count($backups) - 1; $i >= 1; $i--) {
	$backup = $saveDir . "/" . $id . "(backup" . $backups[$i] . ").txt";
	if (!file_exists($backup) || ($now - filemtime($backup)) / (60 * 60 * 24) >= $backups[$i]) {
		/*
		 * The next youngest backup may not exist yet. Search backward until you find one that does.
		 */
		for ($j = $i - 1; $j >= 0; $j--) {
			$source = $saveDir . "/" . $id . "(backup" . $backups[$j] . ").txt";
			if (file_exists($source)) {
				break;
			}
		}
		/*
		 * Copy the younger backup to this slot, preserving it's modification time.
		 */
		$mtime = filemtime($source);
		@copy($source, $backup);
		@touch($backup, $mtime);
	}
}
?> 
