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
  var marked = "";
  var count = 0;
  for (var w of $(this).val().split(" ")) {
    if (!(count % 5)) {
      marked += "<mark>" + w + "</mark> ";
    } else {
      marked += w + " ";
    }
    count++;
  }
  // console.log(marked);
  $(this).parent().find(".hwt-highlights").html(marked);
  $("mark").on("click", function () {
    console.log($(this).text());
    // $(this).append("<div class='underline'></div>");
  });
});

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
