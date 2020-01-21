//Read config

var FSO = new ActiveXObject('Scripting.FileSystemObject');
var appPath = FSO.GetAbsolutePathName(".");
var FilePointer = FSO.OpenTextFile(appPath + '\\config.json', 1, false);
var appConfig = JSON.parse(FilePointer.ReadAll());
FilePointer.Close();

// Init
for (var i = 0; i < appConfig.logFiles.length; i++) {
    appConfig.logFiles[i].readLogsFlag = true;
}

// Set global vars and listeners
var shiftPressed = false;
document.addEventListener('keydown', function(e) {
    if (e.key == 'Shift') {
        shiftPressed = true;
    }
});

document.addEventListener('keyup', function(e) {
    if (e.key == 'Shift') {
        shiftPressed = false;
    }
});

// Monitor changes in files
var monitorFlag = true;
var monitorIntervalId;

const END_OF_STRING_DELIMITER = '191';
const BRACKET_EXPANDER = '9032';

