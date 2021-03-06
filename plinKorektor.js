'use strict';

function escapeRegExp(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

$.expr[':'].textEquals = $.expr.createPseudo(function(arg) {
    return function( elem ) {
      return $(elem).text().match("^" + escapeRegExp(arg) + "$");
    };
});

$.expr[':'].itextEquals = $.expr.createPseudo(function(arg) {
    return function( elem ) {
      var re = new RegExp("^" + escapeRegExp(arg) + "$", "gi");
      return $(elem).text().match(re);
    };
});

{
  let $textarea = $("textarea");
  if ($textarea.is(":visible")) {
    $textarea.addClass("hwt-input hwt-content");
    $textarea.attr("spellcheck", "false");
    $textarea.wrap("<div class='hwt-container'></div>");
  }
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
  var text = $textarea.val();
  text = cvokAuto(text);
  var result = tritypoAuto(text);
  $textarea.val(result.text);
  $textarea.prop("selectionEnd", cursor + result.cursor);
  var newHash = hex_md5(result.text);
  $textarea.attr("data-pk-hash", newHash);
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

function cvokAuto(text) {
  var fixedWhitespace = '\u00A0';
  text = text.replace(/([KSVZksvzAI]) /g, "$1" + fixedWhitespace);
  return text;
}

function startCorrector($lineOfText) {
  setTimeout( function () {
    if ($lineOfText.parent().length) {
      tokenizer($lineOfText);
    }
  }, 500);
  var modules = ["lemmatagger", "heisenberg", "tritypo", "eyecheck", "abyss", "cvok"];
  modules.forEach(function (mod) {
    $lineOfText.on("pk-tokenized", function () {
      window[mod]($lineOfText);
    });
  });
  $lineOfText.on("pk-lemmatagger", function () {
    commet($lineOfText);
  });
}

function cvok($lineOfText) {
  const consonants = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'z'];
  const vocals = ['a', 'e', 'i', 'o', 'u', 'y'];
  var $tokens = $lineOfText.children(".pk-token-type-whitespace");
  $tokens.each(function (i, e) {
    if ($(e).text() == "\n") {
      return;
    }
    let preposition = $(e).prev().text().toLowerCase();
    let next_letter = $(e).next().text().charAt(0).toLowerCase();
    let next_word_cleaned =  $(e).next().text().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
    if (preposition == 's' && $(e).next().text() == "sebou") {
      return;
    }
    if (
      (preposition == 'k' && (next_letter == 'k' || next_letter == 'g'))
      || ((preposition == 's' || preposition == 'z')
          && (next_letter == 's' || next_letter == 'š' || next_letter == 'z' || next_letter == 'ž'))
      || (preposition == 'v' && (next_letter == 'v' || next_letter == 'f'))
    ) {
      let explanation = 'Změňte "' + $(e).prev().text() + '" na "' + $(e).prev().text() + 'e" před "' + $(e).next().text() + '".'
      correct($(e).prev(), explanation, "grammar");
    } else if (
      (vocals.includes(next_letter) || (consonants.includes(next_word_cleaned.charAt(0).toLowerCase()) && vocals.includes(next_word_cleaned.charAt(1).toLowerCase())))
    ) {
      if (
        (preposition == 'ke' && (next_letter == 'k' || next_letter == 'g'))
        || (preposition == 'ze' && (next_letter == 's' || next_letter == 'š' || next_letter == 'z' || next_letter == 'ž'))
        || (preposition == 've' && (next_letter == 'v' || next_letter == 'f'))
      ) {
        return;
      } else {
        let explanation = 'Změňte "' + $(e).prev().text() + '" na "' + $(e).prev().text().slice(0, -1) + '" před "' + $(e).next().text() + '".'
      }
    }
  });
}

function abyss($lineOfText) {
  $lineOfText.children(":itextEquals(abys),:itextEquals(bys),:itextEquals(kdybys)").each(function (i, e) {
    if ($(e).next().hasClass("pk-token-type-whitespace") && ["si", "se"].includes($(e).next().next().text())) {
      let explanation = "Změňte '" + $(e).text() + " " + $(e).next().next().text() + "' na '" + $(e).text().slice(0, -1) + " " + $(e).next().next().text() + "s'.";
      correct($(e), explanation, "grammar");
      correct($(e).next(), explanation, "grammar");
      correct($(e).next().next(), explanation, "grammar");
    }
  });
  $lineOfText.children(":itextEquals(jsi)").each(function (i, e) {
    if ($(e).next().hasClass("pk-token-type-whitespace") && ["si", "se"].includes($(e).next().next().text())) {
      let explanation = "Změňte '" + $(e).text() + " " + $(e).next().next().text() + "' na '" + $(e).next().next().text() + "s'.";
      correct($(e), explanation, "grammar");
      correct($(e).next(), explanation, "grammar");
      correct($(e).next().next(), explanation, "grammar");
    }
  });
  $lineOfText.children(":itextEquals(by),:itextEquals(aby),:itextEquals(kdyby)").each(function (i, e) {
    if ($(e).next().hasClass("pk-token-type-whitespace") && ['jsme', 'jste', 'jsem'].includes($(e).next().next().text())) {
      let rules = {
        "jsme": "chom",
        "jste": "ste",
        "jsem": "ch"
      };
      let explanation = "Změňte '" + $(e).text() + " " + $(e).next().next().text() + "' na '" + $(e).text() + rules[$(e).next().next().text().toLowerCase()] + "'.";
      correct($(e), explanation, "grammar");
      correct($(e).next(), explanation, "grammar");
      correct($(e).next().next(), explanation, "grammar");
    }
  });
  $lineOfText.children(":itextEquals(bysme),:itextEquals(bysem)").each(function (i, e) {
    let rules = {
      "bysme": "ychom",
      "bysem": "ych"
    };
    let explanation = "Změňte '" + $(e).text() + "' na '" + $(e).text().slice(0, 1) + rules[$(e).text().toLowerCase()] + "'.";
    correct($(e), explanation, "grammar");
  });
}

function commet($lineOfText) {
  var hash = $lineOfText.attr("data-pk-hash");
  var $tokens = $lineOfText.children(":not(.pk-token-type-whitespace)");
  var tokens_data = $tokens.map(function (i, e) {
    return {
      position: i,
      word: $(e).text(),
      lemma: $(e).attr("data-pk-lemma"),
      tag: $(e).attr("data-pk-tag")
    };
  }).get();

  $.ajax({
   type: 'POST',
   dataType: 'json',
   url: "https://nlp.fi.muni.cz/projekty/corrector/xejem/backend/commet/commet.cgi",
   data: {
       'hash': hash,
       'tokens_data': JSON.stringify(tokens_data)
   },
   success: function (data) {
     if (data == "#INVALID") {
       console.error("Commet failed");
     }
     for (let index of data.tokens) {
       let $token = $tokens.eq(index + 1);
       correct($token, "Doplňte čárku před '" + $token.text() + "'", "grammar");
     }
   }
  });
}

function eyecheck($lineOfText) {
  var hash = $lineOfText.attr("data-pk-hash");
  var tokens = $lineOfText.children(".pk-token-type-word").toArray();
  var words = tokens.map(function (e) {
    return $(e).text();
  });
  words = Array.from(new Set(words)); // remove duplicities

  $.ajax({
   type: 'POST',
   dataType: 'json',
   url: "https://nlp.fi.muni.cz/projekty/corrector/xejem/backend/eyecheck/eyecheck.cgi",
   data: {
     'hash': hash,
     'tokens': JSON.stringify({
         'tokens' : words,
         'words' : words
     })
   },
   success: function (data) {
     if (data == "#INVALID") {
       console.error("Eyecheck failed");
     }
     data.tokens.forEach(function (word) {
       $lineOfText.children(".pk-token:textEquals('" + word + "')").each(function (i, token) {
         correct($(token), "Slovo '" + word + "' nebylo nalezeno ve slovníku, překontrolujte si jej, prosím.", "spelling");
       });
     });
   }
  });
}

function tritypo($lineOfText) {
  // WS_BEFORE: Whitespace before [.,;?!]
  $lineOfText.children(":textEquals('.'),:textEquals(','),:textEquals(';'),:textEquals('?'),:textEquals('!')").each(function (i, e) {
    if ($(e).prev().text() == " ") {
      correct($(e).prev(), "Odstraňte mezeru před '" + $(e).text() + "'", "typography");
    }
  });
  // WS_AFTER: Whitespace after [;?!]
  $lineOfText.children(":textEquals(';'),:textEquals('?'),:textEquals('!')").each(function (i, e) {
    if ($(e).next().hasClass("pk-token-type-word")) {
      correct($(e), "Přidejte mezeru za '" + $(e).text() + "'", "typography");
    }
  });
}

function heisenberg($lineOfText) {
  var $spaces = $lineOfText.children(".pk-token-type-whitespace:contains(  )");
  correct($spaces, "Odstraňte přebytečné mezery.", "typography");
}

function correct($token, explanation, type) {
  var types = ["typography", "spelling", "grammar"];
  if ($.inArray(type, types) == -1) {
    console.error("invalid type of mistake: " + type);
  }
  var classes = "pk-token-correction pk-token-correction-" + type;
  $token.addClass(classes);
  createTooltip($token, explanation);
}

function createTooltip($token, text) {
  var $tooltip = $(document.createElement("div"));
  $tooltip.hide();
  $tooltip.addClass("pk-tooltip");
  $tooltip.text(text);
  $("#pk-tooltip-container").append($tooltip);
  $token.on("mouseenter", function () {
    $("#pk-tooltip-container").children().hide();
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
   url: "https://nlp.fi.muni.cz/projekty/corrector/xejem/backend/tokenizer/tokenizer.cgi",
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

  $.ajax({
   type: 'POST',
   dataType: 'json',
   url: "https://nlp.fi.muni.cz/projekty/corrector/xejem/backend/lemmatagger/lemmatagger.cgi",
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
         $lineOfText.children(".pk-token:textEquals(" + lemmatag[0] + ")").attr("data-pk-lemma", lemmatag[1]).attr("data-pk-tag", lemmatag[2]);
       } else if (lemmatag[0] != "") {
         console.error("Lemmatagger assertion error");
       }
     }
     $lineOfText.trigger("pk-lemmatagger");
   }
  });
};

$("textarea").on("scroll", function () {
  let scrollTop = $(this).scrollTop();
  $(this).parent().find(".hwt-backdrop").scrollTop(scrollTop);
});
