<?php
/*
 * This script will replace image links with data URL's.
 * This fixes the problem where IOS will not make the images available to dynamically created containers while offline.
 * Currently only affects images in CSS.
 * It is invoked from the .htaccess in a rewrite rule with "?file=XXX" added
 */
if (!empty($_SERVER['SUBDOMAIN_DOCUMENT_ROOT'])) {
	/* GoDaddy Hackery */
	$_SERVER['DOCUMENT_ROOT'] = $_SERVER['SUBDOMAIN_DOCUMENT_ROOT'];
}
chdir($_SERVER['DOCUMENT_ROOT']);

header("Cache-Control: no-cache, must-revalidate"); // HTTP/1.1
header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");	// Date in the past

$dir = preg_replace("/\/([^\/]+)\/.*/", "$1", $_SERVER['PHP_SELF']);	// aircraft type
$fileName = $dir . "/" . $_GET["file"];

/*
 * Only need to test the mtime of the main file, since the version string is in there and it would be changed.
if (is_file($fileName) && $_SERVER['HTTP_IF_MODIFIED_SINCE'] != "" && filemtime($fileName) <= strtotime($_SERVER['HTTP_IF_MODIFIED_SINCE'])) {
		header("HTTP/1.1 304 Not Modified");
		exit;
}
*/

// Get the file type.
if (preg_match("/\.html?$/", $fileName)) {
	$fileType = "text/html";
} else if (preg_match("/\.js$/", $fileName)) {
	$fileType = "application/javascript";
} else if (preg_match("/\.css$/", $fileName)) {
	$fileType = "text/css";
} else if (preg_match("/\.manifest$/", $fileName)) {
	$fileType = "text/cache-manifest";
} else {
	exit("fixImages.php error: " . $fileName . ": bad type");
}
// Set the content type and Last-Modified headers.
header("Content-type: " . $fileType); 
header("Last-Modified: " . gmdate("D, d M Y H:i:s", filemtime($fileName)) . " GMT");

// Send the file
print send_file($fileName, $fileType);

/*
 * Adjust and send the file
 */
function send_file ($fileName, $fileType) {
	$baseDir = preg_replace("/[^\/]*$/", "", $fileName);
	// print "send_file($fileName)\n";
	$file = fopen($fileName, "r");
	if (!$file) {
		header("HTTP/1.1 410 Gone");
		exit("fixImages.php error: " . $fileName . " missing");
	}
	while(!feof($file)) {
		$line = fgets($file);
		if ($fileType == "text/html") {
			if (preg_match("/<link/", $line)) {
				if (preg_match("/href\s*=\s*\"([^\"]*)\"/", $line, $m)) {
					$href = $m[1];
					$href = preg_replace("/\?.*/", "", $href);
					// print "href = $href\n";
				}
				if (preg_match("/rel\s*=\s*\"([^\"]*)\"/", $line, $m)) {
					$rel = $m[1];
					// print "rel = $rel\n";
				}
				if (preg_match("/type\s*=\s*\"([^\"]*)\"/", $line, $m)) {
					$type = $m[1];
					// print "type = $type\n";
				}
				if (preg_match("/src\s*=\s*\"([^\"]*)\"/", $line, $m)) {
					$src = $m[1];
					// print "src = $src\n";
				}
				if (preg_match("/media\s*=\s*\"([^\"]*)\"/", $line, $m)) {
					$media = $m[1];
					// print "media = $media\n";
				}
				if (preg_match("/class\s*=\s*\"([^\"]*)\"/", $line, $m)) {
					$class = $m[1];					
					// print "class = $class\n";
				}
				switch ($rel) {
				default:
					// Always just send the exact line as images in HTML are static and don;t need to be fixed.
					$content .= $line;
					break;
				}
			} else {
				$content .= $line;
			}
		} else if ($fileType == "text/css" || $fileType == "application/javascript") {
			// Substitute url() values with url(data:...) values from the file.
			if (preg_match("/url\([\"']([^\"']*)[\"']\)/", $line, $m)) {
				$src = dataURL($baseDir . $m[1]);
				$line = preg_replace("/url\(([\"'])[^\"']*([\"'])\)/", "url($1$src$2)", $line);
			}
			$content .= $line;
		} else if ($fileType == "text/cache-manifest") {
			// Comment out manifest entries not related to splash screens or icons
			if (preg_match("/\.png/", $line) && !preg_match("/splash|icon/", $line)) {
				// $content .= "#" . $line;
			} else {
				$content .= $line;
			}
		} else {
			$content .= $line;
		}
	}
	fclose($file);
	return $content;
}

/*
 * Convert a file into a data URL
 */
function dataURL ($fileName) {
	$dataFile = fopen($fileName, "r");
	if (!dataFile) {
		header("HTTP/1.1 410 Gone");
		exit("fixImages.php error: " . $fileName . " missing");
	}
	$type = preg_replace("/.*\./", "", $fileName);
	$data = fread($dataFile, filesize($fileName));
	return ("data:image/" . $type . ";base64," . base64_encode($data));
}

?>
