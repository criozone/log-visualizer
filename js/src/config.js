//Read config

var FSO = new ActiveXObject('Scripting.FileSystemObject');
var appPath = FSO.GetAbsolutePathName(".");
var FilePointer = FSO.OpenTextFile(appPath + '\\config.json', 1, false);
var appConfig = JSON.parse(FilePointer.ReadAll());
FilePointer.Close();

//Filters config
var appFilters = {};

// Init
var fileMapper = {};
for (var i = 0; i < appConfig.logFiles.length; i++) {
    appConfig.logFiles[i].readLogsFlag = true;
    fileMapper[appConfig.logFiles[i].id] = i;
    appFilters[appConfig.logFiles[i].id] = false;
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

var jsFormatter = new JsonFormatter();
