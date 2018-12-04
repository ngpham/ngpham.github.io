window.addEventListener('load', function() {
  var cvs = document.getElementById('_shadebob');
  var tkData = {n:6, style:'192, 92, 32, 0.9, 0.5, 0.6'};
  window.addEventListener('resize', function() {
    garunpTrefoilKnot.init(cvs, tkData.n, tkData.style);
  });
  window.addEventListener('orientationchange', function() {
    garunpTrefoilKnot.init(cvs, tkData.n, tkData.style);
  });
  garunpTrefoilKnot.init(cvs, tkData.n, tkData.style);
});
