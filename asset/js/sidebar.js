function sidebarAction() {
  var sb = document.getElementById("sidebar");
  var opacity = sb.style.opacity;
  if (sb.style.opacity == 1) {
    sb.style.opacity = 0;
    sb.style.width = "0px";
  } else {
    sb.style.opacity = 1;
    sb.style.width = "clamp(300px, 20%, 420px)";
  }
}
