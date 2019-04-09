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

       var text = datafy($(fakeDiv).html());
       var hash = hex_md5(text);
       if (hash == tokenizedData.hash) {
         $(fakeDiv).html("");
         $(fakeDiv).append(tokenized);
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
