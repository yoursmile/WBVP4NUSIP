
var gl;
var sw_config = {
    texture:0,
    light:0,
    reset_pos:0,
    bg_color:[0,0,0],
    bg_color_a:1,
    change:false,
    camera:[2,2,2]
};
var glinfo = {
    m_e_left:undefined,
    m_e_right:undefined,
    m_e_roll:undefined,
    previous_x:null,
    previous_y:null,
    shaderProgram:undefined,
    stackModelViewMatrix:[],
    stackProjectionMatrix:[],
};
var gl_uMatrix = {
    modelViewMatrix:undefined,
    projectionMatrix:undefined,
    rotationMatrix:undefined,
    moveMatrix:undefined
}
var glbuffer = {
    vertexBuffer_bottom:undefined,
    vertexBuffer_axis_x:undefined,
    vertexBuffer_axis_y:undefined,
    vertexBuffer_axis_z:undefined,
    vertexBuffer_data:undefined,
    vertexBuffer_dataIndex:undefined,
}
//固定格式
function initWebGLContext(canvas){
    var names = ["webgl","experimental-webgl"];
    for(var i=0;i<names.length;i++){
        try{
            gl = canvas.getContext(names[i]);
        } catch(e){}
        if (gl) {
            break;
        }
    }
    if(gl){
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    }else{
        alert("Failed to create WebGL context!");
    }
    return gl;
}

//工具函数
function Utilities_Shader_CompileShader(gl,id){
    var shaderScript = document.getElementById(id);
    if(!shaderScript){
        return null;
    }

    var str="";
    var k = shaderScript.firstChild;
    while(k){
        if(k.nodeType == 3){
            str += k.textContent;
            //console.log(k.textContent + "\n");
        }
        k = k.nextSibling;
    }

    var shader;
    if(shaderScript.type == "x-shader/x-fragment"){
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    }else if(shaderScript.type == "x-shader/x-vertex"){
        shader = gl.createShader(gl.VERTEX_SHADER);
    }else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
        alert(gl.getShaderInfoLog(shader));
        return null;
    }
    return shader
}

function initShader(){
    var vertexShader = Utilities_Shader_CompileShader(gl,"vs");
    var fragmentShader = Utilities_Shader_CompileShader(gl,"fs");

    var shaderProgram = gl.createProgram();
    //固定格式
    gl.attachShader(shaderProgram,vertexShader);
    gl.attachShader(shaderProgram,fragmentShader); 
    gl.linkProgram(shaderProgram);
    if(!gl.getProgramParameter(shaderProgram,gl.LINK_STATUS)){
        alert("Failed to setup shaders");
    }
    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram,"aPos_bottom");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
    
    shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram,"aColor_bottom");
    
    shaderProgram.vertexUniformMVMatrix = gl.getUniformLocation(shaderProgram,"uMVMatrix");
    shaderProgram.vertexUniformPMatrix = gl.getUniformLocation(shaderProgram,"uPMatrix");
    shaderProgram.vertexUniformRMatrix = gl.getUniformLocation(shaderProgram,"uRMatrix");
    shaderProgram.vertexUniformMoveMatrix = gl.getUniformLocation(shaderProgram,"uMoveMatrix");
    
    return shaderProgram;
}

function draw(){
    gl.viewport(0,0,gl.viewportWidth,gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT);

    uploadUniformMatrix();
    drawLineArrays(glbuffer.vertexBuffer_bottom,gl.LINES,[0,0.4,0,1]);
    
    drawTriangleArrays(glbuffer.vertexBuffer_data,glbuffer.vertexBuffer_dataIndex,glbuffer.vertexBuffer_dataColor,gl.TRIANGLES);
    
    var IMatrix = mat4.identity(mat4.create());
    gl.uniformMatrix4fv(glinfo.shaderProgram.vertexUniformMoveMatrix,false,IMatrix);
    gl.uniformMatrix4fv(glinfo.shaderProgram.vertexUniformRMatrix,false,IMatrix);
    drawLineArrays(glbuffer.vertexBuffer_axis_x,gl.LINES,[1,0.4,0.5,1]);
    drawLineArrays(glbuffer.vertexBuffer_axis_y,gl.LINES,[0.1,0.4,0.7,1]);
    drawLineArrays(glbuffer.vertexBuffer_axis_z,gl.LINES,[0.6,0.3,0.5,1]);
}

