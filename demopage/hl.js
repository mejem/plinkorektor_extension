'use strict';

{
  let $textarea = $("textarea");
  $textarea.addClass("hwt-input hwt-content");
  $textarea.attr("spellcheck", "false");
  $textarea.wrap("<div class='hwt-container'></div>");
}

$(".hwt-container").prepend("<div class='hwt-backdrop'></div>");
$(".hwt-backdrop").append("<div class='hwt-highlights hwt-content'></div>");

$("textarea").on("input", function () {
  var createLineSpan = function (hash, line) {
    let $lineSpan = $(document.createElement("span"));
    $lineSpan.attr("data-pk-hash", hash).html("<mark>" + line + "</mark>" + "\n").addClass("pk-line");
    return $lineSpan;
  }
  var $highlights = $(this).parent().find(".hwt-highlights");
  var lineSpans = $highlights.children().toArray();
  var lines = $(this).val().split("\n");
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var hash = hex_md5(line);
    if (i < lineSpans.length) {
      var lineSpan = lineSpans[i];
    } else {
      var $newLineSpan = createLineSpan(hash, line);
      $highlights.append($newLineSpan);
      startCorrector($newLineSpan);
      continue;
    }
    if ($(lineSpan).attr("data-pk-hash") != hash) {
      var $newLineSpan = createLineSpan(hash, line);
      $(lineSpan).after($newLineSpan);
      $(lineSpan).remove();
      startCorrector($newLineSpan);
    }
  }
  for (; i < lineSpans.length; i++) {
    $(lineSpans[i]).remove();
  }
});

function startCorrector($lineOfText) {
  setTimeout( function () {
    if ($lineOfText.parent().length) {
      tokenize($lineOfText);
    }
  }, 500);
}

$(".hwt-highlights").on("mouseenter", function () {
  var $highlights = $(this);
  // console.log($(this).text());
  $highlights.css("zIndex", 0);
  setTimeout(function () {
    $highlights.css("zIndex", 10);
  }, 1000);
});


$("textarea").on("scroll", function () {
  let scrollTop = $(this).scrollTop();
  $(this).parent().find(".hwt-backdrop").scrollTop(scrollTop);
});

$(".hwt-backdrop").on("scroll", function () { // toto by v budoucnu nemelo byt treba
  var backdrop = $(this);
  clearTimeout($(this).data('timeout'));
  $(this).data('timeout', setTimeout( function () {
    let scrollTop = backdrop.scrollTop();
    backdrop.parent().find("textarea").scrollTop(scrollTop);
  }, 50));
});

function tokenize($lineOfText) {
  var hash = $lineOfText.attr("data-pk-hash");
  var text = $lineOfText.text();
  $.ajax({
   type: 'POST',
   dataType: 'json',
   url: "https://nlp.fi.muni.cz/projekty/corrector/backend/tokenizer/tokenizer.cgi",
   data: {
       'hash': hash,
       'text': text
   },
   success: function (tokenizedData) {
     $lineOfText.empty();
     for (let tokenArray of tokenizedData.tokens) {
       let $token = $(document.createElement("span"));
       let type = tokenArray[0].toLowerCase();
       $token.addClass("pk-token pk-token-type-" + type).text(tokenArray[1]);
       $lineOfText.append($token);
     }
   }
  });
};
