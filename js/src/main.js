window.onload = function() {
    var monitorCheckbox = document.getElementById('monitor')
    if (monitorCheckbox) {
        monitorCheckbox.addEventListener('click', function(e) {
            monitorFlag = this.checked;
            if (monitorFlag) {
                monitor();
            } else {
                stopMonitor();
            }
        },false);
    }

    var clearLogsBtn = document.getElementById('clear-logs')
    if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', clearLogs, false);
    }

    var swpapDownBtn = document.getElementById('swap_down');
    if (swpapDownBtn) {
        swpapDownBtn.addEventListener('click', function (e) {
            document.getElementById('mock').scrollIntoView();
        }, false);
    }

    initFilters();
    readLogs();
}

function initFilters() {
    var filtersContainer = document.getElementById('filters-container');
    var checkbox, pElem, label;
    for (var i = 0; i < appConfig.logFiles.length; i++) {
        checkbox = document.createElement('input');
        checkbox.type = "checkbox";
        checkbox.id = appConfig.logFiles[i].id;

        label = document.createElement('label')
        label.htmlFor = appConfig.logFiles[i].id;
        label.appendChild(document.createTextNode(appConfig.logFiles[i].id.toUpperCase()));

        checkbox.addEventListener('click', filterLogs, false);

        pElem = document.createElement('p');
        pElem.appendChild(checkbox);
        pElem.appendChild(label)

        filtersContainer.appendChild(pElem);
    }
}

function filterLogs(e) {
    appFilters[e.target.id] = this.checked;
    updateView();
}

function updateView() {

    var logItemsColl = document.querySelectorAll('.log-item');

    //console.log(logItemsColl.length);

    for (var i = 0; i < logItemsColl.length; i++) {
        if (isfiltrationEnabled()) {
            if (!appFilters[logItemsColl[i].getAttribute('data-file-id')]) {
                logItemsColl[i].style.display = "none";
            } else {
                logItemsColl[i].style.display = "block";
            }
        } else {
            logItemsColl[i].style.display = "block";
        }
    }
}

function isfiltrationEnabled() {
    for (var prop in appFilters) {
        if (appFilters[prop]) return true;
    }
    return false;
}

function clearLogs() {
    var textStream;
    for (var i = 0; i < appConfig.logFiles.length; i++) {
        clearFile(appConfig.logFiles[i].path);
    }
    var contentElem = document.getElementById("content");
    if (!contentElem) return;
    while (contentElem.firstChild) {
        contentElem.removeChild(contentElem.firstChild);
    }
}

function clearFile(path) {
    try{
        textStream = FSO.OpenTextFile(path, 2, -1);
        textStream.Write("");
        textStream.Close();
    } catch (e) {
        console.log(e.message);
    }
}

function formatInfoPart(infoStr) {
    var reg = /(\[.*\])\s(.*)\slocal\.([a-zA-Z]*)\:(.*)/;
    var newstr = infoStr.replace(reg, function(match, p1, p2, p3, p4) {
        var result = match.replace(p1, '<span class="log-time">'+p1+'</span>');
        result = result.replace(p2, '<span class="log-service">'+p2+'</span>');
        result = result.replace(p3, '<span class="log-type">'+p3+'</span>');
        result = result.replace(p4, '<span class="log-message">'+p4+'</span>');
        return result;
    });
    return newstr;
}

function createLogItemElem(logStr) {
    var jsonPart = getJsonPart(logStr);
    var infoPart = getInfoPart(logStr);
    infoPart = formatInfoPart(infoPart);

    var logElem = document.createElement('div');
    var logHeaderElem = document.createElement('div');
    var logBodyElem = document.createElement('div');

    logElem.setAttribute("class", "log-item");
    logHeaderElem.setAttribute("class", "log-item-header");
    logBodyElem.setAttribute("class", "log-item-body");

    logHeaderElem.innerHTML = '<span class="log-expand"></span>' + infoPart;
    jsonPart = formatJson(jsonPart, logBodyElem);
    logBodyElem.innerHTML = '<pre>' + jsonPart + '</pre>';

    var expandersCollection = logBodyElem.querySelectorAll('span.json-expander')
    for (var i=0; i < expandersCollection.length; i++) {
        expandersCollection[i].addEventListener('click', function(e) {
            var targetSpanElem = document.getElementById(e.target.getAttribute('data-collapse-target'));
            if (!targetSpanElem) return;
            if (targetSpanElem.style.display === "none") {
                targetSpanElem.style.display = 'inline';
            } else {
                targetSpanElem.style.display = 'none';
            }
        });
    }

    // Добавляем горизонтальный скролл при нажатому shift
    logBodyElem.addEventListener('mousewheel', function(e) {
        if (!shiftPressed) return;
        e = window.event || e;
        var parentElem = e.target.parentElement;
        while (parentElem && parentElem.getAttribute('class') != 'log-item-body') {
            parentElem = parentElem.parentElement;
        }
        if (!parentElem) return;
        var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
        parentElem.scrollLeft -= (delta*40); // Multiplied by 40
        e.preventDefault();
    })


    var logExpandElem = logHeaderElem.querySelector('span.log-expand');
    if (logExpandElem) {
        logExpandElem.addEventListener("click", logElemClicked, false);
    }

    logElem.appendChild(logHeaderElem);
    logElem.appendChild(logBodyElem);

    return logElem;
}

