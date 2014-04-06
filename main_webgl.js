var gl;
var sw_config = {
    texture: 0,
    light: 0,
    reset_pos: 0,
    bg_color: [0.957, 0.957, 0.957],
    bg_color_a: 1,
    change: false,
    camera: [2, 2, 2]
};
var glinfo = {
    m_e_left: undefined,
    m_e_right: undefined,
    m_e_roll: undefined,
    previous_x: null,
    previous_y: null,
    shaderProgram: undefined,
    stackModelViewMatrix: [],
    stackProjectionMatrix: [],
};
var gl_uMatrix = {
    modelViewMatrix: undefined,
    projectionMatrix: undefined,
    rotationMatrix: undefined,
    moveMatrix: undefined
}
var glbuffer = {
    vertexBuffer_bottom: undefined,
    colorBuffer_bottom: undefined,
    normalBuffer_bottom: undefined,
    vertexBuffer_axis_x: undefined,
    colorBuffer_axis_x: undefined,
    normalBuffer_axis_x: undefined,
    vertexBuffer_axis_y: undefined,
    colorBuffer_axis_y: undefined,
    normalBuffer_axis_y: undefined,
    vertexBuffer_axis_z: undefined,
    colorBuffer_axis_z: undefined,
    normalBuffer_axis_z: undefined,
    vertexBuffer_data: undefined,
    indexBuffer_data: undefined,
    colorBuffer_data: undefined,
    normalBuffer_data: undefined,
}
//获取上下文
    function initWebGLContext(canvas) {
        var names = ["webgl", "experimental-webgl"];
        for (var i = 0; i < names.length; i++) {
            try {
                gl = canvas.getContext(names[i]);
            } catch (e) {}
            if (gl) {
                break;
            }
        }
        if (gl) {
            gl.viewportWidth = canvas.width;
            gl.viewportHeight = canvas.height;
        } else {
            alert("Failed to create WebGL context!");
        }
        return gl;
    }
    //编译shader
    function Utilities_Shader_CompileShader(gl, id) {
        var shaderScript = document.getElementById(id);
        if (!shaderScript) {
            return null;
        }

        var str = "";
        var k = shaderScript.firstChild;
        while (k) {
            if (k.nodeType == 3) {
                str += k.textContent;
                //console.log(k.textContent + "\n");
            }
            k = k.nextSibling;
        }

        var shader;
        if (shaderScript.type == "x-shader/x-fragment") {
            shader = gl.createShader(gl.FRAGMENT_SHADER);
        } else if (shaderScript.type == "x-shader/x-vertex") {
            shader = gl.createShader(gl.VERTEX_SHADER);
        } else {
            return null;
        }

        gl.shaderSource(shader, str);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert(gl.getShaderInfoLog(shader));
            return null;
        }
        return shader
    }
    //初始化ShaderProgram
    function initShader() {
        var vertexShader = Utilities_Shader_CompileShader(gl, "vs");
        var fragmentShader = Utilities_Shader_CompileShader(gl, "fs");
        var shaderProgram = gl.createProgram();
        //固定格式
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            alert("Failed to setup shaders");
        }
        gl.useProgram(shaderProgram);

        shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aPos");
        gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

        shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aColor");
        gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

        shaderProgram.vertexPostionNormalAttribute = gl.getAttribLocation(shaderProgram, "aPos_normal");
        gl.enableVertexAttribArray(shaderProgram.vertexPostionNormalAttribute);

        shaderProgram.vertexUniformMVMatrix = gl.getUniformLocation(shaderProgram, "uMVMatrix");
        shaderProgram.vertexUniformPMatrix = gl.getUniformLocation(shaderProgram, "uPMatrix");
        shaderProgram.vertexUniformRMatrix = gl.getUniformLocation(shaderProgram, "uRMatrix");
        shaderProgram.vertexUniformMoveMatrix = gl.getUniformLocation(shaderProgram, "uMoveMatrix");

        shaderProgram.lightUniformCo = gl.getUniformLocation(shaderProgram, "uLightCo");
        shaderProgram.lightUniformDi = gl.getUniformLocation(shaderProgram, "uLightDi");
        shaderProgram.lightUniformEn = gl.getUniformLocation(shaderProgram, "uLightEn");

        glinfo.shaderProgram = shaderProgram;
    }
    //绘画
    function draw() {
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.uniform3fv(glinfo.shaderProgram.lightUniformCo, [0.8, 0.8, 0.8]);
        gl.uniform3fv(glinfo.shaderProgram.lightUniformDi, [0, 0, -1]);
        gl.uniform3fv(glinfo.shaderProgram.lightUniformEn, [0.2, 0.2, 0.2]);

        uploadUniformMatrix();
        drawArraysFunc(glbuffer.vertexBuffer_bottom, glbuffer.colorBuffer_bottom, glbuffer.normalBuffer_bottom, gl.LINES);

        drawElementArraysFunc(glbuffer.vertexBuffer_data, glbuffer.indexBuffer_data, glbuffer.colorBuffer_data, glbuffer.normalBuffer_data, gl.TRIANGLES);

        var IMatrix = mat4.identity(mat4.create());
        gl.uniformMatrix4fv(glinfo.shaderProgram.vertexUniformMoveMatrix, false, IMatrix);
        gl.uniformMatrix4fv(glinfo.shaderProgram.vertexUniformRMatrix, false, IMatrix);
        drawArraysFunc(glbuffer.vertexBuffer_axis_x, glbuffer.colorBuffer_axis_x, glbuffer.normalBuffer_axis_x, gl.LINES);
        drawArraysFunc(glbuffer.vertexBuffer_axis_y, glbuffer.colorBuffer_axis_y, glbuffer.normalBuffer_axis_y, gl.LINES);
        drawArraysFunc(glbuffer.vertexBuffer_axis_z, glbuffer.colorBuffer_axis_z, glbuffer.normalBuffer_axis_y, gl.LINES);


    }
    //初始化工作区
    function startup() {
        var canvas = $("#plottingCanvas").get(0);
        gl = initWebGLContext(canvas);
        initBuffer();
        initShader();

        gl.clearColor(sw_config.bg_color[0], sw_config.bg_color[1], sw_config.bg_color[2], sw_config.bg_color_a);
        gl.enable(gl.DEPTH_TEST);

        tick();
        canvas.onmousedown = handleMouseDown;
        document.onmousemove = handleMouseMove;
        document.onmouseup = handleMouseUp;
    }
    //初始化缓冲区
    function initBuffer() {
        drawLineRect(-1.0, -1.0, 1.5, 1.5, 100, [0, 0.4, 0]);
        drawLineXAxis([1, 0, 0]);
        drawLineYAxis([0, 1, 0]);
        drawLineZAxis([0, 0, 1]);
        drawTriangleData(2 / 100);
        drawTriangleDataIndex();
        drawTriangleDataColor();
        drawTriangleDataNormal();
    }
    //绘制动画
    function tick() {
        requestAnimFrame(tick);
        if (sw_config.reset_pos) {
            mat4.identity(gl_uMatrix.moveMatrix);
            mat4.identity(gl_uMatrix.rotationMatrix);
        }
        draw();
    }

    //@@定制的功能函数//
    //子函数 --绘制 固定颜色 
    function drawArraysFunc(vertexBuffer, colorBuffer, normalBuffer, drawMethod) {
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.vertexAttribPointer(glinfo.shaderProgram.vertexColorAttribute, colorBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.vertexAttribPointer(glinfo.shaderProgram.vertexPositionAttribute, vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.vertexAttribPointer(glinfo.shaderProgram.vertexPostionNormalAttribute, normalBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.drawArrays(drawMethod, 0, vertexBuffer.numItems);
    }
    //子函数 --绘制 有颜色 索引 
    function drawElementArraysFunc(vertexBuffer, indexBuffer, colorBuffer, normalBuffer, drawMethod) {
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.vertexAttribPointer(glinfo.shaderProgram.vertexColorAttribute, colorBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.vertexAttribPointer(glinfo.shaderProgram.vertexPositionAttribute, vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.vertexAttribPointer(glinfo.shaderProgram.vertexPostionNormalAttribute, normalBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.drawElements(drawMethod, indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    }

    //子函数 --上传矩阵信息
    function uploadUniformMatrix() {
        if (!gl_uMatrix.modelViewMatrix) {
            gl_uMatrix.modelViewMatrix = mat4.create();
            mat4.identity(gl_uMatrix.modelViewMatrix);
        }
        mat4.lookAt([sw_config.camera[0], sw_config.camera[1], sw_config.camera[2]], [0, 0, 0], [0, 0, 1], gl_uMatrix.modelViewMatrix);
        gl.uniformMatrix4fv(glinfo.shaderProgram.vertexUniformMVMatrix, false, gl_uMatrix.modelViewMatrix);


        if (!gl_uMatrix.projectionMatrix) {
            gl_uMatrix.projectionMatrix = mat4.create();
            mat4.identity(gl_uMatrix.projectionMatrix);
            mat4.perspective(60, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, gl_uMatrix.projectionMatrix);
        }
        gl.uniformMatrix4fv(glinfo.shaderProgram.vertexUniformPMatrix, false, gl_uMatrix.projectionMatrix);

        if (!gl_uMatrix.rotationMatrix) {
            gl_uMatrix.rotationMatrix = mat4.create();
            mat4.identity(gl_uMatrix.rotationMatrix);
        }
        gl.uniformMatrix4fv(glinfo.shaderProgram.vertexUniformRMatrix, false, gl_uMatrix.rotationMatrix);

        if (!gl_uMatrix.moveMatrix) {
            gl_uMatrix.moveMatrix = mat4.create();
            mat4.identity(gl_uMatrix.moveMatrix);
        }
        gl.uniformMatrix4fv(glinfo.shaderProgram.vertexUniformMoveMatrix, false, gl_uMatrix.moveMatrix);
    }

    //子函数 --对ModelView矩阵压栈
    function pushModelViewMatrix() {
        var copyToPush = mat4.create(gl_uMatrix.modelViewMatrix);
        glinfo.stackModelViewMatrix.push(copyToPush);
    }
    //子函数 --对ModelView矩阵弹栈
    function popModelViewMatrix() {
        gl_uMatrix.modelViewMatrix = glinfo.stackModelViewMatrix.pop();
    }
    //子函数 --对Projection矩阵压栈
    function pushProjectionMatrix() {
        var copyToPush = mat4.create(gl_uMatrix.projectionMatrix);
        glinfo.stackProjectionMatrix.push(copyToPush);
    }
    //子函数 --对Projection矩阵弹栈
    function popProjectionMatrix() {
        gl_uMatrix.projectionMatrix = glinfo.stackProjectionMatrix.pop();
    }


    //子函数 --创建顶点缓冲区  颜色缓冲区 法线缓冲区
    function createVCNBuffer(Verteices, itemSize) {
        var vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(Verteices), gl.STATIC_DRAW);
        vertexBuffer.itemSize = itemSize;
        vertexBuffer.numItems = Verteices.length / itemSize;
        return vertexBuffer;
    }
    //子函数 --创建顶点索引缓冲区
    function createVertexIndexBuffer(Indices) {
        var vertexIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(Indices), gl.STATIC_DRAW);
        vertexIndexBuffer.itemSize = 1;
        vertexIndexBuffer.numItems = Indices.length;
        return vertexIndexBuffer;
    }

    //@@只在初始化时执行一次//
    //子功能函数 --绘制矩形线框
    function drawLineRect(lb_x, lb_y, rt_x, rt_y, n, rgb) {
        var step = (rt_x - lb_x) / n;
        var pos = [];
        var color = [];
        var normal = [];
        for (var i = 0; i < n + 1; i++) {
            pos.push(lb_x);
            pos.push(lb_y + i * step);
            pos.push(0);
            pos.push(rt_x);
            pos.push(lb_y + i * step);
            pos.push(0);
        }
        for (var i = 0; i < n + 1; i++) {
            pos.push(lb_x + i * step);
            pos.push(lb_y);
            pos.push(0);
            pos.push(lb_x + i * step);
            pos.push(rt_y);
            pos.push(0);
        }
        for (var i = 0; i < 4*n + 4; i++) {
            color.push(rgb[0]);
            color.push(rgb[1]);
            color.push(rgb[2]);
            normal.push(0);
            normal.push(0);
            normal.push(1);
        }
        var vertexBuffer = createVCNBuffer(pos, 3);
        glbuffer.vertexBuffer_bottom = vertexBuffer;
        var colorBuffer = createVCNBuffer(color, 3);
        glbuffer.colorBuffer_bottom = colorBuffer;
        var normalBuffer = createVCNBuffer(normal, 3);
        glbuffer.normalBuffer_bottom = normalBuffer;
    }
    //子功能函数 --数据坐标
    function drawTriangleData(s) {
        var pos = [];
        var mash = [
            0, 0, 0,
            0, 1, 0,
            1, 1, 0,
            1, 0, 0,

            0, 0, 1,
            1, 0, 1,
            1, 1, 1,
            0, 1, 1,

            0, 0, 0,
            1, 0, 0,
            1, 0, 1,
            0, 0, 1,

            1, 0, 0,
            1, 1, 0,
            1, 1, 1,
            1, 0, 1,

            1, 1, 0,
            0, 1, 0,
            0, 1, 1,
            1, 1, 1,

            0, 0, 0,
            0, 0, 1,
            0, 1, 1,
            0, 1, 0
        ];
        $.ajax({
            url: "data.xml",
            dataType: 'xml',
            async: false,
            success: function(xml) {
                $(xml).find('item').each(function(index, ele) {
                    var x = parseFloat($(ele).find('x').text());
                    var y = parseFloat($(ele).find('y').text());
                    var z = parseFloat($(ele).find('z').text());
                    for (var i = 0; i < 24 * 3; i++) {
                        if (i % 3 == 0) {
                            pos.push(x + s * mash[i]);
                        }
                        if (i % 3 == 1) {
                            pos.push(y + s * mash[i]);
                        }
                        if (i % 3 == 2) {
                            pos.push(z * mash[i]);
                        }
                    }
                });
            }
        });
        var vertexBuffer = createVCNBuffer(pos, 3);
        glbuffer.vertexBuffer_data = vertexBuffer;
    }
    //子功能函数 --数据坐标索引
    function drawTriangleDataIndex() {
        var indices = [];
        var n = glbuffer.vertexBuffer_data.numItems / 24;
        for (var i = 0; i < n; i++) {
            var k = i * 24
            indices.push(k);
            indices.push(k + 1);
            indices.push(k + 2);
            indices.push(k + 2);
            indices.push(k + 3);
            indices.push(k);
            indices.push(k + 4);
            indices.push(k + 5);
            indices.push(k + 6);
            indices.push(k + 6);
            indices.push(k + 7);
            indices.push(k + 4);
            indices.push(k + 8);
            indices.push(k + 9);
            indices.push(k + 10);
            indices.push(k + 10);
            indices.push(k + 11);
            indices.push(k + 8);
            indices.push(k + 12);
            indices.push(k + 13);
            indices.push(k + 14);
            indices.push(k + 14);
            indices.push(k + 15);
            indices.push(k + 12);
            indices.push(k + 16);
            indices.push(k + 17);
            indices.push(k + 18);
            indices.push(k + 18);
            indices.push(k + 19);
            indices.push(k + 16);
            indices.push(k + 20);
            indices.push(k + 21);
            indices.push(k + 22);
            indices.push(k + 22);
            indices.push(k + 23);
            indices.push(k + 20);
        }
        var vertexIndexBuffer = createVertexIndexBuffer(indices);
        glbuffer.indexBuffer_data = vertexIndexBuffer;
    }
    //子功能函数 --数据坐标颜色
    function drawTriangleDataColor() {
        var colors = [];
        var line = glbuffer.vertexBuffer_data.numItems;

        for (var i = 0; i < line; i++) {
            colors.push(0.2);
            colors.push(0.3);
            colors.push(0.7);
        }
        var vertexColorBuffer = createVCNBuffer(colors, 3);
        glbuffer.colorBuffer_data = vertexColorBuffer;
    }
    //子功能函数 --数据坐标法向量
    function drawTriangleDataNormal() {
        var n = glbuffer.vertexBuffer_data.numItems / 24;
        var normal = [];
        for (var i = 0; i < n; i++) {
            for (var j = 0; j < 4; j++) { //底
                normal.push(0);
                normal.push(0);
                normal.push(-1);
            }
            for (var j = 0; j < 4; j++) { //顶
                normal.push(0);
                normal.push(0);
                normal.push(1);
            }
            for (var j = 0; j < 4; j++) { //前
                normal.push(0);
                normal.push(-1);
                normal.push(0);
            }
            for (var j = 0; j < 4; j++) { //右
                normal.push(1);
                normal.push(0);
                normal.push(0);
            }
            for (var j = 0; j < 4; j++) { //后
                normal.push(0);
                normal.push(1);
                normal.push(0);
            }
            for (var j = 0; j < 4; j++) { //左
                normal.push(-1);
                normal.push(0);
                normal.push(0);
            }
        }
        var vertexNormal = createVCNBuffer(normal, 3);
        glbuffer.normalBuffer_data = vertexNormal;
    }
    //子功能函数 --x轴
    function drawLineXAxis(rgb) {
        var pos = [-1.5, 0, 0,
            1.5, 0, 0,
            1.5, 0, 0,
            1.2, 0.2, 0,
            1.5, 0, 0,
            1.2, -0.2, 0
        ];
        var color = [];
        var normal = [];
        for (var i = 0; i < pos.length; i++) {
            color.push(rgb[0]);
            color.push(rgb[1]);
            color.push(rgb[2]);
            normal.push(0);
            normal.push(0);
            normal.push(1);
        }
        var vertexBuffer = createVCNBuffer(pos, 3);
        glbuffer.vertexBuffer_axis_x = vertexBuffer;
        var colorBuffer = createVCNBuffer(color, 3);
        glbuffer.colorBuffer_axis_x = colorBuffer;
        var normalBuffer = createVCNBuffer(normal, 3);
        glbuffer.normalBuffer_axis_x = normalBuffer;
    }
    //子功能函数 --y轴
    function drawLineYAxis(rgb) {
        var pos = [0, -1.5, 0,
            0, 1.5, 0,
            0, 1.5, 0,
            0.2, 1.2, 0,
            0, 1.5, 0, -0.2, 1.2, 0
        ];
        var color = [];
        var normal = [];
        for (var i = 0; i < pos.length; i++) {
            color.push(rgb[0]);
            color.push(rgb[1]);
            color.push(rgb[2]);
            normal.push(0);
            normal.push(0);
            normal.push(1);
        }
        var vertexBuffer = createVCNBuffer(pos, 3);
        glbuffer.vertexBuffer_axis_y = vertexBuffer;
        var colorBuffer = createVCNBuffer(color, 3);
        glbuffer.colorBuffer_axis_y = colorBuffer;
        var normalBuffer = createVCNBuffer(normal, 3);
        glbuffer.normalBuffer_axis_y = normalBuffer;
    }
    //子功能函数 --z轴
    function drawLineZAxis(rgb) {
        var pos = [0, 0, -1.5,
            0, 0, 1.5,
            0, 0, 1.5,
            0, 0.2, 1.2,
            0, 0, 1.5,
            0, -0.2, 1.2
        ];
        var color = [];
        var normal = [];
        for (var i = 0; i < pos.length; i++) {
            color.push(rgb[0]);
            color.push(rgb[1]);
            color.push(rgb[2]);
            normal.push(0);
            normal.push(0);
            normal.push(1);
        }
        var vertexBuffer = createVCNBuffer(pos, 3);
        glbuffer.vertexBuffer_axis_z = vertexBuffer;
        var colorBuffer = createVCNBuffer(color, 3);
        glbuffer.colorBuffer_axis_z = colorBuffer;
        var normalBuffer = createVCNBuffer(normal, 3);
        glbuffer.normalBuffer_axis_z = normalBuffer;
    }

    //鼠标方法  
    function handleMouseDown(event) {
        if (event.which == 1) {
            glinfo.m_e_left = true;
        }
        if (event.which == 2) {
            glinfo.m_e_right = true;
        }
    }

    function handleMouseMove(event) {
        current_x = event.clientX;
        current_y = event.clientY;
        if (glinfo.m_e_left) {
            if (glinfo.previous_x == null && glinfo.previous_y == null) {
                glinfo.previous_x = current_x;
                glinfo.previous_y = current_y;
            } else {
                 var motionXY = Math.sqrt(Math.pow(current_x - glinfo.previous_x, 2) + Math.pow(current_y - glinfo.previous_y, 2));
                var cosCamera = sw_config.camera[0] / Math.sqrt(Math.pow(sw_config.camera[0], 2) + Math.pow(sw_config.camera[1], 2) + Math.pow(sw_config.camera[2], 2))
                var sinCamera = sw_config.camera[1] / Math.sqrt(Math.pow(sw_config.camera[0], 2) + Math.pow(sw_config.camera[1], 2) + Math.pow(sw_config.camera[2], 2))


                if (cosCamera >= 0 && sinCamera >= 0) {
                    var deltaX = (current_x - glinfo.previous_x) * (sinCamera) - (current_y - glinfo.previous_y) * (cosCamera);
                    var deltaY = (current_y - glinfo.previous_y) * (sinCamera) + (current_x - glinfo.previous_x) * (cosCamera);
                } else if (cosCamera >= 0 && sinCamera < 0) {

                    var deltaX = (current_x - glinfo.previous_x) * (sinCamera) - (current_y - glinfo.previous_y) * (cosCamera);
                    var deltaY = (current_y - glinfo.previous_y) * (sinCamera) + (current_x - glinfo.previous_x) * (cosCamera);
                    
                } else if (cosCamera < 0 && sinCamera >= 0) {

                    var deltaX = (current_x - glinfo.previous_x) * (sinCamera) - (current_y - glinfo.previous_y) * (cosCamera);
                    var deltaY = (current_y - glinfo.previous_y) * (sinCamera) + (current_x - glinfo.previous_x) * (cosCamera);
                } else {

                    var deltaX = (current_x - glinfo.previous_x) * (sinCamera) - (current_y - glinfo.previous_y) * (cosCamera);
                    var deltaY = (current_y - glinfo.previous_y) * (sinCamera) + (current_x - glinfo.previous_x) * (cosCamera);
                }

                //var deltaX = current_x - glinfo.previous_x;
                var newRotationMatrix = mat4.create();
                mat4.identity(newRotationMatrix);
                mat4.rotate(newRotationMatrix, degToRad(deltaX / 10), [0, -1, 0]);

                //var deltaY = current_y - glinfo.previous_y;
                mat4.rotate(newRotationMatrix, degToRad(deltaY / 10), [-1, 0, 0]);
                mat4.multiply(newRotationMatrix, gl_uMatrix.rotationMatrix, gl_uMatrix.rotationMatrix);

                glinfo.previous_x = current_x;
                glinfo.previous_y = current_y;

            }
        }
        if (glinfo.m_e_right) {
            if (glinfo.previous_x == null && glinfo.previous_y == null) {
                glinfo.previous_x = current_x;
                glinfo.previous_y = current_y;
            } else {
                var motionXY = Math.sqrt(Math.pow(current_x - glinfo.previous_x, 2) + Math.pow(current_y - glinfo.previous_y, 2));
                var cosCamera = sw_config.camera[0] / Math.sqrt(Math.pow(sw_config.camera[0], 2) + Math.pow(sw_config.camera[1], 2) + Math.pow(sw_config.camera[2], 2))
                var sinCamera = sw_config.camera[1] / Math.sqrt(Math.pow(sw_config.camera[0], 2) + Math.pow(sw_config.camera[1], 2) + Math.pow(sw_config.camera[2], 2))

                if (cosCamera >= 0 && sinCamera >= 0) {
                    var deltaX = (current_x - glinfo.previous_x) * (sinCamera) - (current_y - glinfo.previous_y) * (cosCamera);
                    var deltaY = (current_y - glinfo.previous_y) * (sinCamera) + (current_x - glinfo.previous_x) * (cosCamera);
                } else if (cosCamera >= 0 && sinCamera < 0) {

                    var deltaX = (current_x - glinfo.previous_x) * (sinCamera) - (current_y - glinfo.previous_y) * (cosCamera);
                    var deltaY = (current_y - glinfo.previous_y) * (sinCamera) + (current_x - glinfo.previous_x) * (cosCamera);
                    
                } else if (cosCamera < 0 && sinCamera >= 0) {

                    var deltaX = (current_x - glinfo.previous_x) * (sinCamera) - (current_y - glinfo.previous_y) * (cosCamera);
                    var deltaY = (current_y - glinfo.previous_y) * (sinCamera) + (current_x - glinfo.previous_x) * (cosCamera);
                } else {

                    var deltaX = (current_x - glinfo.previous_x) * (sinCamera) - (current_y - glinfo.previous_y) * (cosCamera);
                    var deltaY = (current_y - glinfo.previous_y) * (sinCamera) + (current_x - glinfo.previous_x) * (cosCamera);
                }


                var newMatrix = mat4.create();
                mat4.identity(newMatrix);
                mat4.translate(newMatrix, [-deltaX * 0.01, deltaY * 0.01, 0], newMatrix);
                mat4.multiply(newMatrix, gl_uMatrix.moveMatrix, gl_uMatrix.moveMatrix);

                console.log(newMatrix);
                glinfo.previous_x = current_x;
                glinfo.previous_y = current_y;

            }
        }
    }

    function handleMouseUp(event) {
        glinfo.m_e_left = false;
        glinfo.m_e_right = false;
        glinfo.previous_x = null;
        glinfo.previous_y = null;
    }

    function degToRad(degrees) {
        return degrees * Math.PI / 180;
    }

    //注册事件
    function init_Config() {
        //注册btn按钮开始事件
        $("label.btn").click(function() {
            var t = $(this).children().val();
            if (sw_config[t] == 1) {
                sw_config[t] = 0;
            } else {
                sw_config[t] = 1;
            }
        });
        $("#color-picker").change(function() {
            var t0 = parseInt($(this).val()[0]) / 10;
            var t1 = parseInt($(this).val()[1]) / 10
            var t2 = parseInt($(this).val()[2]) / 10
            if (t0 < 0 || t1 < 0 || t2 < 0 || t0 > 10 || t1 > 10 || t2 > 10) {
                sw_config["bg_color"][0] = 0;
                sw_config["bg_color"][1] = 0;
                sw_config["bg_color"][2] = 0;
            } else {
                sw_config["bg_color"][0] = t0;
                sw_config["bg_color"][1] = t1;
                sw_config["bg_color"][2] = t2;
            }
        });
        $("#color-picker_a").change(function() {
            var t_num = parseFloat($(this).val()) / 10
            if (t_num > 10 || t_num < 0) {
                sw_config["bg_color_a"] = 10;
            } else {
                sw_config["bg_color_a"] = t_num;
            }
        });
        $("#camera").change(function() {
            var c = $(this).val();
            var c1 = parseFloat(c.split(',')[0]);
            var c2 = parseFloat(c.split(',')[1]);
            var c3 = parseFloat(c.split(',')[2]);
            if (c1 && c2 && c3) {
                sw_config['camera'][0] = c1
                sw_config['camera'][1] = c2
                sw_config['camera'][2] = c3
            } else {
                sw_config['camera'][0] = 5
                sw_config['camera'][1] = 5
                sw_config['camera'][2] = 5
            }
            $("#camera").val(Math.floor(sw_config.camera[0]) + "," +
                Math.floor(sw_config.camera[1]) + "," +
                Math.floor(sw_config.camera[2]));
        });
        //鼠标滚轮操作
        if (document.addEventListener) {
            document.addEventListener('DOMMouseScroll', scrollFunc, false);
        }
        window.onmousewheel = document.onmousewheel = scrollFunc;

        function scrollFunc(event) {
            var e = event || window.event;
            var delta = undefined;
            if (e.wheelDelta) {
                delta = e.wheelDelta / 120;
            } else {
                delta = e.detail / 3;
            }
            delta = delta * 0.1;
            var k = Math.pow(sw_config.camera[0], 2) + Math.pow(sw_config.camera[1], 2) + Math.pow(sw_config.camera[2], 2);
            var k_2 = Math.sqrt(k);
            var i = [];
            i[0] = sw_config.camera[0] / k_2;
            i[1] = sw_config.camera[1] / k_2;
            i[2] = sw_config.camera[2] / k_2;

            sw_config.camera[0] = i[0] * k_2 * (1 - delta);
            sw_config.camera[1] = i[1] * k_2 * (1 - delta);
            sw_config.camera[2] = i[2] * k_2 * (1 - delta);

            $("#camera").val(Math.round(sw_config.camera[0] * 100) / 100 + "," +
                Math.round(sw_config.camera[1] * 100) / 100 + "," +
                Math.round(sw_config.camera[2] * 100) / 100);
        }
        //摄像镜头旋转 --按钮实现
        $("#camera_left").click(function() {
            var k_x_y = Math.pow(sw_config.camera[0], 2) + Math.pow(sw_config.camera[1], 2);
            var k_x_y_2 = Math.sqrt(k_x_y);

            sw_config.camera[0] = (Math.sqrt(3) / 2) * (sw_config.camera[0] / k_x_y_2) + 0.5 * sw_config.camera[1] / k_x_y_2;
            sw_config.camera[1] = (Math.sqrt(3) / 2) * (sw_config.camera[1] / k_x_y_2) - 0.5 * sw_config.camera[0] / k_x_y_2;
            $("#camera").val(Math.round(sw_config.camera[0] * 100) / 100 + "," +
                Math.round(sw_config.camera[1] * 100) / 100 + "," +
                Math.round(sw_config.camera[2] * 100) / 100);
        });
        $("#camera_right").click(function() {
            var k_x_y = Math.pow(sw_config.camera[0], 2) + Math.pow(sw_config.camera[1], 2);
            var k_x_y_2 = Math.sqrt(k_x_y);

            sw_config.camera[0] = (Math.sqrt(3) / 2) * (sw_config.camera[0] / k_x_y_2) - 0.5 * sw_config.camera[1] / k_x_y_2;
            sw_config.camera[1] = (Math.sqrt(3) / 2) * (sw_config.camera[1] / k_x_y_2) + 0.5 * sw_config.camera[0] / k_x_y_2;
            $("#camera").val(Math.round(sw_config.camera[0] * 100) / 100 + "," +
                Math.round(sw_config.camera[1] * 100) / 100 + "," +
                Math.round(sw_config.camera[2] * 100) / 100);
        });

    }

    //启动webgl
$(function() {
    init_Config(); //用于挂载各种事件
    startup(); //启动图形渲染
});