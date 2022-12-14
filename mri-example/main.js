"use strict";

function main() {
  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  var canvas = document.querySelector("#canvas");
  var gl = canvas.getContext("webgl");
  if (!gl) {
    return;
  }

  // text box
  // look up the divcontainer
  var divContainerElement = document.querySelector("#divcontainer");

  divContainerElement.addEventListener("click", function () { showCoords(event) });

  // make the div
  var div = document.createElement("div");

  // assign it a CSS class
  div.className = "floating-div";

  // make a text node for its content
  var textNode = document.createTextNode("");
  div.appendChild(textNode);

  // add it to the divcontainer
  divContainerElement.appendChild(div);

  var imagePath = 'https://upload.wikimedia.org/wikipedia/commons/b/b2/MRI_of_Human_Brain.jpg';

  // setup GLSL program
  var program = webglUtils.createProgramFromScripts(gl, ["drawImage-vertex-shader", "drawImage-fragment-shader"]);

  // look up where the vertex data needs to go.
  var positionLocation = gl.getAttribLocation(program, "a_position");
  var texcoordLocation = gl.getAttribLocation(program, "a_texcoord");

  // lookup uniforms
  var matrixLocation = gl.getUniformLocation(program, "u_matrix");
  var textureLocation = gl.getUniformLocation(program, "u_texture");

  // Create a buffer.
  var positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Put a unit quad in the buffer
  var positions = [
    0, 0,
    0, 1,
    1, 0,
    1, 0,
    0, 1,
    1, 1,
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  // Create a buffer for texture coords
  var texcoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);

  // Put texcoords in the buffer
  var texcoords = [
    0, 0,
    0, 1,
    1, 0,
    1, 0,
    0, 1,
    1, 1,
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);

  /**
   * Init program for line
   */
  // setup GLSL program
  var programLine = webglUtils.createProgramFromScripts(gl, ["drawLine-vertex-shader", "drawLine-fragment-shader"]);

  // look up where the vertex data needs to go.
  var positionLineLocation = gl.getAttribLocation(program, "a_position");

  // Create a buffer.
  var positionLineBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionLineBuffer);

  // Put a unit quad in the buffer
  var positions = [
    0, 0,
    0, 1,
    1, 0,
    1, 0,
    0, 1,
    1, 1,
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

 
  // creates a texture info { width: w, height: h, texture: tex }
  // The texture will start with 1x1 pixels and be updated
  // when the image has loaded
  function loadImageAndCreateTextureInfo(url) {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    // Fill the texture with a 1x1 blue pixel.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 255, 255]));

    // let's assume all images are not a power of 2
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    var textureInfo = {
      width: 1,   // we don't know the size until it loads
      height: 1,
      texture: tex,
    };
    var img = new Image();
    img.addEventListener('load', function () {
      textureInfo.width = canvas.width;
      textureInfo.height = canvas.height;

      gl.bindTexture(gl.TEXTURE_2D, textureInfo.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    });
    img.crossOrigin = 'anonymous';
    img.src = url;

    return textureInfo;
  }

  var texInfo = loadImageAndCreateTextureInfo(imagePath);

  function draw() {
    webglUtils.resizeCanvasToDisplaySize(gl.canvas);

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.clear(gl.COLOR_BUFFER_BIT);

    var dstX = 0;
    var dstY = 0;
    var dstWidth = texInfo.width;
    var dstHeight = texInfo.height;

    drawImage(
      texInfo.texture,
      texInfo.width,
      texInfo.height,
      dstX, dstY, dstWidth, dstHeight);
  }

  function render(time) {
    draw();


    // draw Lines()

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);

  // modality 0 draws lines without loop
  // modality 1 draws lines with loop (first and last nodes connected)
  function drawLines(x, y, modality = 0) {
    var x1 = ((x / 500) * 2) - 1;
    var x2 = ((x + 50) / 500 * 2) - 1;
    var y1 = ((y / 500) * 2) - 1;
    var y2 = ((y + 50) / 500 * 2) - 1;

    // console.log(x1, x2, y1, y2);

    const squareBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, squareBuffer);

    // NOTE: gl.bufferData(gl.ARRAY_BUFFER, ...) will affect
    // whatever buffer is bound to the `ARRAY_BUFFER` bind point
    // but so far we only have one buffer. If we had more than one
    // buffer we'd want to bind that buffer to `ARRAY_BUFFER` first.
    var colorUniformLocation = gl.getUniformLocation(program, "u_color");

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      x1, y1,
      x2, y1,
      x1, y2,
      x1, y2,
      x2, y1,
      x2, y2]), gl.STATIC_DRAW);

    gl.uniform4f(colorUniformLocation, 1, 1, 0, 1);

    // Draw the triangle
    if (modality == 0) {
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      // gl.drawArrays(gl.LINE_STRIP, 0, 6);
    }
    else {
      gl.drawArrays(gl.LINE_LOOP, 0, 6);
    }
  }

  // Unlike images, textures do not have a width and height associated
  // with them so we'll pass in the width and height of the texture
  function drawImage(
    tex, texWidth, texHeight,
    dstX, dstY, dstWidth, dstHeight) {
    if (dstWidth === undefined) {
      dstWidth = texWidth;
    }

    if (dstHeight === undefined) {
      dstHeight = texHeight;
    }

    gl.bindTexture(gl.TEXTURE_2D, tex);

    // Tell WebGL to use our shader program pair
    gl.useProgram(program);

    // Setup the attributes to pull data from our buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.enableVertexAttribArray(texcoordLocation);
    gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);

    // this matrix will convert from pixels to clip space
    var matrix = m4.orthographic(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);

    // this matrix will translate our quad to dstX, dstY
    matrix = m4.translate(matrix, dstX, dstY, 0);

    // this matrix will scale our 1 unit quad
    // from 1 unit to texWidth, texHeight units
    matrix = m4.scale(matrix, dstWidth, dstHeight, 1);

    // Set the matrix.
    gl.uniformMatrix4fv(matrixLocation, false, matrix);

    // Tell the shader to get the texture from texture unit 0
    gl.uniform1i(textureLocation, 0);

    // draw the quad (2 triangles, 6 vertices)
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function showCoords(ev) {
    var mousePositionX = ev.clientX;
    var mousePositionY = ev.clientY;
    var rect = canvas.getBoundingClientRect();
    var x = ev.clientX - rect.left;
    var y = ev.clientY - rect.top;

    // console.log('ev.client x: ' + mousePositionX + ', y: ' + mousePositionY);
    // console.log('ev.client - rect x: ' + x + ', y: ' + y);

    // position the div in pixel
    div.style.left = Math.floor(mousePositionX) + "px";
    div.style.top = Math.floor(mousePositionY) + "px";
    div.style.color = "white";
    var textShow = 'x: ' + x + ', y: ' + y;
    textNode.nodeValue = textShow;
    displayText(textShow);
    drawLines(x, y, 0);
    requestAnimationFrame(render);
  }

  function displayText(message) {
    document.getElementById("displayResult").textContent = message;
  }
}

main();
