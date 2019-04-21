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
  var createLineSpan = function (hash, line) {
    let $lineSpan = $(document.createElement("span"));
    // $lineSpan.attr("data-pk-hash", hash).html("<mark>" + line + "</mark>" + "\n").addClass("pk-line");
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

function startCorrector($lineOfText) {
  setTimeout( function () {
    if ($lineOfText.parent().length) {
      tokenizer($lineOfText);
    }
  }, 500);
  $lineOfText.on("pk-tokenized", function () {
    lemmatagger($lineOfText);
  });
  $lineOfText.on("pk-tokenized", function () {
    heisenberg($lineOfText);
  });
}

function heisenberg($lineOfText) {
  var $spaces = $lineOfText.children(".pk-token-type-whitespace:contains(  )");
  correct($spaces, "Odstraňte přebytečné mezery.", heisenberg.name);
}

function correct($token, explanation, moduleName) {
  switch (moduleName) {
    case "heisenberg":
      let classes = "pk-token-correction pk-token-correction-typography";
      $token.addClass(classes);
      createTooltip($token, explanation);
      break;
    default:
      console.err("default for module" + moduleName);
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


// function htmlfy(dataText) {
//   return dataText.replace(/&/g, '&amp;') //       & -> &amp;
//   .replace(/</g, '&lt;') //       < -> &lt;
//   .replace(/>/g, '&gt;') //       > -> &gt;
//   .replace(/"/g, '&quot;') //       " -> &quot;
//   .replace(/'/g, '&apos;') //       ' -> &apos;
//   .replace(/\//g, '&#x2F;') //       / -> &#x2F;
//   .replace(/\n/g, '<br>') //      \n -> <br>
//   .replace(/ /g, '&nbsp;'); //     ' ' -> &nbsp;
// };
//
// function datafy(formattedText) {
//   return formattedText.replace(/<(?!br|\/br).+?>/gm, '') //  strip tags
//   .replace(/<br>/g, '\n') //  <br> -> \n
//   .replace(/&lt;/g, '<') //  &lt; -> <
//   .replace(/&gt;/g, '>') //  &gt; -> >
//   .replace(/&amp;/g, '&') //  &amp; -> &
//   .replace(/&quot;/g, '"') //  &quot -> "
//   .replace(/&apos;/g, "'") //  &apos -> '
//   .replace(/&#x2F/g, "/") //  &#x2F -> /
//   .replace(/&nbsp;/g, ' '); //  &nbsp; -> ' '
// };
