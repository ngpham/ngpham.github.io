(function(glbctx) {
  var garunpTrefoilKnot = function() {
    var canvas;
    var canvas_w;
    var canvas_h;
    var recSize;
    var context;
    var timeout;
    var p_x, p_y;
    var num = 6;
    var simple = false;
    var x;
    var y;
    var prev_x;
    var prev_y;
    var radius;
    var lim1 = 0.0;
    var lim2 = Math.PI * 2;
    var resolution = 420;
    var stepSize = (lim2 - lim1) / resolution;
    var offset;
    var colorVar, c1, c2, c3;
    var step = 0;
    var fade = 32;
    var fps = 12;
    var rgba = ['192', '92', '32', '0.8', '0.5', '0.5'];

    var init = function(cvs, n, style) {
      canvas = cvs;
      num = n;
      if (style !== undefined)
        rgba = style.split(',');
      rgba = rgba.map(function(x) { return +x; });

      canvas_w = cvs.width;
      canvas_h = cvs.height;

      context = canvas.getContext('2d');

      x = new Array(num);
      y = new Array(num);
      prev_x = new Array(num);
      prev_y = new Array(num);
      offset = Math.floor(resolution / num);

      reset();
    }

    var reset = function() {
      clearTimeout(timeout);
      step = 0;
      colorVar = 0;
      recSize = Math.min(canvas_w, canvas_h);
      radius = Math.round(recSize / 7);
      p_x = Math.round(canvas_w / 2);
      p_y = Math.round(canvas_h / 2);

      for (var i = 0; i < num; i++) {
        x[i] = cache.getXY(i * offset)[0];
        y[i] = cache.getXY(i * offset)[1];
      }

      anim();
    };

    var anim = function() {
      var current = step * stepSize;

      for (var i = 0; i < num; i++) {
        prev_x[i] = x[i];
        prev_y[i] = y[i];
        x[i] = cache.getXY(step + i * offset)[0];
        y[i] = cache.getXY(step + i * offset)[1];
      }

      c3 = 16 * Math.cos(colorVar * 8);
      c1 = Math.floor(56 * Math.cos(colorVar * 4) + c3);
      c2 = Math.floor(56 * Math.sin(colorVar * 4) - c3);

      context.lineCap = 'round';
      context.strokeStyle =
        'rgba(' + (rgba[0] + c1) + ',' +
        (rgba[1] + c2) + ',' +
        (rgba[2] - c1) + ',' +
        (rgba[3] + c3/100) +
        ')';

      context.lineWidth = radius * 0.1 + radius * 0.001 * c3;
      for (var i = 0; i < num; i++) {
        draw_line(p_x, p_y, prev_x[i], prev_y[i], x[i], y[i]);
      }

      context.strokeStyle =
        'rgba(' + (rgba[0] + c1) + ',' +
        (rgba[1] + c2) + ',' +
        (rgba[2] - c1) + ',' +
        (rgba[4] + c3/75) +
        ')';

      context.lineWidth = radius * 0.2 + radius * 0.005 * c3;
      for (var i = 0; i < num; i++) {
        draw_line(p_x, p_y, prev_x[i], prev_y[i], x[i], y[i]);
      }

      context.strokeStyle =
        'rgba(' + (rgba[0] + c1) + ',' +
        (rgba[1] + c2) + ',' +
        (rgba[2] - c1) + ',' +
        (rgba[5] + c3/50) +
        ')';

      context.lineWidth = radius * 0.1 - radius * 0.01 * c3;
      for (var i = 0; i < num; i++) {
        draw_line(p_x, p_y, prev_x[i], prev_y[i], x[i], y[i]);
      }


      step += 1;
      colorVar += stepSize * Math.cos(current);
      if (step > 0) {
        context.fillStyle = 'rgba(0, 0, 0, 0.08)';
        context.fillRect(0, 0, canvas_w, canvas_h);
      }

      if (step < resolution) {
        timeout = setTimeout(anim, fps);
      } else {
        cache.ready = true;
        reset();
      }
    };

    var draw_line = function(x, y, x1, y1, x2, y2) {
      context.beginPath();
      context.moveTo(x + x1, y + y1);
      context.lineTo(x + x2, y + y2);
      context.stroke();
      context.closePath();
    };

    var cache = function() {
      var cacheX = new Array(resolution);
      var cacheY = new Array(resolution);
      var ready = false;

      var getXY = function(step) {
        var param = step * stepSize;
        if (!ready) {
          cacheX[step] = radius * (Math.sin(param) + 2 * Math.sin(2 * param));
          cacheY[step] = radius * (Math.cos(param) - 2 * Math.cos(2 * param));
        }
        return Array(cacheX[step], cacheY[step]);
      };

      return {
        getXY: getXY,
        ready: ready,
      };
    }();

    return {
      info: 'garunp.trefoilknot',
      init: init
    };
  }();

  glbctx.garunpTrefoilKnot = garunpTrefoilKnot;
  })(typeof window === 'undefined' ? this : window);
