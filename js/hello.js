window.onload = main;

function main() {
    const canvas = document.getElementById("glcanvas");
    // todo: window.addEventListener('resize', () => resizeCanvas(canvas), false);
    resizeCanvas(canvas);

    const gl = canvas.getContext("webgl2");
    if (gl === null) {
        alert("Could not get webgl2 context");
        return;
    }

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    if (shaderProgram === null) {
        alert("Could not init shaders");
        return;
    }

    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        },
        uniformLocations: {
            screen_to_complex: gl.getUniformLocation(shaderProgram, 'screen_to_complex'),
            c: gl.getUniformLocation(shaderProgram, 'c'),
            color_shift: gl.getUniformLocation(shaderProgram, 'color_shift'),
        },
    };
    const buffers = initBuffers(gl);

    var state = {
        ts: 0,
        frameCount: 0,
        color_shift: 0.0,
        // todo: get initial c correctly
        // c: [0.38953656, -0.31281537],
        // c: [0.21832514, -0.5352248],
        // c: [0.3908895, -0.27208453],
        // c: [0.37071738, 0.12098181],
        // c: [-0.06418538, -0.89546055],
        // c: [0.4121178, 0.3591044],
        c: [-0.31659955, 0.6293436],
        // c: [0.45318604, 0.3860575],
    };

    canvas.addEventListener('mousemove', function (evt) {
        const mousePos = getMousePosInCanvas(canvas, evt);
        const halfWidth = canvas.clientWidth / 2;
        const halfHeight = canvas.clientHeight / 2;
        state.c = [(mousePos.x - halfWidth) / halfWidth, (mousePos.y - halfHeight) / halfHeight];
    }, false);

    // Draw the scene repeatedly
    function render(now) {
        state = updateState(state, now)
        drawScene(gl, programInfo, buffers, state);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

function updateState(curState, now) {
    now *= 0.001;  // convert to seconds

    // fps counter
    const wasSecondChange = (Math.trunc(now) - Math.trunc(curState.ts)) >= 1
    var newFrameCount = curState.frameCount + 1;
    if (wasSecondChange) {
        console.log(`${Math.trunc(now)}: ${newFrameCount} fps`);
        newFrameCount = 0;
    }

    const newState = {
        ts: now,
        frameCount: newFrameCount,
        color_shift: 0.1 * now,
        c: curState.c,
    };
    return newState;
}


// coords from top left corner (0, 0), x goes from right to left, y goes down
function getMousePosInCanvas(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top,
    };
}


function resizeCanvas(canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}


function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}


function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    // Send the source to the shader object
    gl.shaderSource(shader, source);

    // Compile the shader program
    gl.compileShader(shader);

    // See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}


function initBuffers(gl) {
    // Create a buffer for the square's positions.

    const positionBuffer = gl.createBuffer();

    // Select the positionBuffer as the one to apply buffer
    // operations to from here out.

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Now create an array of positions for the square.

    const positions = [
        -1.0, -1.0,
        1.0, -1.0,
        -1.0, 1.0,
        1.0, 1.0,
    ];

    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer.

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
    };
}


function drawScene(gl, programInfo, buffers, state) {
    gl.clearColor(0.0, 0.0, 1.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute.
    {
        const numComponents = 2;  // pull out 2 values per iteration
        const type = gl.FLOAT;    // the data in the buffer is 32bit floats
        const normalize = false;  // don't normalize
        const stride = 0;         // how many bytes to get from one set of values to the next
        // 0 = use type and numComponents above
        const offset = 0;         // how many bytes inside the buffer to start from
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexPosition);
    }

    // Tell WebGL to use our program when drawing
    gl.useProgram(programInfo.program);

    // Set the shader uniforms
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    // const aspect = gl.canvas.clientHeight / gl.canvas.clientWidth;
    // console.log(`w: ${gl.canvas.clientWidth}, h: ${gl.canvas.clientHeight}, a: ${aspect}`);
    const scale = 1.2;
    var screen_to_complex = [scale * aspect, scale];
    if (aspect < 1.0) {
        screen_to_complex = [scale, scale / aspect];
    }
    gl.uniform2fv(programInfo.uniformLocations.screen_to_complex, new Float32Array(screen_to_complex));
    gl.uniform1f(programInfo.uniformLocations.color_shift, state.color_shift);
    gl.uniform2fv(programInfo.uniformLocations.c, new Float32Array(state.c));

    {
        const offset = 0;
        const vertexCount = 4;
        gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    }
}


const vsSource = `#version 300 es

    precision highp float;

    uniform vec2 screen_to_complex;

    in vec2 aVertexPosition;
    out vec2 fragment_z;

    void main() {
        fragment_z = screen_to_complex * aVertexPosition;
        gl_Position = vec4(aVertexPosition, 0.0, 1.0);
    }
`;

const fsSource = `#version 300 es

    precision highp float;

    uniform vec2 c;
    uniform float color_shift;
    in vec2 fragment_z;
    out vec3 color;

    // Complex multiplication.
    vec2 cmul(vec2 a, vec2 b) {
        return vec2(a[0] * b[0] - a[1] * b[1],
                    a[0] * b[1] + a[1] * b[0]);
    }

    vec3 hsv2rgb(vec3 c)
    {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    void main() {
        vec2 z = fragment_z;
        int it = 0;
        const int limit = 150;
        for (it = 0; it < limit; it++) {
            z = cmul(z, z) + c;
            if (dot(z, z) > 4.0)
                break;
        }

        // Map the iteration count to value between 0 and 1.
        float gray;
        if (it >= limit) {
            color = vec3(fract(color_shift), 0.0, 0.0);
        } else {
            // Brighten things up a bit: invert, cube to push it towards zero,
            // and revert.
            gray = 1.0 - float(it) / float(limit);
            gray = pow(gray, 4.0);
            gray = fract(gray + color_shift);
            color = vec3(gray, 1.0, 0.8);
        }

        color = hsv2rgb(color);
    }
`;
