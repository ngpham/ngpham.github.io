<div id="sidebar" markdown="1"
    style="height: 100%; width: clamp(300px, 20%, 420px);
        position: absolute; left: 0; top: 0;
        padding-top: 40px;
        padding-left: 40px;
        opacity: 1;
        display: block;
        transition: 0.5s;">
  <div style="padding: 0px; background: #000;
              border-radius: 50%;
              width: 240px;
              margin: 0 auto;
              display: block;
              overflow: hidden;">
    <iframe id="showTrefoilKnot"
            width="240px"
            height="240px"
            frameBorder="0"
            src="./pages/trefoilknot.html">
    </iframe>
  </div>
  <div markdown="1" style="text-align: center">

# Nguyen Pham #

  <a href="https://www.linkedin.com/in/nguyendinhpham/"><i class="fa-brands fa-linkedin fa-2x"></i></a>
  <a href="https://github.com/ngpham"><i class="fa-brands fa-github fa-2x"></i></a>
  </div>
</div>

<button id="sidebarButton"
    style="font-weight: bold;
          position: absolute; left: 40px; top: 40px;"
    onclick="sidebarAction()">
  &#9776;
</button>

<div id="bodytext" markdown="1">

# Posts #

**[Disruptor, Multithreading Message Broker](./posts/2018-11-03-disruptor.md)**

**[Actor with asynchronous networking, a DIY toy](./posts/2018-11-26-actor.md)**

**[Actor with Types](./posts/2019-01-02-typedactor.md)**

</div>

<script type="text/javascript" src="./asset/js/load-mathjax.js" async></script>
<script type="text/javascript" src="./asset/js/load-fontawesome.js" async></script>
<script type="text/javascript" src="./asset/js/sidebar.js"></script>
