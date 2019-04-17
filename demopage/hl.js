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
  // var $textarea = $(this);

  var $highlights = $(this).parent().find(".hwt-highlights");
  var lineSpans = [];
  var lines = $(this).val().split("\n");
  for (let line of lines) {
    var hash = hex_md5(line);
    let $spanId = $("#" + hash);
    if ($spanId.length) {
      console.log($spanId.text().length);
      // console.log(hash, "exists");
      lineSpans.push($spanId);
    } else {
      // console.log(hash, "changed");
      var lineSpan = document.createElement("span");
      // $(lineSpan).prop("id", hash).text(line).addClass("pk-line");
      $(lineSpan).prop("id", hash).html("<mark>" + line + "\n" + "</mark>").addClass("pk-line");
      lineSpans.push(lineSpan);
    }
  }
  $highlights.empty();
  $highlights.append(lineSpans);


  // console.log(lineSpans);

  // var marked = "";
  // var count = 0;
  // for (var w of $(this).val().split(" ")) {
  //   if (!(count % 5)) {
  //     marked += "<mark>" + w + "</mark> ";
  //   } else {
  //     marked += w + " ";
  //   }
  //   count++;
  // }
  // console.log(marked);
  // $(this).parent().find(".hwt-highlights").html(marked);
  $($highlights).on("mouseenter", function () {
    // console.log($(this).text());
    $highlights.css("zIndex", 0);
    setTimeout(function () {
      $highlights.css("zIndex", 10);
    }, 1000);
    // $(this).prepend("<div class='pk-tooltip'>I am THE tooltip</div>");
  });
  $("mark").on("mouseenter", function () {
    // console.log($(this).text());
    // $highlights.css("zIndex", 0);
    // setTimeout(function () {
    //   $highlights.css("zIndex", 10);
    // }, 1000);
    // $(this).prepend("<div class='pk-tooltip'>I am THE tooltip</div>");
  });
  // $("mark").on("mouseleave", function () {
  //   console.log($(this).text());
  //   // $textarea.css( "zIndex", 20 );
  //
  //   setTimeout(function () {
  //     $highlights.css("zIndex", 10);
  //   }, 1000);
  //   // $(this).append("<div class='underline'></div>");
  // });
  // $("mark").on("hover", function () {
  //   $highlights.zIndex(-10);
  //   console.log($(this).text());
  //   // $(this).append("<div class='underline'></div>");
  // });
});

// $("mark").on("mouseover", function () {
//   console.log($(this).text());
//   // console.log($(this).closest(".hwt-highlights"));
//   // $textarea.css( "zIndex", 20 );
//   // $highlights.css("zIndex", 0);
//   // $(this).append("<div class='underline'></div>");
// });
// $("mark").on("mouseleave", function () {
//   console.log($(this).text());
//   // console.log($(this).closest(".hwt-highlights"));
//   // $textarea.css( "zIndex", 20 );
//   // $highlights.css("zIndex", 0);
//   // $(this).append("<div class='underline'></div>");
// });


$("textarea").on("scroll", function () {
  let scrollTop = $(this).scrollTop();
  $(this).parent().find(".hwt-backdrop").scrollTop(scrollTop);
});

$(".hwt-backdrop").on("scroll", function () {
  var backdrop = $(this);
  clearTimeout($(this).data('timeout'));
  $(this).data('timeout', setTimeout( function () {
    let scrollTop = backdrop.scrollTop();
    backdrop.parent().find("textarea").scrollTop(scrollTop);
  }, 50));
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