function startup(){
    var canvas = $("#canvas").get(0);
    gl = initWebGLContext(canvas);
    initBuffer();
    glinfo.shaderProgram = initShader();
    
    gl.clearColor(sw_config.bg_color[0],sw_config.bg_color[1],sw_config.bg_color[2],sw_config.bg_color_a);
    gl.enable(gl.DEPTH_TEST); 
    
    tick();
    canvas.onmousedown = handleMouseDown;
    document.onmousemove = handleMouseMove;
    document.onmouseup = handleMouseUp;
}

function initBuffer(){
    glbuffer.vertexBuffer_bottom = drawLineRect(-1.0,-1.0,1.0,1.0,100);
    glbuffer.vertexBuffer_axis_x = drawLineXAxis();
    glbuffer.vertexBuffer_axis_y = drawLineYAxis();
    glbuffer.vertexBuffer_axis_z = drawLineZAxis();
    glbuffer.vertexBuffer_data = drawTriangleData(2/100);
    glbuffer.vertexBuffer_dataIndex = drawTriangleDataIndex();
    glbuffer.vertexBuffer_dataColor = drawTriangleDataColor();
    
}
function tick() {
    requestAnimFrame(tick);
    if(sw_config.reset_pos){
        mat4.identity(gl_uMatrix.moveMatrix);
        mat4.identity(gl_uMatrix.rotationMatrix);
    }
    draw();
}

//子函数 --创建顶点缓冲区
function createVertexBuffer(Verteices,itemSize){
    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(Verteices), gl.STATIC_DRAW);
    vertexBuffer.itemSize = itemSize;
    vertexBuffer.numItems = Verteices.length/itemSize;
    return vertexBuffer;
}
//子函数 --创建顶点索引缓冲区
function createVertexIndexBuffer(Indices){
    var vertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(Indices),  gl.STATIC_DRAW);
    vertexIndexBuffer.itemSize = 1;
    vertexIndexBuffer.numItems = Indices.length;
    return vertexIndexBuffer;
}
//子函数 --创建颜色缓冲区
function createColorBuffer(Colors,itemSize){
    var colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(Colors), gl.STATIC_DRAW);
    colorBuffer.itemSize = itemSize;
    colorBuffer.numItems = Colors/itemSize;
    return colorBuffer;
    
}
//子函数 --上传矩阵信息
function uploadUniformMatrix(){
    if(!gl_uMatrix.modelViewMatrix){
        gl_uMatrix.modelViewMatrix = mat4.create();
        mat4.identity(gl_uMatrix.modelViewMatrix);
    }
    mat4.lookAt([sw_config.camera[0],sw_config.camera[1],sw_config.camera[2]],[0,0,0],[0,0,1],gl_uMatrix.modelViewMatrix);
    gl.uniformMatrix4fv(glinfo.shaderProgram.vertexUniformMVMatrix,false,gl_uMatrix.modelViewMatrix);
    
    
    if(!gl_uMatrix.projectionMatrix){
        gl_uMatrix.projectionMatrix = mat4.create();
        mat4.identity(gl_uMatrix.projectionMatrix);
        mat4.perspective(60,gl.viewportWidth/gl.viewportHeight,0.1,100.0,gl_uMatrix.projectionMatrix);
    }
    gl.uniformMatrix4fv(glinfo.shaderProgram.vertexUniformPMatrix,false,gl_uMatrix.projectionMatrix);
    
    if(!gl_uMatrix.rotationMatrix){
        gl_uMatrix.rotationMatrix = mat4.create();
        mat4.identity(gl_uMatrix.rotationMatrix);
    }
    gl.uniformMatrix4fv(glinfo.shaderProgram.vertexUniformRMatrix,false,gl_uMatrix.rotationMatrix);
    
    if(!gl_uMatrix.moveMatrix){
        gl_uMatrix.moveMatrix = mat4.create();
        mat4.identity(gl_uMatrix.moveMatrix);
    }
    gl.uniformMatrix4fv(glinfo.shaderProgram.vertexUniformMoveMatrix,false,gl_uMatrix.moveMatrix);
}

//子函数 --对ModelView矩阵压栈
function pushModelViewMatrix(){
    var copyToPush = mat4.create(gl_uMatrix.modelViewMatrix);
    glinfo.stackModelViewMatrix.push(copyToPush);
}
//子函数 --对ModelView矩阵弹栈
function popModelViewMatrix(){
    gl_uMatrix.modelViewMatrix = glinfo.stackModelViewMatrix.pop();
}
//子函数 --对Projection矩阵压栈
function pushProjectionMatrix(){
    var copyToPush = mat4.create(gl_uMatrix.projectionMatrix);
    glinfo.stackProjectionMatrix.push(copyToPush);
}
//子函数 --对Projection矩阵弹栈
function popProjectionMatrix(){
    gl_uMatrix.projectionMatrix = glinfo.stackProjectionMatrix.pop();
}

