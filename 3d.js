let cubeRotation = 0.0;
main();

function main() {
  const canvas = document.createElement("canvas");
  const { width, height } = document.body.getBoundingClientRect();
  canvas.setAttribute("width", width);
  canvas.setAttribute("height", height);
  document.body.appendChild(canvas);

  const gl = canvas.getContext("webgl");

  if (gl === null) {
    return;
  }

  const vsSource = `
          attribute vec4 aVertexPosition;
          attribute vec4 aVertexColor;

          uniform mat4 uModelViewMatrix;
          uniform mat4 uProjectionMatrix;

          varying lowp vec4 vColor;

          void main() {
            gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
            vColor = aVertexColor;
          }
        `;

  const fsSource = `
          varying lowp vec4 vColor;

          void main() {
            gl_FragColor = vColor;
          }
        `;

  function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      console.log("failed to initialize shader program");
      return null;
    }

    return shaderProgram;
  }

  function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.log("failed to compile shader");
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

  const programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
      vertexColor: gl.getAttribLocation(shaderProgram, "aVertexColor")
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(
        shaderProgram,
        "uProjectionMatrix"
      ),
      modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix")
    }
  };

  let then = 0;

  // Draw the scene repeatedly
  function render(now) {
    now *= 0.001; // convert to seconds
    const deltaTime = now - then;
    then = now;

    drawScene(gl, programInfo, deltaTime);

    // requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

function cube(gl, moveX = 0.0) {
  const positionBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  const transformWithQuat = (arr, quat) => {
    return arr.reduce((acc, [...val], ix) => {
      vec3.transformQuat(val, val, quat);
      acc.push(val);
      return acc;
    }, []);
  };

  const cubeQuat = quat.setAxisAngle(
    quat.create(),
    vec3.normalize(vec3.create(), [1.0, 1.0, 0.0]),
    cubeRotation * 0.7
  );

  const front = Object.freeze([
    [-1.0, -1.0, 1.0],
    [1.0, -1.0, 1.0],
    [1.0, 1.0, 1.0],
    [-1.0, -1.0, 1.0],
    [-1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0]
  ]);

  const yQuat = degree =>
    quat.setAxisAngle(
      quat.create(),
      vec3.normalize(vec3.create(), [0.0, 1.0, 0.0]),
      degree * (Math.PI / 180)
    );

  const xQuat = degree =>
    quat.setAxisAngle(
      quat.create(),
      vec3.normalize(vec3.create(), [1.0, 0.0, 0.0]),
      degree * (Math.PI / 180)
    );

  const cube = [
    front,
    transformWithQuat(front, yQuat(180)),
    transformWithQuat(front, xQuat(90)),
    transformWithQuat(front, xQuat(-90)),
    transformWithQuat(front, yQuat(90)),
    transformWithQuat(front, yQuat(-90))
  ];

  const positions = cube.reduce((acc, side) => {
    // return [...acc, ...[].concat(...side)];

    return acc.concat(...transformWithQuat(side, cubeQuat));
  }, []);

  console.log(positions, "positions");

  // const positions = [].concat(...cube);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  const faceColors = [
    [1.0, 1.0, 1.0, 1.0], // Front face: white
    [1.0, 1.0, 1.0, 1.0], // Front face: white
    [1.0, 0.0, 0.0, 1.0], // Back face: red
    [1.0, 0.0, 0.0, 1.0], // Back face: red
    [0.0, 1.0, 0.0, 1.0], // Top face: green
    [0.0, 1.0, 0.0, 1.0], // Top face: green
    [0.0, 0.0, 1.0, 1.0], // Bottom face: blue
    [0.0, 0.0, 1.0, 1.0], // Bottom face: blue
    [1.0, 1.0, 0.0, 1.0], // Right face: yellow
    [1.0, 1.0, 0.0, 1.0], // Right face: yellow
    [1.0, 0.0, 1.0, 1.0], // Left face: purple
    [1.0, 0.0, 1.0, 1.0] // Left face: purple
  ];

  const colors = faceColors.reduce((colors, c) => {
    return colors.concat(c, c, c, c);
  }, []);

  const colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

  return {
    position: positionBuffer,
    color: colorBuffer
  };
}

function drawScene(gl, programInfo, deltaTime) {
  const buffersCollection = [cube(gl)];

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const fieldOfView = (45 * Math.PI) / 180;
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 100.0;
  const projectionMatrix = mat4.create();

  mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

  const modelViewMatrix = mat4.create();

  mat4.translate(modelViewMatrix, modelViewMatrix, [-0.0, 0.0, -7.5]);

  gl.useProgram(programInfo.program);

  gl.uniformMatrix4fv(
    programInfo.uniformLocations.projectionMatrix,
    false,
    projectionMatrix
  );
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.modelViewMatrix,
    false,
    modelViewMatrix
  );

  buffersCollection.forEach(buffers => {
    //start of cube
    {
      const numComponents = 3;
      const type = gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;

      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
      gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset
      );
      gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    }

    {
      const numComponents = 4;
      const type = gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;

      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
      gl.vertexAttribPointer(
        programInfo.attribLocations.vertexColor,
        numComponents,
        type,
        normalize,
        stride,
        offset
      );
      gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
    }

    {
      const vertexCount = 36;
      const type = gl.UNSIGNED_SHORT;
      const offset = 0;
      gl.drawArrays(gl.TRIANGLES, offset, vertexCount);
    }

    //end of cube
  });

  cubeRotation += deltaTime;
}