function getTimeFromLog(logStr) {
    var temp;
    var matches = logStr.match(/^\[([\d\-\s\.\:]*)\]/);
    if (matches && matches.length > 1) {
        return matches[1];
    }
    return null;
}

function logElemClicked(e) {
    var logItemElem = e.target.parentElement.parentElement;

    if (!logItemElem) {
        return;
    }

    if (logItemElem.getAttribute('class') == 'log-item') {
        logItemElem.setAttribute('class', 'log-item selected');
    } else if (logItemElem.getAttribute('class') == 'log-item selected') {
        logItemElem.setAttribute('class', 'log-item');
    }
}

function readLogs() {
    var logItemsArray = [];
    var tempLogItem;
    var tempStr = '';
    var lastModified;
    var tempTimeStr;
    var logsContainerElem = document.getElementById('content');

    stopMonitor();
    deleteMock();

    var FilePointer;
    for (var i = 0; i < appConfig.logFiles.length; i++) {
        if (appConfig.logFiles[i].readLogsFlag === false) continue;
        appConfig.logFiles[i].lastModified = getLastModified(appConfig.logFiles[i].path);

        FilePointer = FSO.OpenTextFile(appConfig.logFiles[i].path, 1, -1);
        while (!FilePointer.AtEndOfStream) {
            tempStr = FilePointer.ReadLine();
            if (isLogSeparatorStr(tempStr)) continue;

            tempTimeStr = getTimeFromLog(tempStr);

            if (tempTimeStr <= appConfig.logFiles[i].lastLogDate) {
                continue;
            }

            tempLogItem = createLogItemElem(tempStr);
            if (!tempLogItem) continue;
            logItemsArray.push({
                "fileId": appConfig.logFiles[i].id,
                "logItemType": getLogItemType(tempStr),
                "logTime": tempTimeStr,
                "logElem": tempLogItem
            });
            appConfig.logFiles[i].lastLogDate = tempTimeStr;
        }
        FilePointer.Close();
        appConfig.logFiles[i].readLogsFlag = false;
    }
    // sort
    logItemsArray.sort(function(a, b) {
        if (a.logTime > b.logTime) {
            return 1;
        }
        if (a.logTime < b.logTime) {
            return -1;
        }
        return 0;
    });

    //append
    for (i = 0; i < logItemsArray.length; i++) {
        if (logItemsArray[i].logElem) {
            logItemsArray[i].logElem.setAttribute('data-file-id', logItemsArray[i].fileId);
            logItemsArray[i].logElem.setAttribute('data-item-type', logItemsArray[i].logItemType);
            logItemsArray[i].logElem.setAttribute('data-item-time', logItemsArray[i].logTime);
            logItemsArray[i].logElem.setAttribute('title', appConfig.logFiles[fileMapper[logItemsArray[i].fileId]].path);
            logsContainerElem.appendChild(logItemsArray[i].logElem);
            if (isfiltrationEnabled() && !appFilters[logItemsArray[i].fileId]) {
                logItemsArray[i].logElem.style.display = "none";
            }
        }
    }

    insertMock();
    document.getElementById('mock').scrollIntoView();
    monitor();
}

function getLastModified(path) {
    tempFile = FSO.GetFile(path);
    return  tempFile.DateLastModified;
}

function getJsonPart(logStr) {
    return logStr.slice(logStr.indexOf('{"'));
}