function drawLineArrays(vertexBuffer,drawMethod,rgba){
    gl.disableVertexAttribArray(glinfo.shaderProgram.vertexColorAttribute); //不使用颜色缓冲区 
    gl.vertexAttrib4f(glinfo.shaderProgram.vertexColorAttribute, rgba[0], rgba[1], rgba[2], rgba[3]); 
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);
    gl.vertexAttribPointer(glinfo.shaderProgram.vertexPositionAttribute,vertexBuffer.itemSize,gl.FLOAT,false,0,0);
    gl.drawArrays(drawMethod,0,vertexBuffer.numItems);
}

function drawTriangleArrays(vertexBuffer,vertexIndex,vertexColor,drawMethod){
    gl.enableVertexAttribArray(glinfo.shaderProgram.vertexColorAttribute);
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexColor);
    gl.vertexAttribPointer(glinfo.shaderProgram.vertexColorAttribute,vertexColor.itemSize,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);
    gl.vertexAttribPointer(glinfo.shaderProgram.vertexPositionAttribute,vertexBuffer.itemSize,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,vertexIndex);
    gl.drawElements(drawMethod,vertexIndex.numItems, gl.UNSIGNED_SHORT, 0);
}
//子功能函数 --绘制矩形线框
function drawLineRect(lb_x,lb_y,rt_x,rt_y,n){
    var step = (rt_x - lb_x) / n;
    var pos =[];
    
    for(var i=0; i<n+1;i++){
        pos.push(lb_x);
        pos.push(lb_y+i*step);
        pos.push(0);
        pos.push(rt_x);
        pos.push(lb_y+i*step);
        pos.push(0);
    }
    for(var i=0; i<n+1;i++){
        pos.push(lb_x+i*step);
        pos.push(lb_y);
        pos.push(0);
        pos.push(lb_x+i*step);
        pos.push(rt_y);
        pos.push(0)
    }
    var vertexBuffer = createVertexBuffer(pos,3);
    return vertexBuffer;
}

function drawTriangleData(s){
    var pos = [];
    var mash = [0,0,0,
                0,1,0,
                1,1,0,
                1,0,0,
                
                0,0,1,
                1,0,1,
                1,1,1,
                0,1,1,
                
                0,0,0,
                1,0,0,
                1,0,1,
                0,0,1,
                
                1,0,0,
                1,1,0,
                1,1,1,
                1,0,1,
                
                1,1,0,
                0,1,0,
                0,1,1,
                1,1,1,
                
                0,0,0,
                0,0,1,
                0,1,1,
                0,2,0
               ];                  
    $.ajax({
        url:"data.xml",
        dataType:'xml',
        async:false,
        success:function(xml){
            $(xml).find('item').each(function(index,ele){
                var x = parseFloat($(ele).find('x').text());
                var y = parseFloat($(ele).find('y').text());
                var z = parseFloat($(ele).find('z').text());
                if(x && y && z){
                    for(var i=0;i<24*3;i++){
                        if(i%3 == 0){
                            pos.push(x+s*mash[i]);
                        }
                        if(i%3 == 1){
                            pos.push(y+s*mash[i]);
                        }
                        if(i%3 == 2){
                            pos.push(z*mash[i]);
                        }   
                    }
                }
            });
        }
    });
    var vertexBuffer = createVertexBuffer(pos,3);
    return vertexBuffer;
}

function drawTriangleDataIndex(){
    var indices = [];
    var n = glbuffer.vertexBuffer_data.numItems/24;
    for(var i=0;i<n;i++){
        var k = i*24
        indices.push(k);
        indices.push(k+1);
        indices.push(k+2);
        indices.push(k+2);
        indices.push(k+3);
        indices.push(k);
        indices.push(k+4);
        indices.push(k+5);
        indices.push(k+6);
        indices.push(k+6);
        indices.push(k+7);
        indices.push(k+4);
        indices.push(k+8);
        indices.push(k+9);
        indices.push(k+10);
        indices.push(k+10);
        indices.push(k+11);
        indices.push(k+8);
        indices.push(k+12);
        indices.push(k+13);
        indices.push(k+14);
        indices.push(k+14);
        indices.push(k+15);
        indices.push(k+12);
        indices.push(k+16);
        indices.push(k+17);
        indices.push(k+18);
        indices.push(k+18);
        indices.push(k+19);
        indices.push(k+16);
        indices.push(k+20);
        indices.push(k+21);
        indices.push(k+22);
        indices.push(k+22);
        indices.push(k+23);
        indices.push(k+20);
    }
    var vertexIndexBuffer = createVertexIndexBuffer(indices);
    return vertexIndexBuffer;
}

