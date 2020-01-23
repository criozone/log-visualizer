function JsonFormatter(config) {
    const BRACKET_EXPANDER = 9032;
    const END_OF_STRING_DELIMITER = 191;

    if (typeof config !== 'object') {
        config = {};
    }

    this.config = Object.assign({
        "bracketExpanderCode":  BRACKET_EXPANDER,
        "indentElemWith": 40,
        "indentElemClass": "indent-class",
        "expanderStyles": "cursor: pointer; font-weight: bold",
        "expanderClass": "json-expander"
    }, config);

    this.openTags = ['{', '['];
    this.closingTags = ['}', ']'];
    this.ctarget = 0;
    this.formatJson = function(jsonStr) {
        var currentChar, resultStr = '', depth = 0;
        jsonStr = this.prepareString(jsonStr);

        for (var i = 0; i < jsonStr.length; i++) {
            currentChar = jsonStr.charAt(i);
            if (this.openTags.indexOf(currentChar) > -1) {
                resultStr += currentChar + '<span style="' + this.config.expanderStyles +
                    '" class="' + this.config.expanderClass + '" data-collapse-target="ctarget' + this.ctarget + '" >' +
                    String.fromCharCode(this.config.bracketExpanderCode)+'</span>' + '<span id="ctarget' + this.ctarget + '" >';
                depth++;
                this.ctarget++;
            } else if (jsonStr.charCodeAt(i) === END_OF_STRING_DELIMITER) {
                resultStr += '<br><span class="' + this.config.indentElemClass + '" style="padding-left: ' + depth * this.config.indentElemWith + 'px;"></span>';
            } else if (this.closingTags.indexOf(currentChar) > -1) {
                depth--;
                resultStr += '<br><span class="' + this.config.indentElemClass + '" style="padding-left: ' + depth * this.config.indentElemWith + 'px;" ></span></span>'+currentChar;
            } else {
                resultStr += currentChar;
            }
        }

        return '' + resultStr + '';
    };
    this.prepareString = function(inStr) {
        var outStr = '';

        var reg = /([\{\[])/g;
        outStr = inStr.replace(reg, '$1'+String.fromCharCode(END_OF_STRING_DELIMITER));

        reg = /(\}\s*,)/g;
        outStr = outStr.replace(reg, '$1'+String.fromCharCode(END_OF_STRING_DELIMITER));

        reg = /(\]\s*,)/g;
        outStr = outStr.replace(reg, '$1'+String.fromCharCode(END_OF_STRING_DELIMITER));

        reg = /"\s*,\s*"/g;
        outStr = outStr.replace(reg, '",'+String.fromCharCode(END_OF_STRING_DELIMITER)+'"');

        reg = /\:\s*null\s*,\s*"/g;
        outStr = outStr.replace(reg, '"null,'+String.fromCharCode(END_OF_STRING_DELIMITER)+'"');

        outStr = this.handleNestedBrackets(outStr);

        //TODO: доработать случаи: "key": null,; "key": 123456,

        return outStr;
    };
    this.handleNestedBrackets = function(inStr) {
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
            inStr = this.handleNestedBrackets(inStr);
        }
        return inStr;
    };
};