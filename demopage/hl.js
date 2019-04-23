'use strict';

$.expr[':'].regex = function(elem, index, match) {
    var matchParams = match[3].split(','),
        validLabels = /^(data|css):/,
        attr = {
            method: matchParams[0].match(validLabels) ?
                        matchParams[0].split(':')[0] : 'attr',
            property: matchParams.shift().replace(validLabels,'')
        },
        regexFlags = 'ig',
        regex = new RegExp(matchParams.join('').replace(/^\s+|\s+$/g,''), regexFlags);
    return regex.test(jQuery(elem)[attr.method](attr.property));
} // https://j11y.io/javascript/regex-selector-for-jquery/

$.expr[':'].icontains = function(a, i, m) {
  return jQuery(a).text().toUpperCase()
      .indexOf(m[3].toUpperCase()) >= 0;
};

$.expr[':'].textEquals = $.expr.createPseudo(function(arg) {
    return function( elem ) {
      return $(elem).text().match("^" + arg + "$");
    };
});

$.expr[':'].itextEquals = $.expr.createPseudo(function(arg) {
    return function( elem ) {
      var re = new RegExp("^" + arg + "$", "gi");
      return $(elem).text().match(re);
    };
});

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

function startCorrector($lineOfText) {
  setTimeout( function () {
    if ($lineOfText.parent().length) {
      tokenizer($lineOfText);
    }
  }, 500);
  var modules = ["lemmatagger", "heisenberg", "tritypo", "eyecheck", "abyss"];
  modules.forEach(function (mod) {
    $lineOfText.on("pk-tokenized", function () {
      window[mod]($lineOfText);
    });
  });
  $lineOfText.on("pk-lemmatagger", function () {
    commet($lineOfText);
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
   url: "https://nlp.fi.muni.cz/projekty/corrector/backend/commet/commet.cgi",
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
   url: "https://nlp.fi.muni.cz/projekty/corrector/backend/eyecheck/eyecheck.cgi",
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
       $lineOfText.children(".pk-token:contains('" + word + "')").each(function (i, token) {
         correct($(token), "Slovo '" + word + "' nebylo nalezeno ve slovníku, překontrolujte si jej, prosím.", "spelling");
       });
     });
   }
  });
}

function tritypo($lineOfText) {
  // WS_BEFORE: Whitespace before [.,;?!]
  $lineOfText.children(":contains('.'),:contains(','),:contains(';'),:contains('?'),:contains('!')").each(function (i, e) {
    if ($(e).prev().text() == " ") {
      correct($(e).prev(), "Odstraňte mezeru před '" + $(e).text() + "'", "typography");
    }
  });
  // WS_AFTER: Whitespace after [;?!]
  $lineOfText.children(":contains(';'),:contains('?'),:contains('!')").each(function (i, e) {
    if (!$(e).next().hasClass("pk-token-type-whitespace")) {
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
     $lineOfText.trigger("pk-lemmatagger");
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