function drawTriangleDataColor(){
    var colors = [];
    var line = glbuffer.vertexBuffer_data.numItems;
    
    for(var i=0;i<line;i++){
        colors.push(0.2);
        colors.push(0.3);
        colors.push(0.7);
        colors.push(1);
    }
    var vertexColorBuffer = createColorBuffer(colors,4);
    return vertexColorBuffer;
}
function drawLineXAxis(){
    var pos = [-1.5,0,0,
               1.5,0,0,
               1.5,0,0,
               1.2,0.2,0,
               1.5,0,0,
               1.2,-0.2,0
              ];
    var vertexBuffer = createVertexBuffer(pos,3);
    return vertexBuffer;
}
function drawLineYAxis(){
    var pos = [0,-1.5,0,
               0,1.5,0,
               0,1.5,0,
               0.2,1.2,0,
               0,1.5,0,
               -0.2,1.2,0
              ];
    var vertexBuffer = createVertexBuffer(pos,3);
    return vertexBuffer;
}
function drawLineZAxis(){
    var pos = [0,0,-1.5,
               0,0,1.5,
               0,0,1.5,
               0,0.2,1.2,
               0,0,1.5,
               0,-0.2,1.2
              ];
    var vertexBuffer = createVertexBuffer(pos,3);
    return vertexBuffer;
}
function handleMouseDown(event){
    if(event.which == 1){
        glinfo.m_e_left = true;
    }
    if(event.which == 3){
        glinfo.m_e_right = true;
    }
}
function handleMouseMove(event){
        current_x = event.clientX;
        current_y = event.clientY;
    if(glinfo.m_e_left){
        if(glinfo.previous_x == null && glinfo.previous_y == null){
            glinfo.previous_x = current_x;
            glinfo.previous_y = current_y;
        }else{
            var deltaX = current_x - glinfo.previous_x;
            var newRotationMatrix = mat4.create();
            mat4.identity(newRotationMatrix);
            mat4.rotate(newRotationMatrix,degToRad(deltaX / 10),[0,-1,0]);

            var deltaY = current_y - glinfo.previous_y;
            mat4.rotate(newRotationMatrix,degToRad(deltaY / 10),[-1,0,0]);
            mat4.multiply(newRotationMatrix,gl_uMatrix.rotationMatrix,gl_uMatrix.rotationMatrix);

            glinfo.previous_x = current_x;
            glinfo.previous_y = current_y;
        
        }
    }
    if(glinfo.m_e_right){
        if(glinfo.previous_x == null && glinfo.previous_y == null){
            glinfo.previous_x = current_x;
            glinfo.previous_y = current_y;
        }else{
            var deltaX = current_x - glinfo.previous_x;
            var deltaY = current_y - glinfo.previous_y;
            var newMatrix = mat4.create();
            mat4.identity(newMatrix);
            mat4.translate(newMatrix,[-deltaX*0.01,deltaY*0.01,0],newMatrix);
            mat4.multiply(newMatrix,gl_uMatrix.moveMatrix,gl_uMatrix.moveMatrix);
            
            console.log(newMatrix);
            glinfo.previous_x = current_x;
            glinfo.previous_y = current_y;
        
        }
    }
}
function handleMouseUp(event){
    glinfo.m_e_left = false;
    glinfo.m_e_right = false;
    glinfo.previous_x = null;
    glinfo.previous_y = null;
}
function degToRad(degrees){
    return degrees * Math.PI / 180;
}
//注册事件
function init_Config(){
    
    //注册btn按钮开始事件
        
    $("label.btn").click(function(){
        var t = $(this).children().val();
        if(sw_config[t] == 1){
            sw_config[t] = 0;
        }else{
            sw_config[t] = 1;
        }
    });
    $("#color-picker").change(function(){
        var t0 = parseInt($(this).val()[0])/10;
        var t1 = parseInt($(this).val()[1])/10
        var t2 = parseInt($(this).val()[2])/10
        if(t0<0||t1<0||t2<0||t0>10||t1>10||t2>10){
            sw_config["bg_color"][0] = 0;
            sw_config["bg_color"][1] = 0;
            sw_config["bg_color"][2] = 0;
        }else{
            sw_config["bg_color"][0] = t0;
            sw_config["bg_color"][1] = t1;
            sw_config["bg_color"][2] = t2;
        }
    });
    $("#color-picker_a").change(function(){
        var t_num = parseFloat($(this).val())/10
        if(t_num > 10 || t_num < 0 ){
            sw_config["bg_color_a"] = 10;
        }else{
            sw_config["bg_color_a"] = t_num;
        }
    }); 
    $("#camera").change(function(){
        var c = $(this).val();
        var c1 = parseFloat(c.split(',')[0]);
        var c2 = parseFloat(c.split(',')[1]);
        var c3 = parseFloat(c.split(',')[2]);
        if(c1 && c2 && c3){
            sw_config['camera'][0] = c1
            sw_config['camera'][1] = c2
            sw_config['camera'][2] = c3
        }else{
            sw_config['camera'][0] = 5
            sw_config['camera'][1] = 5
            sw_config['camera'][2] = 5
        }
        $("#camera").val(   Math.floor(sw_config.camera[0]) + "," +
                            Math.floor(sw_config.camera[1]) + "," +
                            Math.floor(sw_config.camera[2]));
    });
    //鼠标滚轮操作
    if(document.addEventListener){
        document.addEventListener('DOMMouseScroll',scrollFunc,false);
    }
    window.onmousewheel = document.onmousewheel = scrollFunc;
    
    function scrollFunc(event){
        var e = event || window.event;
        var delta = undefined;
        if(e.wheelDelta){
            delta = e.wheelDelta/120;
        }else{
            delta = e.detail/3;
        }
        delta = delta * 0.1;
        var k = Math.pow(sw_config.camera[0],2) + Math.pow(sw_config.camera[1],2) + Math.pow(sw_config.camera[2],2);
        var k_2 = Math.sqrt(k);
        var i = [];
        i[0] = sw_config.camera[0] / k_2;
        i[1] = sw_config.camera[1] / k_2;
        i[2] = sw_config.camera[2] / k_2;
        
        sw_config.camera[0] = i[0] * k_2 * (1-delta);
        sw_config.camera[1] = i[1] * k_2 * (1-delta);
        sw_config.camera[2] = i[2] * k_2 * (1-delta);
        
        $("#camera").val(   Math.round(sw_config.camera[0]*100)/100 + "," +
                            Math.round(sw_config.camera[1]*100)/100 + "," +
                            Math.round(sw_config.camera[2]*100)/100);
    }
    $("#camera_left").click(function(){
        var k_x_y = Math.pow(sw_config.camera[0],2) + Math.pow(sw_config.camera[1],2);
        var k_x_y_2 = Math.sqrt(k_x_y);
        
        sw_config.camera[0] = (Math.sqrt(3)/2)*(sw_config.camera[0]/k_x_y_2) + 0.5*sw_config.camera[1]/k_x_y_2;
        sw_config.camera[1] = (Math.sqrt(3)/2)*(sw_config.camera[1]/k_x_y_2) - 0.5*sw_config.camera[0]/k_x_y_2;
        $("#camera").val(   Math.round(sw_config.camera[0]*100)/100 + "," +
                            Math.round(sw_config.camera[1]*100)/100 + "," +
                            Math.round(sw_config.camera[2]*100)/100);
    });
    $("#camera_right").click(function(){
        var k_x_y = Math.pow(sw_config.camera[0],2) + Math.pow(sw_config.camera[1],2);
        var k_x_y_2 = Math.sqrt(k_x_y);
        
        sw_config.camera[0] = (Math.sqrt(3)/2)*(sw_config.camera[0]/k_x_y_2) - 0.5*sw_config.camera[1]/k_x_y_2;
        sw_config.camera[1] = (Math.sqrt(3)/2)*(sw_config.camera[1]/k_x_y_2) + 0.5*sw_config.camera[0]/k_x_y_2;
        $("#camera").val(   Math.round(sw_config.camera[0]*100)/100 + "," +
                            Math.round(sw_config.camera[1]*100)/100 + "," +
                            Math.round(sw_config.camera[2]*100)/100);
    });
    
}

//启动webgl
$(function(){
    init_Config(); //用于挂载各种事件
    startup(); //启动图形渲染
});
