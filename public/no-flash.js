(function(){
  var k = "tc-theme";
  var stored = localStorage.getItem(k);
  var theme = (stored === "light" || stored === "dark")
    ? stored
    : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
})();
