'use strict';

$("textarea").each( function (index, realTextarea) {
  // --- replace textarea with contenteditable div
  var fakeDiv = document.createElement("div");
  $(fakeDiv).css("-webkit-appearance", "textarea");
  var propertiesToCopy = ["border", "font", "height", "width", "background-color", "padding", "margin", "resize", "overflow", "display"];
  for (var property of propertiesToCopy) {
    $(fakeDiv).css(property, $(realTextarea).css(property));
  }
  // $(fakeDiv).copyCSS(realTextarea, null, ["blacklisted"]);
  $(fakeDiv).attr("contentEditable", "true");
  $(fakeDiv).html(htmlfy(realTextarea.value));
  $(realTextarea).after(fakeDiv);
  // $(realTextarea).hide();

  // --- copy text to original hidden textarea
  $(fakeDiv).on("input", function () {
    var text = datafy($(fakeDiv).html());
    var hash = hex_md5(text);
    $(realTextarea).val(text);

    clearTimeout($(this).data('timeout'));
    $(this).data('timeout', setTimeout( function () {
      tokenize(fakeDiv, hash, text);
    }, 500));
  });
});

function tokenize(fakeDiv, hash, text) {
  $.ajax({
   type: 'POST',
   dataType: 'json',
   url: "https://nlp.fi.muni.cz/projekty/corrector/backend/tokenizer/tokenizer.cgi",
   data: {
       'hash': hash,
       'text': text
   },
   success: function (tokenizedData) {
       console.log(tokenizedData);
       var tokenized = [];
       for (var tokenArray of tokenizedData.tokens) {
         var token = document.createElement("g");
         $(token).attr("data-pk-token-type", tokenArray[0]);
         $(token).text(tokenArray[1]);
         tokenized.push(token);
       }
       // var tokenizedHtml = tokenizedData.tokens.map( function (index, tokenArray) {
       //   var token = document.createElement("g");
       //   $(token).attr("data-pk-token-type", tokenArray[0]);
       //   $(token).text(tokenArray[1]);
       //   return token;
       // }).get().join();

       var text = datafy($(fakeDiv).html());
       var hash = hex_md5(text);
       if (hash == tokenizedData.hash) {
         saveCursor(fakeDiv);
         $(fakeDiv).html("");
         $(fakeDiv).append(tokenized);
         restoreCursor(fakeDiv);
       }
   }
  });
};

function htmlfy(dataText) {
  return dataText.replace(/&/g, '&amp;') //       & -> &amp;
  .replace(/</g, '&lt;') //       < -> &lt;
  .replace(/>/g, '&gt;') //       > -> &gt;
  .replace(/"/g, '&quot;') //       " -> &quot;
  .replace(/'/g, '&apos;') //       ' -> &apos;
  .replace(/\//g, '&#x2F;') //       / -> &#x2F;
  .replace(/\n/g, '<br>') //      \n -> <br>
  .replace(/ /g, '&nbsp;'); //     ' ' -> &nbsp;
};

function datafy(formattedText) {
  return formattedText.replace(/<(?!br|\/br).+?>/gm, '') //  strip tags
  .replace(/<br>/g, '\n') //  <br> -> \n
  .replace(/&lt;/g, '<') //  &lt; -> <
  .replace(/&gt;/g, '>') //  &gt; -> >
  .replace(/&amp;/g, '&') //  &amp; -> &
  .replace(/&quot;/g, '"') //  &quot -> "
  .replace(/&apos;/g, "'") //  &apos -> '
  .replace(/&#x2F/g, "/") //  &#x2F -> /
  .replace(/&nbsp;/g, ' '); //  &nbsp; -> ' '
};

function restoreCursor(root) {
  if (document.activeElement != root) return;
  var sel = window.getSelection();
  if (!sel.isCollapsed) return;

  var _nodeAndOffset = nodeAndOffset(root.getAttribute('data-cursor'), root);

  var _nodeAndOffset2 = _slicedToArray(_nodeAndOffset, 2);

  var anchor = _nodeAndOffset2[0];
  var offset = _nodeAndOffset2[1];

  if (anchor && offset >= 0) {
    sel.collapse(anchor, offset);
  }
}

function saveCursor(root) {
  if (document.activeElement != root) return;
  var sel = window.getSelection();
  if (!sel.isCollapsed) return;
  var anchor = sel.anchorNode;
  var offset = sel.anchorOffset;
  if (!root.contains(anchor)) return;
  var loc = cursorLocation(root, anchor, offset);
  root.setAttribute('data-cursor', loc);
}

function cursorLocation(root, anchor, offset, cur) {
  if (!cur) cur = root;
  if (cur == anchor) {
    return lengthOfNodeToOffset(anchor, offset);
  } else if (!cur.contains(anchor) && // current node before anchor
  root.contains(commonAncestor(cur, anchor)) && cur.compareDocumentPosition(anchor) == Node.DOCUMENT_POSITION_FOLLOWING) {
    return lengthOfNode(cur);
  } else if (!cur.contains(anchor) && // current node after anchor
  root.contains(commonAncestor(cur, anchor)) && cur.compareDocumentPosition(anchor) == Node.DOCUMENT_POSITION_PRECEDING) {
    return 0;
  } else if (cur.contains(anchor)) {
    var _location = 0;
    for (var i = 0, len = cur.childNodes.length; i < len; i++) {
      _location += cursorLocation(root, anchor, offset, cur.childNodes[i]);
    }
    return _location;
  }
  return 0;
}

function lengthOfNode(node) {
  if (node.nodeType == Node.TEXT_NODE) {
    return node.nodeValue.length;
  } else if (node.tagName == "BR") {
    return 1;
  } else if (node.tagName == "SPAN" || node.tagName == "DIV") {
    var len = 0;
    for (var i = 0, _len = node.childNodes.length; i < _len; i++) {
      len += lengthOfNode(node.childNodes[i]);
    }
    return len;
  }
  return 0;
}

function lengthOfNodeToOffset(node, offset) {
  if (node.nodeType == Node.TEXT_NODE) {
    return offset;
  } else if (node.tagName == "BR") {
    // not correct behavior.
    return offset;
  } else if (node.tagName == "SPAN" || node.tagName == "DIV") {
    var len = 0;
    for (var i = 0; i < offset; i++) {
      len += lengthOfNode(node.childNodes[i]);
    }
    return len;
  }
  return offset;
}

function nodeAndOffset(_x2, _x3) {
  var _again = true;

  _function: while (_again) {
    var location = _x2,
        node = _x3;
    i = _len = child = undefined;
    _again = false;

    if (lengthOfNode(node) < location) return [];
    if (node.nodeType == Node.TEXT_NODE) {
      return [node, location];
    } else if (node.tagName == "BR") {
      switch (thisBrowser) {
        case "Chrome":
          return [node.nextSibling, 0];
          break;
        case "Firefox":
          if (node.nextSibling.tagname == "BR") {
            return [node.nextSibling, 0];
          } else {
            return [node, 0];
          }
        case "IE":
        case "Safari":
        default:
          return [node, location];
      }
    } else {
      for (var i = 0, _len = node.childNodes.length; i < _len; i++) {
        var child = node.childNodes[i];
        if (lengthOfNode(child) < location) {
          location -= lengthOfNode(child);
        } else {
          _x2 = location;
          _x3 = child;
          _again = true;
          continue _function;
        }
      }
    }
  }
}