var ctarget = 0;
function formatJson(jsonStr) {
    var resultStr = '';
    var openTags = ['{', '['];
    var closingTags = ['}', ']'];
    var depth = 0;
    var depthMultiplier = 4; // количество пробелов
    var currentChar;

    jsonStr = prepareString(jsonStr);

    for (var i = 0; i < jsonStr.length; i++) {
        currentChar = jsonStr.charAt(i);
        if (openTags.indexOf(currentChar) > -1) {
            resultStr += currentChar + '<span style="cursor: pointer; font-weight: bold" class="json-expander" data-collapse-target="ctarget' + ctarget + '" >'
                +String.fromCharCode(BRACKET_EXPANDER)+'</span>' + '<span id="ctarget' + ctarget + '" >';
            depth++;
            ctarget++;
        } else if (jsonStr.charCodeAt(i) == END_OF_STRING_DELIMITER) {
            resultStr += '<br>'+' '.repeat(depth * depthMultiplier);
        } else if (closingTags.indexOf(currentChar) > -1) {
            depth--;
            resultStr += '<br>' + ' '.repeat(depth*depthMultiplier)+'</span>'+currentChar;
        } else {
            resultStr += currentChar;
        }
    }
    return resultStr;
}

function prepareString(inStr) {
    var outStr = '';

    var reg = /([\{\[])/g;
    outStr = inStr.replace(reg, '$1'+String.fromCharCode(END_OF_STRING_DELIMITER));

    reg = /(\}\s*,)/g;
    outStr = outStr.replace(reg, '$1'+String.fromCharCode(END_OF_STRING_DELIMITER));

    reg = /(\]\s*,)/g;
    outStr = outStr.replace(reg, '$1'+String.fromCharCode(END_OF_STRING_DELIMITER));

    reg = /"\s*,\s*"/g;
    outStr = outStr.replace(reg, '",'+String.fromCharCode(END_OF_STRING_DELIMITER)+'"');

    outStr = handleNestedBrackets(outStr);

    //TODO: доработать случаи: "key": null,; "key": 123456,

    return outStr;
}

function handleNestedBrackets(inStr) {
    var outStr = '';
    var hasMatch = false;

    if (inStr.match(/\}\s*\}/)) { //  }}
        hasMatch = true;
        inStr = inStr.replace(/\}\s*\}/g, '}'+ String.fromCharCode(END_OF_STRING_DELIMITER) +'}');
    } else if (inStr.match(/\}\s*\]/)) {  // }]
        hasMatch = true;
        inStr = inStr.replace(/\}\s*\]/g, '}'+ String.fromCharCode(END_OF_STRING_DELIMITER) +']');
    } else if (inStr.match(/\]\s*\}/)) {  // ]}
        hasMatch = true;
        inStr = inStr.replace(/\]\s*\}/g, ']'+ String.fromCharCode(END_OF_STRING_DELIMITER) +'}');
    } else if (inStr.match(/\]\s*\]/)) {  // ]]
        hasMatch = true;
        inStr = inStr.replace(/\]\s*\]/g, ']'+ String.fromCharCode(END_OF_STRING_DELIMITER) +']');
    }
    if (hasMatch) {
        inStr = handleNestedBrackets(inStr);
    }
    return inStr;
}

function getInfoPart(logStr) {
    return logStr.slice(0, logStr.indexOf('{"'));
}

function isLogSeparatorStr(inStr) {
    if (inStr.indexOf('++++') == 0) {
        return true;
    }
    return false;
}

function getLogItemType(logStr) {
    var matches = logStr.match(/local\.(.*?)\:/);
    if (matches && matches.length > 0) {
        return matches[1];
    }
    return null;
}

function monitor() {
    if (monitorFlag) {
        monitorIntervalId = setInterval(checkChanges, 5000, appConfig.logFiles)
    }
}

function stopMonitor() {
    clearInterval(monitorIntervalId);
}

function checkChanges() {
    if (!monitorFlag) {
        return;
    }
    var lastModified;
    var changedFlag = false;
    for (var i = 0; i < appConfig.logFiles.length; i++) {
        lastModified = getLastModified(appConfig.logFiles[i].path);;

        if (!appConfig.logFiles[i].lastModified && appConfig.logFiles[i].lastModified < lastModified) {
            changedFlag = true;
            appConfig.logFiles[i].readLogsFlag = true;
            tempColl = document.querySelectorAll('div[data-file-id="' + appConfig.logFiles[i].id + '"]');
            if (tempColl.length > 0) {
                appConfig.logFiles[i].lastLogDate = tempColl[tempColl.length-1].getAttribute('data-item-time');
            }
        }
    }
    if (changedFlag) {
        readLogs();
    }
}

function insertMock() {
    var mock = document.createElement('div');
    mock.setAttribute('id', 'mock');
    mock.setAttribute('style', 'height: 100px; background-color: #ffffff');

    document.getElementById('content').appendChild(mock);
}

function deleteMock() {
    var element = document.getElementById('mock');
    if (element) {
        document.getElementById('content').removeChild(element);
    }
}













































