'use strict';

{
  let $textarea = $("textarea");
  $textarea.addClass("hwt-input hwt-content");
  $textarea.attr("spellcheck", "false");
  $textarea.wrap("<div class='hwt-container'></div>");
}

$(".hwt-container").prepend("<div class='hwt-backdrop'></div>");
$(".hwt-backdrop").append("<div class='hwt-highlights hwt-content'></div>");

$("body").prepend("<div id='pk-tooltip-container'></div>");

$("textarea").on("input", function () {
  autoCorrect($(this));
  var createLineSpan = function (hash, line) {
    let $lineSpan = $(document.createElement("span"));
    $lineSpan.attr("data-pk-hash", hash).html(line + "\n").addClass("pk-line");
    return $lineSpan;
  }
  var $highlights = $(this).parent().find("div.hwt-highlights");
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

function autoCorrect($textarea) {
  var cursor = $textarea.prop("selectionEnd");
  var result = tritypoAuto($textarea.val());
  $textarea.val(result.text);
  $textarea.prop("selectionEnd", cursor + result.cursor);
}

function tritypoAuto(text) {
  var cursor = 0;
  var fixedWhitespace = '\u202F';
  // FIXED_PERCENT: There should be fixed whitespace between number and %
  text = text.replace(/(\d) %/g, "$1" + fixedWhitespace + "%");
  // PARAGRAPH: There should be fixed whitespace between § and number
  text = text.replace(/§ (\d)/g, "§" + fixedWhitespace + "$1");
  var tmp = text.match(/§(\d)/g);
  if (tmp) {
    cursor += tmp.length;
    text = text.replace(/§(\d)/g, "§" + fixedWhitespace + "$1");
  }
  return {
    text: text,
    cursor: cursor
  };
}

function startCorrector($lineOfText) {
  setTimeout( function () {
    if ($lineOfText.parent().length) {
      tokenizer($lineOfText);
    }
  }, 500);
  $lineOfText.on("pk-tokenized", function () {
    lemmatagger($lineOfText);
    heisenberg($lineOfText);
    tritypo($lineOfText);
  });
}

function tritypo($lineOfText) {
  // WS_BEFORE: Whitespace before [.,;?!]
  $lineOfText.children(":contains('.'),:contains(','),:contains(';'),:contains('?'),:contains('!')").each(function (i, e) {
    if ($(e).prev().text() == " ") {
      correct($(e).prev(), "Odstraňte mezeru před '" + $(e).text() + "'", tritypo.name);
    }
  });
  // WS_AFTER: Whitespace after [;?!]
  $lineOfText.children(":contains(';'),:contains('?'),:contains('!')").each(function (i, e) {
    if ($(e).next().text() != " ") {
      correct($(e), "Přidejte mezeru za '" + $(e).text() + "'", tritypo.name);
    }
  });
}

function heisenberg($lineOfText) {
  var $spaces = $lineOfText.children(".pk-token-type-whitespace:contains(  )");
  correct($spaces, "Odstraňte přebytečné mezery.", heisenberg.name);
}

function correct($token, explanation, moduleName) {
  switch (moduleName) {
    case "heisenberg":
    case "tritypo":
      let classes = "pk-token-correction pk-token-correction-typography";
      $token.addClass(classes);
      createTooltip($token, explanation);
      break;
    default:
      console.error("default for module " + moduleName);
  }
}

function createTooltip($token, text) {
  var $tooltip = $(document.createElement("div"));
  $tooltip.hide();
  $tooltip.addClass("pk-tooltip");
  $tooltip.text(text);
  $("#pk-tooltip-container").append($tooltip);
  $token.on("mouseenter", function () {
    $token.css("zIndex", 0);
    let coordinates = {
      top: $token.offset().top + 20 ,
      left: $token.offset().left - $tooltip.width()/2
    };
    $tooltip.css(coordinates);
    $tooltip.show();
    setTimeout(function () {
      $token.css("zIndex", 10);
      $tooltip.hide();
    }, 1000);
  });
}

function tokenizer($lineOfText) {
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
   success: function (data) {
     if (data == "#INVALID") {
       console.error("Tokenizer failed on: " + text);
     }
     $lineOfText.empty();
     for (let tokenArray of data.tokens) {
       let $token = $(document.createElement("span"));
       let type = tokenArray[0].toLowerCase();
       $token.addClass("pk-token pk-token-type-" + type).text(tokenArray[1]);
       $lineOfText.append($token);
     }
     $lineOfText.trigger("pk-tokenized");
   }
  });
};

function lemmatagger($lineOfText) {
  var hash = $lineOfText.attr("data-pk-hash");
  var tokens = $lineOfText.children(".pk-token:not(.pk-token-type-whitespace)").map(function () {
    return $(this).text();
  }).get();
  // console.log(JSON.stringify(tokens));
  $.ajax({
   type: 'POST',
   dataType: 'json',
   url: "https://nlp.fi.muni.cz/projekty/corrector/backend/lemmatagger/lemmatagger.cgi",
   data: {
       'hash': hash,
       'tokens': JSON.stringify(tokens)
   },
   success: function (data) {
     if (data == "#INVALID") {
       console.error("Lemmatagger failed on: " + JSON.stringify(tokens));
     }
     for (let lemmatag of data.lemmata_tags) {
       if (lemmatag.length == 3) {
         $lineOfText.children(".pk-token:contains(" + lemmatag[0] + ")").attr("data-pk-lemma", lemmatag[1]).attr("data-pk-tag", lemmatag[2]);
       } else if (lemmatag[0] != "") {
         console.error("Lemmatagger assertion error");
       }
     }
   }
  });
};

// $(".hwt-highlights").on("mouseenter", function () {
//   var $highlights = $(this);
//   // console.log($(this).text());
//   $highlights.css("zIndex", 0);
//   setTimeout(function () {
//     $highlights.css("zIndex", 10);
//   }, 1000);
// });

$("textarea").on("scroll", function () {
  let scrollTop = $(this).scrollTop();
  $(this).parent().find(".hwt-backdrop").scrollTop(scrollTop);
});

// $(".hwt-backdrop").on("scroll", function () { // toto by v budoucnu nemelo byt treba
//   var backdrop = $(this);
//   clearTimeout($(this).data('timeout'));
//   $(this).data('timeout', setTimeout( function () {
//     let scrollTop = backdrop.scrollTop();
//     backdrop.parent().find("textarea").scrollTop(scrollTop);
//   }, 50));
// });
